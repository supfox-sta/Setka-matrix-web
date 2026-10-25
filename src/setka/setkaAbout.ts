/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

export const SETKA_WEB_CLIENT_NAME = "Сетка Matrix Web";
export const SETKA_WEB_CLIENT_VERSION = "26.09.04";

export type SetkaAboutCardKind = "telegram" | "matrix";

export interface SetkaAboutCard {
    id: string;
    titleKey: string;
    subtitleKey?: string;
    kind: SetkaAboutCardKind;
    url?: string;
    matrixUserId?: string;
}

export const SETKA_ABOUT_CARDS: SetkaAboutCard[] = [
    {
        id: "telegram",
        titleKey: "setka|about|telegram_title",
        kind: "telegram",
        url: "https://t.me/vsetke_fun",
    },
    {
        id: "kozlik",
        titleKey: "setka|about|kozlik_title",
        subtitleKey: "setka|about|kozlik_subtitle",
        kind: "matrix",
        matrixUserId: "@kozlik:matrix.setka-matrix.ru",
    },
    {
        id: "evxrst",
        titleKey: "setka|about|evxrst_title",
        subtitleKey: "setka|about|evxrst_subtitle",
        kind: "matrix",
        matrixUserId: "@evxrst:matrix.setka-matrix.ru",
    },
];
