/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import {
    compressWallpaperFile,
    getSetkaWallpaperImageObjectUrl,
    storeSetkaWallpaperImageBlob,
} from "./setkaWallpaperImageDb";

export const SETKA_WALLPAPER_AUTO = "auto";
export const SETKA_WALLPAPER_LIGHT = "light";
export const SETKA_WALLPAPER_DARK = "dark";

const CUSTOM_PREFIX = "custom:";
const COLOR_PREFIX = "color:";
const IMAGE_PREFIX = "image:";

const STORAGE_DEFAULT = "setka.wallpaper.default";
const STORAGE_ROOMS = "setka.wallpaper.rooms";

export const SETKA_WALLPAPER_LIGHT_URL =
    "https://web.setka-matrix.ru/themes/element/img/backgrounds/light_bg.png";
export const SETKA_WALLPAPER_DARK_URL =
    "https://web.setka-matrix.ru/themes/element/img/backgrounds/dark_bg.png";

export type SetkaWallpaperStyle = string;

export interface SetkaResolvedWallpaper {
    backgroundImage?: string;
    backgroundColor?: string;
    blurPx: number;
}

const listeners = new Set<() => void>();

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function writeJson(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
}

export function subscribeSetkaWallpaper(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (ev: StorageEvent): void => {
        if (!ev.key || ev.key.startsWith("setka.wallpaper")) {
            listener();
        }
    };
    window.addEventListener("storage", onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
    };
}

export function notifySetkaWallpaperChange(): void {
    listeners.forEach((listener) => listener());
}

export function getSetkaDefaultWallpaper(): SetkaWallpaperStyle {
    return localStorage.getItem(STORAGE_DEFAULT) ?? SETKA_WALLPAPER_AUTO;
}

export function setSetkaDefaultWallpaper(style: SetkaWallpaperStyle): void {
    localStorage.setItem(STORAGE_DEFAULT, style);
    notifySetkaWallpaperChange();
}

export function getSetkaRoomWallpaper(roomId: string): SetkaWallpaperStyle | null {
    const map = readJson<Record<string, string>>(STORAGE_ROOMS, {});
    return map[roomId] ?? null;
}

export function setSetkaRoomWallpaper(roomId: string, style: SetkaWallpaperStyle | null): void {
    const map = readJson<Record<string, string>>(STORAGE_ROOMS, {});
    if (style) {
        map[roomId] = style;
    } else {
        delete map[roomId];
    }
    writeJson(STORAGE_ROOMS, map);
    notifySetkaWallpaperChange();
}

export function toSetkaCustomWallpaperStyle(imageId: string): SetkaWallpaperStyle {
    return `${CUSTOM_PREFIX}${imageId}`;
}

export function toSetkaColorWallpaperStyle(colorHex: string): SetkaWallpaperStyle {
    return `${COLOR_PREFIX}${colorHex}`;
}

export function getSetkaCustomWallpaperImageId(style: string | null | undefined): string | null {
    if (!style?.startsWith(CUSTOM_PREFIX)) return null;
    return style.slice(CUSTOM_PREFIX.length) || null;
}

export async function getSetkaWallpaperImageUrl(imageId: string): Promise<string | null> {
    return getSetkaWallpaperImageObjectUrl(imageId);
}

export function getSetkaColorWallpaperHex(style: string | null | undefined): string | null {
    if (!style?.startsWith(COLOR_PREFIX)) return null;
    return style.slice(COLOR_PREFIX.length) || null;
}

export function resolveSetkaWallpaperStyle(
    style: SetkaWallpaperStyle | null | undefined,
    isDarkTheme: boolean,
    customImageUrl?: string | null,
): SetkaResolvedWallpaper {
    const resolved = style ?? SETKA_WALLPAPER_AUTO;
    const blurPx = 0;

    if (resolved === SETKA_WALLPAPER_AUTO) {
        return {
            backgroundImage: isDarkTheme ? SETKA_WALLPAPER_DARK_URL : SETKA_WALLPAPER_LIGHT_URL,
            blurPx,
        };
    }
    if (resolved === SETKA_WALLPAPER_LIGHT) {
        return { backgroundImage: SETKA_WALLPAPER_LIGHT_URL, blurPx };
    }
    if (resolved === SETKA_WALLPAPER_DARK) {
        return { backgroundImage: SETKA_WALLPAPER_DARK_URL, blurPx };
    }

    const colorHex = getSetkaColorWallpaperHex(resolved);
    if (colorHex) {
        return { backgroundColor: colorHex.startsWith("#") ? colorHex : `#${colorHex}`, blurPx };
    }

    const imageId = getSetkaCustomWallpaperImageId(resolved);
    if (imageId && customImageUrl) {
        return { backgroundImage: customImageUrl, blurPx };
    }

    if (resolved.startsWith(IMAGE_PREFIX)) {
        return { backgroundImage: resolved.slice(IMAGE_PREFIX.length), blurPx };
    }

    return {
        backgroundImage: isDarkTheme ? SETKA_WALLPAPER_DARK_URL : SETKA_WALLPAPER_LIGHT_URL,
        blurPx,
    };
}

export function getEffectiveSetkaWallpaper(
    roomId: string | null,
    isDarkTheme: boolean,
    customImageUrl?: string | null,
): SetkaResolvedWallpaper {
    const roomStyle = roomId ? getSetkaRoomWallpaper(roomId) : null;
    const style = roomStyle ?? getSetkaDefaultWallpaper();
    return resolveSetkaWallpaperStyle(style, isDarkTheme, customImageUrl);
}

export class SetkaWallpaperQuotaError extends Error {
    public constructor() {
        super("Wallpaper image is too large for local storage");
        this.name = "SetkaWallpaperQuotaError";
    }
}

export async function importSetkaWallpaperImage(file: File): Promise<SetkaWallpaperStyle> {
    const blob = await compressWallpaperFile(file);
    if (blob.size > 4 * 1024 * 1024) {
        throw new SetkaWallpaperQuotaError();
    }
    const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
        await storeSetkaWallpaperImageBlob(imageId, blob);
    } catch {
        throw new SetkaWallpaperQuotaError();
    }
    return toSetkaCustomWallpaperStyle(imageId);
}
