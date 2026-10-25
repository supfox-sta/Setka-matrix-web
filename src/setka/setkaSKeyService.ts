/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { DeviceListener } from "../device-listener";
import { withSecretStorageKeyCache } from "../SecurityManager";
import { storeSetkaRecoveryKey } from "./SetkaLoginVerificationApi";
import { SetkaAnalyticsEvents } from "./analytics/events";
import { trackSetkaEvent } from "./analytics/SetkaAnalytics";

/**
 * Create a fresh recovery key, bootstrap local secret storage, and upload to Setka server.
 */
export async function publishSetkaRecoveryKeyToServer(client: MatrixClient): Promise<string> {
    const crypto = await waitForCrypto(client);

    const recoveryKey = await crypto.createRecoveryKeyFromPassphrase();
    const encodedKey = recoveryKey.encodedPrivateKey;
    if (!encodedKey) {
        throw new Error("Failed to generate recovery key");
    }

    const deviceListener = DeviceListener.sharedInstance();
    const hasExistingStorage = Boolean(await client.secretStorage.getDefaultKeyId());

    await deviceListener.whilePaused(async () => {
        await withSecretStorageKeyCache(async () => {
            await crypto.bootstrapSecretStorage({
                setupNewSecretStorage: !hasExistingStorage,
                createSecretStorageKey: async () => recoveryKey,
            });
        });
    });

    const stored = await storeSetkaRecoveryKey(client, encodedKey);
    if (!stored) {
        throw new Error("Server rejected recovery key upload");
    }

    trackSetkaEvent(client, SetkaAnalyticsEvents.SkeyEnabled, {});

    logger.info("Setka S/Key: recovery key published to server");
    return encodedKey;
}

async function waitForCrypto(client: MatrixClient, attempts = 20): Promise<NonNullable<ReturnType<MatrixClient["getCrypto"]>>> {
    for (let i = 0; i < attempts; i++) {
        const crypto = client.getCrypto();
        if (crypto) {
            return crypto;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Crypto not available");
}
