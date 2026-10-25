/*

Copyright 2026 Setka Matrix



SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import { ClientEvent, MatrixError, type MatrixClient, SyncState, type SyncStateData } from "matrix-js-sdk/src/matrix";

import { logger } from "matrix-js-sdk/src/logger";



import PlatformPeg from "../PlatformPeg";
import { DeviceListener } from "../device-listener";
import { privateShouldBeEncrypted } from "../utils/rooms";
import { fetchAndApplySetkaRecoveryKey } from "./setkaLoginRecovery";

import { isSetkaHomeserver } from "./SetkaConfig";



const RELOAD_GUARD_KEY = "setka_client_reload_guard";

const RELOAD_COOLDOWN_MS = 60_000;

const MEDIA_404_THRESHOLD = 3;
const SOFT_RECOVERY_COOLDOWN_MS = 120_000;

let lastSoftRecoveryAt = 0;
let softRecoveryInFlight: Promise<boolean> | null = null;

function isCryptoSensitive404Path(path: string): boolean {
    if (!path.includes("/media/")) {
        return path.includes("/keys/") || path.includes("/room_keys/");
    }
    // Thumbnail/decrypt 404s are common and must not trigger S/Key recovery loops.
    if (path.includes("/thumbnail/")) return false;
    if (path.includes("width=") && path.includes("height=")) return false;
    return path.includes("/download/") || path.includes("/media/v3/");
}



function wasHardReload(): boolean {

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    return nav?.type === "reload";

}



function tryClientReload(reason: string): void {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const last = raw ? Number(raw) : 0;
    if (last && Date.now() - last < RELOAD_COOLDOWN_MS) {
        logger.warn(`Setka session guard: skip reload (${reason}), cooldown active`);
        return;
    }

    logger.warn(`Setka session guard: reloading client (${reason})`);
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    PlatformPeg.get()?.reload();
}

async function trySoftClientRecovery(client: MatrixClient, reason: string): Promise<boolean> {
    const now = Date.now();
    if (now - lastSoftRecoveryAt < SOFT_RECOVERY_COOLDOWN_MS) {
        return false;
    }
    if (softRecoveryInFlight) {
        return softRecoveryInFlight;
    }

    logger.warn(`Setka session guard: attempting soft recovery (${reason})`);
    softRecoveryInFlight = (async () => {
        try {
            const crypto = client.getCrypto();
            if (crypto) {
                await crypto.checkKeyBackupAndEnable().catch(() => undefined);
            }
            const applied = await fetchAndApplySetkaRecoveryKey(client).catch(() => false);
            if (applied) {
                lastSoftRecoveryAt = Date.now();
                DeviceListener.sharedInstance().recheck();
                return true;
            }
            return false;
        } catch (error) {
            logger.warn("Setka session guard: soft recovery failed", error);
            return false;
        } finally {
            softRecoveryInFlight = null;
        }
    })();

    return softRecoveryInFlight;
}



async function verifyCryptoAfterReload(client: MatrixClient): Promise<void> {

    if (!privateShouldBeEncrypted(client)) return;



    const crypto = client.getCrypto();

    if (!crypto) {
        void trySoftClientRecovery(client, "crypto_not_initialized").then((recovered) => {
            if (!recovered) tryClientReload("crypto_not_initialized");
        });
        return;
    }



    try {

        const status = await crypto.getCrossSigningStatus();

        const keysMissing = !status.publicKeysOnDevice && Boolean(status.privateKeysInSecretStorage);

        if (keysMissing) {
            const recovered = await trySoftClientRecovery(client, "cross_signing_not_restored");
            if (!recovered) tryClientReload("cross_signing_not_restored");
            return;
        }



        const userId = client.getUserId();

        if (userId) {

            const deviceMap = await crypto.getUserDeviceInfo([userId], false);

            const ownDevices = deviceMap.get(userId);

            if (!ownDevices || ownDevices.size === 0) {
                const recovered = await trySoftClientRecovery(client, "own_devices_missing");
                if (!recovered) tryClientReload("own_devices_missing");
            }

        }

    } catch (e) {

        logger.warn("Setka session guard: crypto check failed", e);
        const recovered = await trySoftClientRecovery(client, "crypto_check_failed");
        if (!recovered) tryClientReload("crypto_check_failed");

    }

}



function installHttp404Guard(client: MatrixClient): () => void {
    if (!wasHardReload()) {
        return () => undefined;
    }

    let media404Count = 0;
    const http = client.http as typeof client.http & {
        authedRequest: typeof client.http.authedRequest;
    };
    const originalAuthedRequest = http.authedRequest.bind(http);

    http.authedRequest = async (...args: Parameters<typeof client.http.authedRequest>) => {
        try {
            return await originalAuthedRequest(...args);
        } catch (error) {
            if (error instanceof MatrixError && error.httpStatus === 404) {
                const path = String(args[1] ?? "");
                if (isCryptoSensitive404Path(path)) {
                    media404Count += 1;
                    if (media404Count >= MEDIA_404_THRESHOLD) {
                        media404Count = 0;
                        void trySoftClientRecovery(client, "media_crypto_404_burst");
                    }
                }
            }
            throw error;
        }
    };

    return () => {
        http.authedRequest = originalAuthedRequest;
    };
}



/**

 * After Ctrl+F5 crypto and media can desync — detect and reload the client once.

 */

export function initSetkaSessionGuard(client: MatrixClient): () => void {

    if (!isSetkaHomeserver(client)) {

        return () => undefined;

    }



    let prepared = false;

    const isReload = wasHardReload();

    const cleanupHttpGuard = installHttp404Guard(client);



    const onSync = (state: SyncState, _prev?: SyncState | null, data?: SyncStateData): void => {
        if (state === SyncState.Error) {
            // Do not reload on auth/CORS/network sync failures — that causes reload loops
            // (e.g. web-beta → matrix.setka-matrix.ru cross-origin without CORS headers).
            const err = data?.error;
            const httpStatus = err instanceof MatrixError ? err.httpStatus : undefined;
            const errcode = err instanceof MatrixError ? err.errcode : undefined;
            const message = String(err?.message ?? err ?? "").toLowerCase();
            const isAuthOrCors =
                httpStatus === 401 ||
                httpStatus === 403 ||
                errcode === "M_MISSING_TOKEN" ||
                errcode === "M_UNKNOWN_TOKEN" ||
                message.includes("cors") ||
                message.includes("unauthorized") ||
                message.includes("network");
            if (isAuthOrCors || !isReload) {
                logger.warn("Setka session guard: sync error, skip reload", err);
                return;
            }
            tryClientReload("sync_error");
            return;
        }

        if (state === SyncState.Prepared && !prepared) {

            prepared = true;

            if (isReload) {

                window.setTimeout(() => {

                    void verifyCryptoAfterReload(client);

                }, 2500);

            }

        }

    };



    client.on(ClientEvent.Sync, onSync);



    return () => {

        client.removeListener(ClientEvent.Sync, onSync);

        cleanupHttpGuard();

    };

}

