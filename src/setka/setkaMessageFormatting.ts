/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, type RoomMessageEventContent } from "matrix-js-sdk/src/matrix";

import { isSetkaHomeserver } from "./SetkaConfig";
import { applySetkaCustomEmojiFormatting } from "./setkaCustomEmoji";
import { getSetkaEmojiPacksCached } from "./setkaEmojiPacksCache";

export async function applySetkaMessageFormatting(
    client: MatrixClient,
    content: RoomMessageEventContent,
): Promise<void> {
    if (!isSetkaHomeserver(client) || !content.body?.trim()) {
        return;
    }
    const packs = await getSetkaEmojiPacksCached(client);
    const formatted = applySetkaCustomEmojiFormatting(content.body, content.formatted_body, packs);
    content.body = formatted.body;
    if (formatted.formattedBody) {
        content.format = "org.matrix.custom.html";
        content.formatted_body = formatted.formattedBody;
    }
}
