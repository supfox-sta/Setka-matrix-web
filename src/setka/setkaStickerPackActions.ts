/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedRequest } from "./setkaHttp";
import { type SetkaStickerPack } from "./setkaStickerPacks";

export async function deleteSetkaStickerPack(
    client: MatrixClient,
    userId: string,
    packId: string,
): Promise<void> {
    await setkaAuthedRequest(
        client,
        Method.Delete,
        `/user/${encodeURIComponent(userId)}/setka_plus/sticker_packs/${encodeURIComponent(packId)}`,
    );
}

export function findSetkaPackByMxcUrl(
    packs: SetkaStickerPack[],
    mxcUrl: string,
): SetkaStickerPack | undefined {
    return packs.find((pack) => pack.stickers.some((sticker) => sticker.mxcUrl === mxcUrl));
}
