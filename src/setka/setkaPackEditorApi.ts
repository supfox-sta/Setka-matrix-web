/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { invalidateSetkaEmojiPacksCache } from "./setkaEmojiPacksCache";
import { setkaAuthedJsonRequest } from "./setkaHttp";
import {
    type SetkaPackKind,
    type SetkaPackSticker,
    type SetkaStickerPack,
    parseStickerPacksResponse,
} from "./setkaStickerPacks";
import { deleteSetkaStickerPack } from "./setkaStickerPackActions";

interface StickerPackResponse {
    pack?: unknown;
    sticker_pack?: unknown;
    packs?: unknown[];
    sticker_packs?: unknown[];
}

function stickerToJson(sticker: SetkaPackSticker): Record<string, unknown> {
    return {
        id: sticker.id,
        name: sticker.name,
        mxc_url: sticker.mxcUrl,
        mime_type: sticker.mimeType,
        width: sticker.width,
        height: sticker.height,
        size: sticker.size,
    };
}

function packToSaveBody(pack: SetkaStickerPack): Record<string, unknown> {
    return {
        name: pack.name.trim(),
        kind: pack.kind,
        stickers: pack.stickers.map(stickerToJson),
    };
}

function parseSinglePackResponse(data: StickerPackResponse): SetkaStickerPack | null {
    const fromList = parseStickerPacksResponse({
        packs: data.packs as never,
        sticker_packs: data.sticker_packs as never,
    });
    if (fromList[0]) return fromList[0];
    const single = data.pack ?? data.sticker_pack;
    if (!single) return null;
    const parsed = parseStickerPacksResponse({ packs: [single as never] });
    return parsed[0] ?? null;
}

function invalidatePackCaches(): void {
    invalidateSetkaEmojiPacksCache();
}

export async function createSetkaStickerPack(
    client: MatrixClient,
    userId: string,
    name: string,
    kind: SetkaPackKind,
): Promise<SetkaStickerPack> {
    const data = await setkaAuthedJsonRequest<StickerPackResponse>(
        client,
        Method.Post,
        `/user/${encodeURIComponent(userId)}/setka_plus/sticker_packs`,
        { name: name.trim(), kind },
    );
    const pack = parseSinglePackResponse(data);
    if (!pack) throw new Error("Invalid sticker pack response");
    invalidatePackCaches();
    return pack;
}

export async function saveSetkaStickerPack(
    client: MatrixClient,
    userId: string,
    pack: SetkaStickerPack,
): Promise<SetkaStickerPack> {
    const data = await setkaAuthedJsonRequest<StickerPackResponse>(
        client,
        Method.Put,
        `/user/${encodeURIComponent(userId)}/setka_plus/sticker_packs/${encodeURIComponent(pack.id)}`,
        packToSaveBody(pack),
    );
    const saved = parseSinglePackResponse(data) ?? pack;
    invalidatePackCaches();
    return saved;
}

export async function removeSetkaPackSticker(
    client: MatrixClient,
    userId: string,
    pack: SetkaStickerPack,
    stickerId: string,
): Promise<SetkaStickerPack> {
    return saveSetkaStickerPack(client, userId, {
        ...pack,
        stickers: pack.stickers.filter((sticker) => sticker.id !== stickerId),
    });
}

export async function addSetkaPackSticker(
    client: MatrixClient,
    userId: string,
    pack: SetkaStickerPack,
    sticker: SetkaPackSticker,
): Promise<SetkaStickerPack> {
    return saveSetkaStickerPack(client, userId, {
        ...pack,
        stickers: [...pack.stickers, sticker],
    });
}

export async function deleteSetkaPack(
    client: MatrixClient,
    userId: string,
    packId: string,
): Promise<void> {
    await deleteSetkaStickerPack(client, userId, packId);
    invalidatePackCaches();
}

export async function createSetkaPackShareLink(
    client: MatrixClient,
    userId: string,
    packId: string,
): Promise<string> {
    const data = await setkaAuthedJsonRequest<{ url?: string; share_url?: string; token?: string }>(
        client,
        Method.Post,
        `/user/${encodeURIComponent(userId)}/setka_plus/sticker_packs/${encodeURIComponent(packId)}/share`,
    );
    if (data.url) return data.url;
    if (data.share_url) return data.share_url;
    if (data.token) return `https://setka-matrix.ru/pack/${data.token}`;
    throw new Error("Share link missing in response");
}
