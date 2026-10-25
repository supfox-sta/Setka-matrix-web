/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const KLIPY_API_KEY = "rRNZRobDuVh8GAze5APce6mLWmmCsSSbsiJolnXYxYntOpeRva5v97Z4qbBPSL0X";
export const KLIPY_APP_NAME = "SETKA-MULTI-GIF";
const KLIPY_BASE = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}`;

interface KlipyMediaVariant {
    url: string;
    width: number;
    height: number;
    size: number;
}

interface KlipyGifItem {
    id: number;
    slug: string;
    title: string;
    file?: {
        hd?: { gif?: KlipyMediaVariant };
        md?: { gif?: KlipyMediaVariant };
        sm?: { gif?: KlipyMediaVariant };
        xs?: { gif?: KlipyMediaVariant };
    };
}

export interface KlipyGif {
    id: number;
    slug: string;
    title: string;
    previewUrl: string;
    gifUrl: string;
    width: number;
    height: number;
}

export interface KlipyGifPage {
    gifs: KlipyGif[];
    page: number;
    hasNext: boolean;
}

interface KlipyListResponse {
    result: boolean;
    data: {
        data: KlipyGifItem[];
        current_page: number;
        has_next: boolean;
    };
}

function pickPreview(item: KlipyGifItem): KlipyMediaVariant | null {
    return item.file?.sm?.gif ?? item.file?.xs?.gif ?? item.file?.md?.gif ?? item.file?.hd?.gif ?? null;
}

function pickFull(item: KlipyGifItem): KlipyMediaVariant | null {
    return item.file?.md?.gif ?? item.file?.hd?.gif ?? item.file?.sm?.gif ?? item.file?.xs?.gif ?? null;
}

function mapGif(item: KlipyGifItem): KlipyGif | null {
    const preview = pickPreview(item);
    const full = pickFull(item);
    if (!preview || !full) return null;
    return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        previewUrl: preview.url,
        gifUrl: full.url,
        width: full.width,
        height: full.height,
    };
}

async function fetchKlipyList(
    path: string,
    customerId: string,
    page: number,
    limit: number,
    extraParams: Record<string, string> = {},
): Promise<KlipyGifPage> {
    const url = new URL(`${KLIPY_BASE}${path}`);
    url.searchParams.set("customer_id", customerId);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
        headers: {
            "User-Agent": `${KLIPY_APP_NAME}/1.0`,
        },
    });
    if (!response.ok) {
        throw new Error(`Klipy API error: ${response.status}`);
    }

    const json = (await response.json()) as KlipyListResponse;
    const gifs = (json.data?.data ?? []).map(mapGif).filter((gif): gif is KlipyGif => gif !== null);
    return {
        gifs,
        page: json.data?.current_page ?? page,
        hasNext: Boolean(json.data?.has_next),
    };
}

export function fetchTrendingKlipyGifs(customerId: string, page = 1, limit = 24): Promise<KlipyGifPage> {
    return fetchKlipyList("/gifs/trending", customerId, page, limit);
}

export function searchKlipyGifs(
    query: string,
    customerId: string,
    page = 1,
    limit = 24,
): Promise<KlipyGifPage> {
    return fetchKlipyList("/gifs/search", customerId, page, limit, { q: query.trim() });
}

export async function reportKlipyGifShare(slug: string, customerId: string): Promise<void> {
    const url = new URL(`${KLIPY_BASE}/gifs/${encodeURIComponent(slug)}/share`);
    url.searchParams.set("customer_id", customerId);
    try {
        await fetch(url.toString(), {
            method: "POST",
            headers: {
                "User-Agent": `${KLIPY_APP_NAME}/1.0`,
            },
        });
    } catch {
        // Best-effort analytics for Klipy recommendations.
    }
}
