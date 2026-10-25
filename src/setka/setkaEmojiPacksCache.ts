/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { fetchSetkaStickerPacks, type SetkaStickerPack } from "./setkaStickerPacks";

let cachedPacks: SetkaStickerPack[] | null = null;
let cachedUserId: string | null = null;
let inflight: Promise<SetkaStickerPack[]> | null = null;

export async function getSetkaEmojiPacksCached(client: MatrixClient): Promise<SetkaStickerPack[]> {
    const userId = client.getUserId();
    if (!userId) return [];
    if (cachedPacks && cachedUserId === userId) {
        return cachedPacks;
    }
    if (inflight) {
        return inflight;
    }
    inflight = fetchSetkaStickerPacks(client, userId)
        .then((packs) => {
            cachedPacks = packs;
            cachedUserId = userId;
            return packs;
        })
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

export function invalidateSetkaEmojiPacksCache(): void {
    cachedPacks = null;
    cachedUserId = null;
}
