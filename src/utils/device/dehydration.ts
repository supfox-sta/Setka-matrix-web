/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/src/logger";
import { type StartDehydrationOpts } from "matrix-js-sdk/src/crypto-api";

import type { MatrixClient } from "matrix-js-sdk/src/matrix";
import { isSetkaHomeserver } from "../../setka/SetkaConfig";

/**
 * If dehydration is supported by the server, rehydrate a device (if available) and create
 * a new dehydrated device.
 *
 * @param client - MatrixClient to use for the operation
 * @param opts - options for the startDehydration operation, if one is performed.
 */
export async function initialiseDehydrationIfEnabled(
    client: MatrixClient,
    opts: StartDehydrationOpts = {},
): Promise<void> {
    // Setka homeservers do not implement MSC3814; the SDK may still probe the endpoint.
    if (isSetkaHomeserver(client)) {
        return;
    }

    const crypto = client.getCrypto();
    if (!crypto) {
        return;
    }

    try {
        if (await crypto.isDehydrationSupported()) {
            logger.debug("Starting device dehydration");
            await crypto.startDehydration(opts);
        }
    } catch (error) {
        logger.warn("Device dehydration skipped", error);
    }
}
