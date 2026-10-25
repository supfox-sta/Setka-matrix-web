/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, MatrixError, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedRequest } from "./setkaHttp";

export interface SetkaSKeyBackupState {
    /** Server account-data flag from /setka/login/status */
    enabled: boolean;
    /** Key material from /recovery/fetch when readable */
    recoveryKey: string;
    /** Fetch failed (e.g. corrupt legacy backup cleared server-side) */
    fetchFailed: boolean;
}

export interface SetkaLoginStatus {
    required: boolean;
    verified: boolean;
    ip: string;
    region: string;
    expiresAt: number;
    emailAvailable: boolean;
    emailHint: string;
    recoveryBackupAvailable: boolean;
}

interface StatusResponse {
    required?: boolean;
    verified?: boolean;
    ip?: string;
    region?: string;
    expires_at?: number;
    email_available?: boolean;
    email_hint?: string;
    recovery_backup_available?: boolean;
}

interface FetchRecoveryResponse {
    available?: boolean;
    recovery_key?: string;
}

interface StoreRecoveryResponse {
    stored?: boolean;
}

interface DeleteRecoveryResponse {
    deleted?: boolean;
}

interface FallbackResponse {
    verified?: boolean;
    method?: string;
    recovery_backup_available?: boolean;
}

export async function getSetkaLoginStatus(client: MatrixClient): Promise<SetkaLoginStatus> {
    const data = await setkaAuthedRequest<StatusResponse>(client, Method.Post, "/setka/login/status", {});
    return {
        required: Boolean(data.required),
        verified: Boolean(data.verified),
        ip: data.ip ?? "",
        region: data.region ?? "",
        expiresAt: data.expires_at ?? 0,
        emailAvailable: Boolean(data.email_available),
        emailHint: data.email_hint ?? "",
        recoveryBackupAvailable: Boolean(data.recovery_backup_available),
    };
}

export async function completeSetkaLoginFallback(
    client: MatrixClient,
    method: "emoji" | "recovery_key",
    recoveryKey?: string,
): Promise<boolean> {
    const body: Record<string, string> = { method };
    if (method === "recovery_key" && recoveryKey?.trim()) {
        body.recovery_key = recoveryKey.trim();
    }
    const data = await setkaAuthedRequest<FallbackResponse>(
        client,
        Method.Post,
        "/setka/login/complete_fallback",
        body,
    );
    return Boolean(data.verified);
}

export async function fetchSetkaRecoveryKey(client: MatrixClient): Promise<{ available: boolean; recoveryKey: string }> {
    try {
        const data = await setkaAuthedRequest<FetchRecoveryResponse>(
            client,
            Method.Post,
            "/setka/login/recovery/fetch",
            {},
        );
        return {
            available: Boolean(data.available),
            recoveryKey: data.recovery_key ?? "",
        };
    } catch (error) {
        // Legacy/corrupt server backup used to return 500 — treat as missing so UI can re-enable.
        if (error instanceof MatrixError && (error.httpStatus === 500 || error.httpStatus === 404)) {
            return { available: false, recoveryKey: "" };
        }
        throw error;
    }
}

/** Status flag + optional key; never throws on unreadable legacy backup. */
export async function getSetkaSKeyBackupState(client: MatrixClient): Promise<SetkaSKeyBackupState> {
    const status = await getSetkaLoginStatus(client);
    if (!status.recoveryBackupAvailable) {
        return { enabled: false, recoveryKey: "", fetchFailed: false };
    }

    const backup = await fetchSetkaRecoveryKey(client);
    if (backup.available) {
        return { enabled: true, recoveryKey: backup.recoveryKey, fetchFailed: false };
    }

    // Status said backup exists but fetch could not read it (cleared or legacy encrypt).
    return {
        enabled: false,
        recoveryKey: "",
        fetchFailed: true,
    };
}

export async function storeSetkaRecoveryKey(client: MatrixClient, recoveryKey: string): Promise<boolean> {
    const data = await setkaAuthedRequest<StoreRecoveryResponse>(client, Method.Post, "/setka/login/recovery/store", {
        recovery_key: recoveryKey.trim(),
    });
    return Boolean(data.stored);
}

export async function deleteSetkaRecoveryKey(client: MatrixClient): Promise<boolean> {
    const data = await setkaAuthedRequest<DeleteRecoveryResponse>(
        client,
        Method.Post,
        "/setka/login/recovery/delete",
        {},
    );
    return Boolean(data.deleted);
}
