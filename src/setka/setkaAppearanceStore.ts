/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { EventEmitter } from "events";

const STORAGE_KEY = "setka.appearance.v1";

export interface SetkaAppearanceSettings {
    /** Panel glass opacity, 12–48 (maps to alpha). */
    glassOpacity: number;
    /** Backdrop blur in px, 0–24. */
    blurPx: number;
    /** Accent color (hex). */
    accentColor: string;
    /** Panel / left sidebar tint (hex). */
    interfaceColor: string;
    /** When false, panels use solid surfaces without blur. */
    glassEnabled: boolean;
}

export const SETKA_APPEARANCE_DEFAULTS: SetkaAppearanceSettings = {
    glassOpacity: 28,
    blurPx: 12,
    accentColor: "#e53935",
    interfaceColor: "#2c2c34",
    glassEnabled: true,
};

export const SETKA_INTERFACE_PRESETS = [
    "#2c2c34",
    "#1a1a22",
    "#3d3d48",
    "#1e2a3a",
    "#2a2420",
    "#ffffff",
] as const;

export const SETKA_APPEARANCE_CHANGED = "changed";

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeHex(color: string, fallback: string): string {
    const trimmed = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
    return fallback;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace("#", "");
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function darken({ r, g, b }: { r: number; g: number; b: number }, amount: number): string {
    return `rgb(${Math.max(0, r - amount)} ${Math.max(0, g - amount)} ${Math.max(0, b - amount)})`;
}

function buildInterfaceGradients(
    interfaceColor: string,
    glassOpacity: number,
    glassEnabled: boolean,
): { dark: string; light: string } {
    const alpha = glassEnabled ? glassOpacity / 100 : 0.92;
    const alpha2 = alpha * 0.78;
    const { r, g, b } = parseHex(interfaceColor);
    const base = `rgb(${r} ${g} ${b})`;
    const darkStop2 = darken({ r, g, b }, 14);

    return {
        dark: `linear-gradient(155deg, ${base} / ${alpha}), ${darkStop2} / ${alpha2})`,
        light: `linear-gradient(155deg, rgb(255 255 255 / ${Math.min(0.88, alpha + 0.5)}), ${base} / ${Math.min(0.42, alpha * 0.55)})`,
    };
}

export function readSetkaAppearance(): SetkaAppearanceSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...SETKA_APPEARANCE_DEFAULTS };
        const parsed = JSON.parse(raw) as Partial<SetkaAppearanceSettings>;
        return {
            glassOpacity: clamp(Number(parsed.glassOpacity) || SETKA_APPEARANCE_DEFAULTS.glassOpacity, 12, 48),
            blurPx: clamp(Number(parsed.blurPx) || SETKA_APPEARANCE_DEFAULTS.blurPx, 0, 24),
            accentColor: normalizeHex(parsed.accentColor ?? SETKA_APPEARANCE_DEFAULTS.accentColor, SETKA_APPEARANCE_DEFAULTS.accentColor),
            interfaceColor: normalizeHex(
                parsed.interfaceColor ?? SETKA_APPEARANCE_DEFAULTS.interfaceColor,
                SETKA_APPEARANCE_DEFAULTS.interfaceColor,
            ),
            glassEnabled: parsed.glassEnabled !== false,
        };
    } catch {
        return { ...SETKA_APPEARANCE_DEFAULTS };
    }
}

export function writeSetkaAppearance(settings: SetkaAppearanceSettings): void {
    const normalized: SetkaAppearanceSettings = {
        glassOpacity: clamp(settings.glassOpacity, 12, 48),
        blurPx: clamp(settings.blurPx, 0, 24),
        accentColor: normalizeHex(settings.accentColor, SETKA_APPEARANCE_DEFAULTS.accentColor),
        interfaceColor: normalizeHex(settings.interfaceColor, SETKA_APPEARANCE_DEFAULTS.interfaceColor),
        glassEnabled: settings.glassEnabled !== false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setkaAppearanceStore.emit(SETKA_APPEARANCE_CHANGED, normalized);
}

export function applySetkaAppearanceToDocument(settings: SetkaAppearanceSettings): void {
    const root = document.documentElement;
    const alpha = settings.glassOpacity / 100;
    root.style.setProperty("--setka-glass-alpha", String(alpha));
    root.style.setProperty("--setka-glass-alpha-2", String(alpha * 0.78));
    root.style.setProperty("--setka-blur-strength", `${settings.blurPx}px`);
    root.style.setProperty("--setka-accent-user", settings.accentColor);
    root.style.setProperty("--setka-interface-color", settings.interfaceColor);
    root.style.setProperty("--setka-interface-solid", settings.interfaceColor);

    const gradients = buildInterfaceGradients(settings.interfaceColor, settings.glassOpacity, settings.glassEnabled);
    root.style.setProperty("--setka-leftpanel-glass-bg", gradients.dark);
    root.style.setProperty("--setka-leftpanel-glass-bg-light", gradients.light);

    const isLightTone = root.dataset.setkaThemeTone === "light";
    root.style.setProperty("--setka-panel-bubble-bg", isLightTone ? gradients.light : gradients.dark);
    root.style.setProperty(
        "--setka-interface-surface",
        `color-mix(in srgb, ${settings.interfaceColor} 72%, transparent)`,
    );

    root.dataset.setkaBlur = settings.glassEnabled && settings.blurPx > 0 ? "on" : "off";
    root.dataset.setkaGlass = settings.glassEnabled ? "on" : "off";
    if (!settings.glassEnabled) {
        root.style.setProperty("--setka-glass-alpha", "1");
        root.style.setProperty("--setka-glass-alpha-2", "1");
        root.style.setProperty("--setka-blur-strength", "0px");
    }
}

class SetkaAppearanceStore extends EventEmitter {
    public getSettings(): SetkaAppearanceSettings {
        return readSetkaAppearance();
    }

    public setSettings(settings: SetkaAppearanceSettings): void {
        writeSetkaAppearance(settings);
        applySetkaAppearanceToDocument(readSetkaAppearance());
    }
}

export const setkaAppearanceStore = new SetkaAppearanceStore();

export function subscribeSetkaAppearance(listener: (settings: SetkaAppearanceSettings) => void): () => void {
    const handler = (): void => listener(readSetkaAppearance());
    setkaAppearanceStore.on(SETKA_APPEARANCE_CHANGED, handler);
    return () => setkaAppearanceStore.off(SETKA_APPEARANCE_CHANGED, handler);
}
