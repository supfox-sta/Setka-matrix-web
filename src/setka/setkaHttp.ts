/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, MatrixError, Method } from "matrix-js-sdk/src/matrix";

type SetkaRequestBody = Record<string, string> | undefined;
type SetkaJsonBody = Record<string, unknown> | undefined;

function isRecoverableAuthError(error: unknown): boolean {
    if (!(error instanceof MatrixError)) return false;
    return error.httpStatus === 401 || error.httpStatus === 403 || error.httpStatus === 404;
}

/**
 * Authenticated homeserver request for Setka custom endpoints.
 * Uses authedRequest so Authorization: Bearer is sent (http.request is unauthenticated).
 */
export async function setkaAuthedRequest<T>(
    client: MatrixClient,
    method: Method,
    path: string,
    body?: SetkaRequestBody,
): Promise<T> {
    if (!client.getAccessToken()) {
        throw new MatrixError({ errcode: "M_MISSING_TOKEN", error: "Missing access token" }, 401);
    }
    return client.http.authedRequest<T>(method, path, undefined, body);
}

/** Authenticated request with JSON object body (analytics batch, etc.). */
export async function setkaAuthedJsonRequest<T>(
    client: MatrixClient,
    method: Method,
    path: string,
    body?: SetkaJsonBody,
): Promise<T> {
    if (!client.getAccessToken()) {
        throw new MatrixError({ errcode: "M_MISSING_TOKEN", error: "Missing access token" }, 401);
    }
    return client.http.authedRequest<T>(method, path, undefined, body);
}

export { isRecoverableAuthError };
