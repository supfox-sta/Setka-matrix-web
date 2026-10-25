/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { saveSetkaContact } from "./SetkaContactsApi";
import { isSetkaHomeserver } from "./SetkaConfig";

/**
 * After a DM is created on Setka, mirror Android behaviour and add it to contact_list.
 */
export async function maybeAddSetkaContactAfterDm(
    client: MatrixClient,
    roomId: string,
    dmUserId: string,
): Promise<void> {
    if (!isSetkaHomeserver(client)) return;

    const userId = client.getUserId();
    if (!userId || dmUserId === userId) return;

    try {
        let displayName: string | undefined;
        try {
            const profile = await client.getProfileInfo(dmUserId);
            displayName = profile.displayname;
        } catch {
            // Profile may be unavailable; still add the contact with room id only.
        }

        await saveSetkaContact(client, userId, roomId, { displayName });
    } catch (e) {
        logger.warn("Setka: failed to add DM to contact list", e);
    }
}
