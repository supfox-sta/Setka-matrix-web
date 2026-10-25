/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

export const SETKA_BOT_REPLY_MARKUP_KEY = "io.setka.bot.reply_markup";

export type SetkaBotInlineButton = {
    text: string;
    url?: string;
    callback_data?: string;
};

export type SetkaBotReplyMarkup = {
    inline_keyboard?: SetkaBotInlineButton[][];
};

export function getSetkaBotReplyMarkup(mxEvent: MatrixEvent): SetkaBotReplyMarkup | null {
    const content = mxEvent.getContent();
    const raw = content[SETKA_BOT_REPLY_MARKUP_KEY];
    if (!raw || typeof raw !== "object") return null;
    const markup = raw as SetkaBotReplyMarkup;
    if (!Array.isArray(markup.inline_keyboard) || markup.inline_keyboard.length === 0) {
        return null;
    }
    return markup;
}
