/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useContext, useState } from "react";
import { MsgType, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import AccessibleButton from "../components/views/elements/AccessibleButton";
import MatrixClientContext from "../contexts/MatrixClientContext";
import { getSetkaBotReplyMarkup } from "./setkaBotMarkup";

interface Props {
    mxEvent: MatrixEvent;
}

/** callback_data → slash command sent as a normal m.text message (no server callback). */
function callbackDataToCommand(data: string): string {
    const trimmed = data.trim();
    if (!trimmed) return "/help";
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

const SetkaBotMessageButtons: React.FC<Props> = ({ mxEvent }) => {
    const client = useContext(MatrixClientContext);
    const markup = getSetkaBotReplyMarkup(mxEvent);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const onSendCommand = useCallback(
        async (callbackData: string, buttonKey: string) => {
            const roomId = mxEvent.getRoomId();
            if (!client || !roomId || busyKey) return;
            const body = callbackDataToCommand(callbackData);
            setBusyKey(buttonKey);
            try {
                await client.sendMessage(roomId, {
                    msgtype: MsgType.Text,
                    body,
                });
            } catch (e) {
                logger.warn("Setka bot button send failed", e);
            } finally {
                setBusyKey(null);
            }
        },
        [busyKey, client, mxEvent],
    );

    if (!markup?.inline_keyboard?.length) return null;

    return (
        <div className="mx_SetkaBotMessageButtons">
            {markup.inline_keyboard.map((row, rowIndex) => (
                <div key={rowIndex} className="mx_SetkaBotMessageButtons_row">
                    {row.map((button, buttonIndex) => {
                        const key = `${rowIndex}-${buttonIndex}-${button.text}`;
                        if (button.url) {
                            return (
                                <AccessibleButton
                                    key={key}
                                    className="mx_SetkaBotMessageButtons_button"
                                    onClick={() => window.open(button.url, "_blank", "noopener,noreferrer")}
                                >
                                    {button.text}
                                </AccessibleButton>
                            );
                        }
                        if (button.callback_data) {
                            return (
                                <AccessibleButton
                                    key={key}
                                    className="mx_SetkaBotMessageButtons_button"
                                    disabled={busyKey === key}
                                    onClick={() => void onSendCommand(button.callback_data!, key)}
                                >
                                    {button.text}
                                </AccessibleButton>
                            );
                        }
                        return (
                            <span
                                key={key}
                                className="mx_SetkaBotMessageButtons_button mx_SetkaBotMessageButtons_button_static"
                            >
                                {button.text}
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default SetkaBotMessageButtons;
