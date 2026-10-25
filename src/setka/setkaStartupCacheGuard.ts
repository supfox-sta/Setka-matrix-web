/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { MatrixError, type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import PlatformPeg from "../PlatformPeg";
import { clearStorage } from "../Lifecycle";
import { isSetkaHomeserver } from "./SetkaConfig";
import { invalidateSetkaEmojiPacksCache } from "./setkaEmojiPacksCache";
import { invalidateSetkaProfileCache } from "./SetkaProfileApi";

const VERSION_KEY = "setka.client.version.v1";
const STALE_SESSION_FLAG = "setka.stale_session_cleared";
const CACHE_CLEAR_RELOAD_KEY = "setka.cache_clear_reload_guard";

function getBuildVersion(): string {
    return (process.env.VERSION ?? "0.0.0").replace(/^v/, "");
}

async function clearBrowserCaches(): Promise<void> {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
}

function invalidateSetkaMemoryCaches(): void {
    invalidateSetkaEmojiPacksCache();
    invalidateSetkaProfileCache();
    localStorage.removeItem("setka.startup.avatar.v1");
}

/**
 * After deploy, drop HTTP caches once so stale SW/assets do not serve broken media URLs.
 */
export async function runSetkaStartupCacheCheck(): Promise<void> {
    const currentVersion = getBuildVersion();
    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (storedVersion && storedVersion !== currentVersion) {
        const reloadGuard = sessionStorage.getItem(CACHE_CLEAR_RELOAD_KEY);
        if (!reloadGuard) {
            logger.warn(`Setka cache guard: app version ${storedVersion} → ${currentVersion}, clearing HTTP caches`);
            sessionStorage.setItem(CACHE_CLEAR_RELOAD_KEY, String(Date.now()));
            invalidateSetkaMemoryCaches();
            await clearBrowserCaches();
            localStorage.setItem(VERSION_KEY, currentVersion);
            PlatformPeg.get()?.reload();
            return;
        }
    }

    if (!storedVersion) {
        localStorage.setItem(VERSION_KEY, currentVersion);
    } else if (storedVersion !== currentVersion) {
        localStorage.setItem(VERSION_KEY, currentVersion);
    }
}

function isInvalidSessionError(error: unknown): boolean {
    if (!(error instanceof MatrixError)) return false;
    if (error.httpStatus === 401 || error.httpStatus === 403) return true;
    return error.errcode === "M_UNKNOWN_TOKEN" || error.errcode === "M_MISSING_TOKEN";
}

async function clearStaleSessionAndReload(reason: string): Promise<void> {
    if (sessionStorage.getItem(STALE_SESSION_FLAG)) {
        logger.warn(`Setka cache guard: skip stale-session clear (${reason}), already handled`);
        return;
    }
    logger.warn(`Setka cache guard: clearing stale session (${reason})`);
    sessionStorage.setItem(STALE_SESSION_FLAG, String(Date.now()));
    invalidateSetkaMemoryCaches();
    await clearBrowserCaches();
    await clearStorage();
    PlatformPeg.get()?.reload();
}

/**
 * Validate restored session before media/SW requests pile up with a dead token.
 */
export async function validateSetkaSessionOnStartup(client: MatrixClient): Promise<void> {
    if (!isSetkaHomeserver(client)) return;
    if (!client.getAccessToken()) return;

    try {
        await client.whoami();
    } catch (error) {
        if (isInvalidSessionError(error)) {
            await clearStaleSessionAndReload("whoami_invalid_token");
        } else {
            logger.warn("Setka cache guard: whoami failed, keeping session", error);
        }
    }
}

/**
 * Mount from LoggedInView — version check + session validation for Setka homeservers.
 */
export function initSetkaStartupCacheGuard(client: MatrixClient): () => void {
    if (!isSetkaHomeserver(client)) {
        return () => undefined;
    }

    void runSetkaStartupCacheCheck().then(() => validateSetkaSessionOnStartup(client));

    return () => undefined;
}
