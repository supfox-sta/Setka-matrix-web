/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

/** True when a hex accent should use light foreground text on the profile hero. */
export function isSetkaColorDark(hex: string): boolean {
    const normalized = hex.trim().replace("#", "");
    let r: number;
    let g: number;
    let b: number;

    if (normalized.length === 3) {
        r = parseInt(normalized[0] + normalized[0], 16);
        g = parseInt(normalized[1] + normalized[1], 16);
        b = parseInt(normalized[2] + normalized[2], 16);
    } else if (normalized.length === 6) {
        r = parseInt(normalized.slice(0, 2), 16);
        g = parseInt(normalized.slice(2, 4), 16);
        b = parseInt(normalized.slice(4, 6), 16);
    } else {
        return true;
    }

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.58;
}

export type SetkaHeroTheme = "light" | "dark";

export function getSetkaHeroTheme(accentHex: string, hasBackgroundImage: boolean): SetkaHeroTheme {
    if (hasBackgroundImage) {
        return "dark";
    }
    return isSetkaColorDark(accentHex) ? "dark" : "light";
}
