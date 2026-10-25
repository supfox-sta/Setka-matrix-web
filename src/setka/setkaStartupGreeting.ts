/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { _t } from "../languageHandler";

/** Picks a friendly random greeting for the startup splash. */
export function pickSetkaStartupGreeting(displayName: string): string {
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (hour >= 5 && hour < 12) {
        timeGreeting = _t("setka|startup|greeting_morning", { name: displayName });
    } else if (hour >= 12 && hour < 18) {
        timeGreeting = _t("setka|startup|greeting_day", { name: displayName });
    } else if (hour >= 18 && hour < 23) {
        timeGreeting = _t("setka|startup|greeting_evening", { name: displayName });
    } else {
        timeGreeting = _t("setka|startup|greeting_night", { name: displayName });
    }

    const variants = [
        timeGreeting,
        _t("setka|startup|greeting_ready", { name: displayName }),
        _t("setka|startup|greeting_welcome_back", { name: displayName }),
        _t("setka|startup|greeting_on_air", { name: displayName }),
        _t("setka|startup|greeting_happy", { name: displayName }),
    ];

    return variants[Math.floor(Math.random() * variants.length)];
}
