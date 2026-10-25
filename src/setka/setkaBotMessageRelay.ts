/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type ISendEventResponse, type MatrixClient, type Room, MsgType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { isSetkaHomeserver } from "./SetkaConfig";
import { submitSetkaBotMessage } from "./SetkaBotsApi";
import { getSetkaBotRelayTargets } from "./setkaBotRoom";

type RelayContent = {
    body?: string;
    msgtype?: string;
    url?: string;
};

/**
 * After a Matrix send in a bot DM, relay plaintext to Setka Bot API queue.
 * Required when the room uses E2EE; also works when Synapse on_new_event is off.
 */
export function relaySetkaBotMessageAfterSend(
    client: MatrixClient,
    room: Room,
    content: RelayContent,
    prom: Promise<ISendEventResponse>,
): void {
    if (!isSetkaHomeserver(client)) return;

    const isImage = content.msgtype === MsgType.Image && content.url?.startsWith("mxc://");
    const messageText = content.body?.trim() ?? "";
    if (!isImage && !messageText) return;

    const targets = getSetkaBotRelayTargets(room, messageText || " ", client);
    if (!targets.length) return;

    void prom
        .then(async (resp) => {
            for (const botUserId of targets) {
                if (isImage) {
                    await submitSetkaBotMessage(client, {
                        bot_user_id: botUserId,
                        event_id: resp.event_id,
                        text: messageText,
                        msgtype: "m.image",
                        url: content.url!,
                    });
                } else {
                    await submitSetkaBotMessage(client, {
                        bot_user_id: botUserId,
                        event_id: resp.event_id,
                        text: messageText,
                    });
                }
            }
        })
        .catch((e) => logger.warn("Setka bot message relay failed", e));
}
