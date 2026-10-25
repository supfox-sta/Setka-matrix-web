/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { fetchSetkaStickerPacks, type SetkaPackSticker, type SetkaStickerPack } from "./setkaStickerPacks";

export type SetkaEmojiSticker = SetkaPackSticker;
export type SetkaEmojiPack = SetkaStickerPack;

export async function fetchSetkaEmojiPacks(client: MatrixClient, userId: string): Promise<SetkaEmojiPack[]> {
    const packs = await fetchSetkaStickerPacks(client, userId);
    return packs.filter((pack) => pack.kind === "emoji");
}
