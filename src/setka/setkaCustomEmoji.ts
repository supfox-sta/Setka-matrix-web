/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type SetkaPackSticker, type SetkaStickerPack, inlineEmojiToken } from "./setkaStickerPacks";

const INLINE_EMOJI_SIZE = 22;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function toBasicHtml(body: string): string {
    return escapeHtml(body).replace(/\r\n/g, "\n").replace(/\n/g, "<br>");
}

function toInlineEmojiHtml(sticker: SetkaPackSticker, token: string): string {
    const width = INLINE_EMOJI_SIZE;
    const height = INLINE_EMOJI_SIZE;
    const escapedName = escapeHtml(sticker.name ?? token);
    return (
        `<img data-mx-emoticon src="${escapeHtml(sticker.mxcUrl)}" alt="${escapeHtml(token)}" ` +
        `title="${escapedName}" width="${width}" height="${height}" />`
    );
}

export function applySetkaCustomEmojiFormatting(
    body: string,
    formattedBody: string | undefined,
    packs: SetkaStickerPack[],
): { body: string; formattedBody: string | undefined } {
    if (formattedBody?.includes("data-mx-emoticon")) {
        return { body, formattedBody };
    }

    const customEmojiEntries = packs
        .filter((pack) => pack.kind === "emoji")
        .flatMap((pack) => pack.stickers)
        .map((sticker) => {
            const token = inlineEmojiToken(sticker);
            return token ? { token, sticker } : null;
        })
        .filter((entry): entry is { token: string; sticker: SetkaPackSticker } => entry !== null)
        .filter((entry, index, list) => list.findIndex((e) => e.token === entry.token) === index)
        .sort((a, b) => b.token.length - a.token.length);

    if (customEmojiEntries.length === 0) {
        return { body, formattedBody };
    }

    const matching = customEmojiEntries.filter(
        ({ token }) => body.includes(token) || formattedBody?.includes(token),
    );
    if (matching.length === 0) {
        return { body, formattedBody };
    }

    let html = formattedBody ?? toBasicHtml(body);
    for (const { token, sticker } of matching) {
        html = html.split(token).join(toInlineEmojiHtml(sticker, token));
    }

    return { body, formattedBody: html };
}
