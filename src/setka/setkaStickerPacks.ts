/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedJsonRequest } from "./setkaHttp";

export type SetkaPackKind = "emoji" | "sticker";

export interface SetkaPackSticker {
    id: string;
    name?: string;
    mxcUrl: string;
    mimeType?: string;
    width?: number;
    height?: number;
    size?: number;
}

export interface SetkaStickerPack {
    id: string;
    name: string;
    kind: SetkaPackKind;
    iconMxcUrl?: string;
    stickers: SetkaPackSticker[];
}

interface StickerPackJson {
    id?: string;
    name?: string;
    kind?: string;
    icon_mxc?: string;
    iconMxcUrl?: string;
    stickers?: Array<{
        id?: string;
        name?: string;
        mxc_url?: string;
        mxcUrl?: string;
        mimetype?: string;
    }>;
}

interface StickerPacksResponse {
    packs?: StickerPackJson[];
    sticker_packs?: StickerPackJson[];
}

function classifyPackKind(pack: StickerPackJson): SetkaPackKind {
    const kind = pack.kind?.toLowerCase();
    if (kind === "emoji") return "emoji";
    if (kind === "sticker") return "sticker";
    const hasEmojiNames = (pack.stickers ?? []).some((sticker) => {
        const name = sticker.name ?? "";
        return name.startsWith(":") && name.endsWith(":");
    });
    return hasEmojiNames ? "emoji" : "sticker";
}

export function parseStickerPacksResponse(root: StickerPacksResponse): SetkaStickerPack[] {
    const packsJson = root.packs ?? root.sticker_packs ?? [];
    const out: SetkaStickerPack[] = [];

    for (const pack of packsJson) {
        if (!pack.id) continue;
        const kind = classifyPackKind(pack);
        const stickers: SetkaPackSticker[] = [];
        for (const sticker of pack.stickers ?? []) {
            const mxcUrl = sticker.mxc_url ?? sticker.mxcUrl;
            if (!mxcUrl) continue;
            stickers.push({
                id: sticker.id ?? mxcUrl,
                name: sticker.name,
                mxcUrl,
            });
        }
        if (stickers.length === 0) continue;
        out.push({
            id: pack.id,
            name: pack.name?.trim() || pack.id,
            kind,
            iconMxcUrl: pack.icon_mxc ?? pack.iconMxcUrl ?? stickers[0]?.mxcUrl,
            stickers,
        });
    }
    return out;
}

export async function fetchSetkaStickerPacks(client: MatrixClient, userId: string): Promise<SetkaStickerPack[]> {
    const data = await setkaAuthedJsonRequest<StickerPacksResponse>(
        client,
        Method.Get,
        `/user/${encodeURIComponent(userId)}/setka_plus/sticker_packs`,
    );
    return parseStickerPacksResponse(data);
}

export function inlineEmojiToken(sticker: SetkaPackSticker): string {
    const normalizedName = (sticker.name ?? "emoji")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_+\-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
    return `:${normalizedName || "emoji"}:`;
}

export function isGifSticker(sticker: SetkaPackSticker): boolean {
    const name = (sticker.name ?? "").toLowerCase();
    return name.endsWith(".gif") || name.includes("gif");
}

export const SETKA_STOCK_EMOJIS = [
    "😂", "😭", "🤣", "😍", "😊", "🤔", "😡", "😱",
    "👍", "👎", "👏", "🙏", "🔥", "❤️", "💯", "✨",
    "🎉", "🤝", "👀", "🙌", "👌", "🤯", "😴", "🥳",
    "😇", "🤖", "🐱", "🐶", "🌈", "⭐", "🍕", "☕",
];
