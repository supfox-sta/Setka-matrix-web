/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const SETKA_SHARE_BASE = "https://share.setka-matrix.ru/#/";

/** Public share URL for a Matrix room or user id on Setka. */
export function makeSetkaShareLink(matrixId: string): string {
    return `${SETKA_SHARE_BASE}${matrixId}`;
}
