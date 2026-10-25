/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { DecryptionKeyDoesNotMatchError } from "matrix-js-sdk/src/crypto-api";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import {
    ACCOUNT_DATA_KEY_M_KEY_BACKUP,
    ACCOUNT_DATA_KEY_M_KEY_BACKUP_DISABLED_UNSTABLE,
    DeviceListener,
} from "../device-listener";
import { accessSecretStorageWithRecoveryKey } from "../SecurityManager";
import { resetKeyBackupAndWait } from "../utils/crypto/resetKeyBackup";
import { initialiseDehydrationIfEnabled } from "../utils/device/dehydration";
import { isSetkaHomeserver } from "./SetkaConfig";
import {
    completeSetkaLoginFallback,
    fetchSetkaRecoveryKey,
    getSetkaLoginStatus,
} from "./SetkaLoginVerificationApi";
import { publishSetkaRecoveryKeyToServer } from "./setkaSKeyService";
import { SetkaAnalyticsEvents } from "./analytics/events";
import { trackSetkaEvent } from "./analytics/SetkaAnalytics";
import { SetkaTimeoutError, withSetkaTimeout } from "./setkaTimeout";

const STATUS_TIMEOUT_MS = 12_000;
const FETCH_KEY_TIMEOUT_MS = 15_000;
const APPLY_KEY_TIMEOUT_MS = 45_000;
const PUBLISH_KEY_TIMEOUT_MS = 60_000;

/**
 * Returns true when login may proceed without showing the Setka verification screen.
 * When an S/Key backup exists on the server, fetches the recovery key, applies it locally,
 * and completes server-side login verification automatically.
 */
export async function trySilentSetkaLogin(client: MatrixClient): Promise<boolean> {
    if (!isSetkaHomeserver(client)) {
        return true;
    }

    let status = await withSetkaTimeout(getSetkaLoginStatus(client), STATUS_TIMEOUT_MS, "login_status");

    if (status.recoveryBackupAvailable) {
        const backup = await withSetkaTimeout(fetchSetkaRecoveryKey(client), FETCH_KEY_TIMEOUT_MS, "fetch_recovery_key");
        if (backup.available && backup.recoveryKey) {
            const applied = await applySetkaRecoveryKeyForVerification(client, backup.recoveryKey);
            if (applied) {
                trackSetkaEvent(client, SetkaAnalyticsEvents.LoginSkeySilentSuccess, {});

                if (status.required && !status.verified) {
                    await withSetkaTimeout(
                        completeSetkaLoginFallback(client, "recovery_key", backup.recoveryKey),
                        STATUS_TIMEOUT_MS,
                        "complete_login",
                    );
                }

                await verifySetkaCurrentDevice(client);
                void ensureSetkaRecoveryOnServer(client);
                return true;
            }

            trackSetkaEvent(client, SetkaAnalyticsEvents.LoginSkeySilentFailed, { reason: "apply_failed" });
        }

        status = await withSetkaTimeout(getSetkaLoginStatus(client), STATUS_TIMEOUT_MS, "login_status");
    }

    if (!status.required || status.verified) {
        void ensureSetkaRecoveryOnServer(client);
        return true;
    }

    return false;
}

async function ensureSetkaRecoveryOnServer(client: MatrixClient): Promise<void> {
    try {
        const status = await withSetkaTimeout(getSetkaLoginStatus(client), STATUS_TIMEOUT_MS, "login_status");
        if (status.recoveryBackupAvailable) {
            return;
        }
        await withSetkaTimeout(publishSetkaRecoveryKeyToServer(client), PUBLISH_KEY_TIMEOUT_MS, "publish_recovery_key");
    } catch (error) {
        if (!(error instanceof SetkaTimeoutError)) {
            logger.warn("Setka post-login recovery sync skipped", error);
        } else {
            logger.warn("Setka post-login recovery sync timed out");
        }
    }
}

/** Fetch recovery key from Setka server and apply it for identity verification. */
export async function fetchAndApplySetkaRecoveryKey(client: MatrixClient): Promise<boolean> {
    const backup = await withSetkaTimeout(fetchSetkaRecoveryKey(client), FETCH_KEY_TIMEOUT_MS, "fetch_recovery_key");
    if (!backup.available || !backup.recoveryKey) {
        return false;
    }
    return applySetkaRecoveryKeyForVerification(client, backup.recoveryKey);
}

/** Cross-sign the current device after S/Key recovery so verification toasts stop. */
export async function verifySetkaCurrentDevice(client: MatrixClient): Promise<boolean> {
    if (!isSetkaHomeserver(client)) {
        return false;
    }

    const crypto = client.getCrypto();
    const userId = client.getUserId();
    const deviceId = client.getDeviceId();
    if (!crypto || !userId || !deviceId) {
        return false;
    }

    try {
        if (!(await crypto.getCrossSigningKeyId())) {
            return false;
        }

        const status = await crypto.getDeviceVerificationStatus(userId, deviceId);
        if (status?.crossSigningVerified) {
            return true;
        }

        await crypto.crossSignDevice(deviceId);
        return true;
    } catch (error) {
        logger.warn("Setka: could not cross-sign current device", error);
        return false;
    }
}

/** Ensure Matrix key backup exists on the server before applying a recovery key (Android parity). */
async function ensureSetkaKeyBackupOnServer(client: MatrixClient): Promise<void> {
    const crypto = client.getCrypto();
    if (!crypto) {
        return;
    }

    try {
        await crypto.checkKeyBackupAndEnable();
    } catch (error) {
        logger.debug("Setka: checkKeyBackupAndEnable before recovery", error);
    }
}

/** Fetch S/Key from the Setka server for paste-into-field UI flows. */
export async function fetchSetkaRecoveryKeyForPaste(client: MatrixClient): Promise<string | null> {
    const backup = await withSetkaTimeout(fetchSetkaRecoveryKey(client), FETCH_KEY_TIMEOUT_MS, "fetch_recovery_key");
    const trimmed = backup.recoveryKey.trim();
    return backup.available && trimmed ? trimmed : null;
}

/** Finish bootstrapping backup and account flags after recovery key unlock. */
async function completeSetkaRecoveryBootstrap(client: MatrixClient): Promise<void> {
    const crypto = client.getCrypto();
    if (!crypto) {
        return;
    }

    const deviceListener = DeviceListener.sharedInstance();
    const needsBackupReset = await deviceListener.keyStorageOutOfSyncNeedsBackupReset(false);

    try {
        await crypto.checkKeyBackupAndEnable();
    } catch (error) {
        logger.debug("Setka: checkKeyBackupAndEnable after recovery key", error);
    }

    const backupInfo = await crypto.getKeyBackupInfo();
    if (backupInfo) {
        if (needsBackupReset) {
            logger.info("Setka: resetting key backup before restore");
            await resetKeyBackupAndWait(crypto);
        } else if (await client.isKeyBackupKeyStored()) {
            try {
                await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
            } catch (error) {
                if (error instanceof DecryptionKeyDoesNotMatchError) {
                    logger.warn("Setka: backup key in 4S does not match server backup; resetting backup");
                    await resetKeyBackupAndWait(crypto);
                } else {
                    throw error;
                }
            }
        }

        if ((await crypto.getSessionBackupPrivateKey()) === null && (await client.isKeyBackupKeyStored())) {
            try {
                await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
            } catch (error) {
                if (error instanceof DecryptionKeyDoesNotMatchError) {
                    logger.warn("Setka: could not load backup key from 4S after bootstrap");
                } else {
                    throw error;
                }
            }
        }

        try {
            const result = await crypto.restoreKeyBackup();
            logger.info(`Setka: key backup restore completed (${result.imported} keys imported)`);
        } catch (error) {
            logger.warn("Setka: key backup restore failed", error);
        }
    }

    try {
        await client.setAccountData(ACCOUNT_DATA_KEY_M_KEY_BACKUP, { enabled: true });
        await client.setAccountData(ACCOUNT_DATA_KEY_M_KEY_BACKUP_DISABLED_UNSTABLE, { disabled: false });
    } catch (error) {
        logger.debug("Setka: could not mark key backup as enabled", error);
    }

    try {
        await initialiseDehydrationIfEnabled(client);
    } catch (error) {
        logger.debug("Setka: dehydration init skipped", error);
    }
}

/**
 * Apply a Setka server recovery key locally: bootstrap secret storage / cross-signing
 * and restore key backup — same path as entering the recovery key manually.
 */
export async function applySetkaRecoveryKeyForVerification(
    client: MatrixClient,
    recoveryKey: string,
): Promise<boolean> {
    const crypto = client.getCrypto();
    const trimmed = recoveryKey.trim();
    if (!crypto || !trimmed) {
        return false;
    }

    try {
        await withSetkaTimeout(
            DeviceListener.sharedInstance().whilePaused(async () => {
                await ensureSetkaKeyBackupOnServer(client);
                await accessSecretStorageWithRecoveryKey(trimmed, async () => {
                    await completeSetkaRecoveryBootstrap(client);
                });
            }),
            APPLY_KEY_TIMEOUT_MS,
            "apply_recovery_key",
        );
        await verifySetkaCurrentDevice(client);
        void ensureSetkaRecoveryOnServer(client);
        DeviceListener.sharedInstance().recheck();
        return true;
    } catch (error) {
        if (error instanceof SetkaTimeoutError) {
            logger.warn("Timed out applying Setka recovery key for verification");
        } else {
            logger.warn("Could not apply Setka recovery key for verification", error);
        }
        return false;
    }
}
