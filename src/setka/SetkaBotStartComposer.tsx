/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useRef, useState } from "react";
import { type MatrixClient, type Room, MsgType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import { relaySetkaBotMessageAfterSend } from "./setkaBotMessageRelay";
import { doMaybeLocalRoomAction } from "../utils/local-room";

interface Props {
    room: Room;
    client: MatrixClient;
}

/**
 * Shown instead of the message composer until the user sends the first message in a bot DM.
 * Sends `/start` like Telegram bots.
 */
const SetkaBotStartComposer: React.FC<Props> = ({ room, client }) => {
    const [busy, setBusy] = useState(false);
    const sendingRef = useRef(false);

    const onStart = useCallback(async () => {
        if (sendingRef.current) return;
        sendingRef.current = true;
        setBusy(true);
        try {
            const content = { msgtype: MsgType.Text, body: "/start" };
            const prom = doMaybeLocalRoomAction(
                room.roomId,
                (actualRoomId) => client.sendMessage(actualRoomId, null, content),
                client,
            );
            relaySetkaBotMessageAfterSend(client, room, content, prom);
            await prom;
        } catch (e) {
            logger.warn("Setka bot /start send failed", e);
        } finally {
            sendingRef.current = false;
            setBusy(false);
        }
    }, [client, room]);

    return (
        <div className="mx_SetkaBotStartComposer" role="region" aria-label={_t("a11y|message_composer")}>
            <AccessibleButton
                className="mx_SetkaBotStartComposer_button"
                kind="primary"
                onClick={onStart}
                disabled={busy}
            >
                {_t("setka|bot|start_button")}
            </AccessibleButton>
        </div>
    );
};

export default SetkaBotStartComposer;
