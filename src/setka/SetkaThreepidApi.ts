/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedJsonRequest } from "./setkaHttp";

export type SetkaThreepidMedium = "email" | "msisdn";

export interface SetkaBoundThreepid {
    medium: SetkaThreepidMedium;
    address: string;
}

export function newClientSecret(): string {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** "+7 (999) 123-45-67" / "8 999 ..." / "9991234567" -> "+79991234567", or null if it is not a phone. */
export function normalizeSetkaPhone(input: string): string | null {
    const trimmed = input.trim();
    let digits = trimmed.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return null;
    if (!trimmed.startsWith("+")) {
        if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
        else if (digits.length === 10) digits = "7" + digits;
    }
    return "+" + digits;
}

export async function listSetkaThreepids(client: MatrixClient): Promise<SetkaBoundThreepid[]> {
    const res = await client.getThreePids();
    return (res.threepids ?? [])
        .filter((t) => t.medium === "email" || t.medium === "msisdn")
        .map((t) => ({ medium: t.medium as SetkaThreepidMedium, address: t.address }));
}

/** Sends a 6-digit code to the e-mail. Resolves with the validation session id. */
export async function requestSetkaEmailCode(client: MatrixClient, email: string, secret: string): Promise<string> {
    const res = await setkaAuthedJsonRequest<{ sid: string }>(client, Method.Post, "/setka/3pid/email/requestToken", {
        email,
        client_secret: secret,
        send_attempt: 1,
    });
    return res.sid;
}

export async function confirmSetkaEmailCode(
    client: MatrixClient,
    sid: string,
    secret: string,
    token: string,
): Promise<void> {
    await setkaAuthedJsonRequest(client, Method.Post, "/setka/3pid/email/submit_token", {
        sid,
        client_secret: secret,
        token,
    });
}

/** Phone numbers are confirmed with a code that is delivered by e-mail (no SMS). */
export async function requestSetkaPhoneCode(
    client: MatrixClient,
    phone: string,
    email: string,
    secret: string,
): Promise<string> {
    const res = await setkaAuthedJsonRequest<{ sid: string }>(
        client,
        Method.Post,
        "/setka/3pid/msisdn/requestTokenEmail",
        { phone_number: phone, email, client_secret: secret, send_attempt: 1 },
    );
    return res.sid;
}

export async function confirmSetkaPhoneCode(
    client: MatrixClient,
    sid: string,
    secret: string,
    token: string,
): Promise<void> {
    await setkaAuthedJsonRequest(client, Method.Post, "/setka/3pid/msisdn/submit_token", {
        sid,
        client_secret: secret,
        token,
    });
}

export async function unbindSetkaThreepid(
    client: MatrixClient,
    medium: SetkaThreepidMedium,
    address: string,
): Promise<void> {
    await setkaAuthedJsonRequest(client, Method.Post, "/setka/3pid/delete", { medium, address });
}
