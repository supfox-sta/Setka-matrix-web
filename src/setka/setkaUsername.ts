/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

/** Localpart without leading @ */
export function setkaUsernameFromId(userId: string): string {
    const localpart = userId.split(":")[0];
    return localpart.startsWith("@") ? localpart.slice(1) : localpart;
}

/** Prefer @username for greetings; fall back to display name when no MXID. */
export function setkaGreetingName(client: MatrixClient | null | undefined, userId?: string | null): string {
    if (userId) {
        return `@${setkaUsernameFromId(userId)}`;
    }
    return userId ?? "";
}

export function setkaDisplayNameForUser(
    client: MatrixClient,
    userId: string,
    fallbackDisplayName?: string,
): string {
    const user = client.getUser(userId);
    return user?.displayName ?? fallbackDisplayName ?? `@${setkaUsernameFromId(userId)}`;
}
