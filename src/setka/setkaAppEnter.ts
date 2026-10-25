/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const STORAGE_KEY = "setka_app_enter_pending";

/** Call when the hello splash finishes so the main UI can zoom in. */
export function markSetkaAppEnterPending(): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
        /* private mode */
    }
}

export function consumeSetkaAppEnterPending(): boolean {
    try {
        const pending = sessionStorage.getItem(STORAGE_KEY) === "1";
        if (pending) sessionStorage.removeItem(STORAGE_KEY);
        return pending;
    } catch {
        return false;
    }
}

export function runSetkaAppEnterAnimation(): void {
    const root = document.documentElement;
    root.classList.add("mx_SetkaAppEntering");
    window.setTimeout(() => root.classList.remove("mx_SetkaAppEntering"), 920);
}
