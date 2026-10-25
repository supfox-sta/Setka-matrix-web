/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedJsonRequest } from "./setkaHttp";

export type SetkaVisibility = "everyone" | "contacts" | "nobody";

export interface SetkaPrivacy {
    discoverable_email: boolean;
    discoverable_msisdn: boolean;
    email_visibility: SetkaVisibility;
    phone_visibility: SetkaVisibility;
    last_seen_visibility: SetkaVisibility;
    call_visibility: SetkaVisibility;
}

function parseVisibility(value: unknown): SetkaVisibility {
    if (value === "contacts" || value === "nobody") return value;
    return "everyone";
}

function parsePrivacy(data: Record<string, unknown>): SetkaPrivacy {
    return {
        discoverable_email: Boolean(data.discoverable_email ?? true),
        discoverable_msisdn: Boolean(data.discoverable_msisdn ?? true),
        email_visibility: parseVisibility(data.email_visibility),
        phone_visibility: parseVisibility(data.phone_visibility),
        last_seen_visibility: parseVisibility(data.last_seen_visibility),
        call_visibility: parseVisibility(data.call_visibility),
    };
}

export async function fetchSetkaPrivacy(client: MatrixClient, userId: string): Promise<SetkaPrivacy> {
    const data = await setkaAuthedJsonRequest<Record<string, unknown>>(
        client,
        Method.Get,
        `/user/${encodeURIComponent(userId)}/setka_privacy`,
    );
    return parsePrivacy(data);
}

export async function saveSetkaPrivacy(
    client: MatrixClient,
    userId: string,
    patch: Partial<SetkaPrivacy>,
): Promise<SetkaPrivacy> {
    const data = await setkaAuthedJsonRequest<Record<string, unknown>>(
        client,
        Method.Put,
        `/user/${encodeURIComponent(userId)}/setka_privacy`,
        patch,
    );
    return parsePrivacy(data);
}
