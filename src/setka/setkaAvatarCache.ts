/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const STORAGE_KEY = "setka.startup.avatar.v1";

interface CachedAvatar {
    userId: string;
    mxcUrl?: string;
    displayName?: string;
}

export function readCachedSetkaAvatar(userId: string): CachedAvatar | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedAvatar;
        if (parsed.userId !== userId) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeCachedSetkaAvatar(userId: string, mxcUrl?: string, displayName?: string): void {
    if (!userId) return;
    const payload: CachedAvatar = { userId, mxcUrl, displayName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
