/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { registerTranslations } from "@element-hq/web-shared-components";

import enStrings from "../i18n/strings/en_EN.json";
import ruStrings from "../i18n/strings/ru.json";

/**
 * Bundle core locale strings in the main JS so UI never shows raw keys like "action|continue"
 * when async i18n fetch is slow or fails. Async setLanguage() still loads hashed files later.
 */
function bootstrapSetkaI18n(): void {
    registerTranslations("en", enStrings as Record<string, unknown>);
    registerTranslations("ru", ruStrings as Record<string, unknown>);
}

bootstrapSetkaI18n();
