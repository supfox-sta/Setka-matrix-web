/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type OAuth2, type ValidatedAuthMetadata } from "matrix-js-sdk/src/matrix";

import PlatformPeg from "../../PlatformPeg.ts";

const clientIdLocalStorageKey = "mx_oidc_client_id";
const stateSessionStorageKey = "mx_oauth_state";

function isElectronDesktop(): boolean {
    return Boolean(window.electron);
}

/**
 * Clear temporary OAuth login context.
 */
export function clearAuthContext(): void {
    sessionStorage.removeItem(stateSessionStorageKey);
    if (isElectronDesktop()) {
        localStorage.removeItem(stateSessionStorageKey);
    }
}

/**
 * Persists OAuth2 clientId in local storage
 * Only set after successful authentication
 * @param clientId
 */
export const persistOAuthClientId = (clientId: string): void => {
    localStorage.setItem(clientIdLocalStorageKey, clientId);
};

/**
 * Retrieves stored oauth client id from local storage.
 * The presence of a client ID in storage implies that the user is authenticated via OAuth.
 * @returns clientId
 * @throws when clientId is not found in local storage
 */
export const getStoredOAuthClientId = (): string => {
    const clientId = localStorage.getItem(clientIdLocalStorageKey);
    if (!clientId) {
        throw new Error("OAuth client ID not found in storage");
    }
    return clientId;
};

type OAuth2Context = ConstructorParameters<typeof OAuth2>[1];

/**
 * Utility function to get the OAuth parameters needed to construct an OAuth2 instance
 * @param clientId - the registered OAuth client ID
 */
export function getOAuthParams(clientId: string): OAuth2Context {
    return { clientId };
}

/**
 * Temporary context for authorization code flow
 * Persisted via sessionStorage to be recalled when authentication navigates the tab away and back again
 */
export interface Context {
    /** The state string we included in the auth url */
    state: string;
    /** The URL of the homeserver the user is logging into */
    homeserverUrl: string;
    /** The URL of the identity server the user is using */
    identityServerUrl: string | undefined;
    /** The metadata received from {@link MatrixClient.getAuthMetadata} at time of initiating the auth dance */
    metadata: ValidatedAuthMetadata;
    /** The context needed for the SDK's OAuth2 to resume the auth flow */
    authContext: Required<OAuth2Context>;
}

/**
 * Retrieve the context of the ongoing authorization code flow.
 * On Electron, localStorage is used as well because sessionStorage is lost when
 * the app reloads via setka:// deeplink after OAuth in the system browser.
 */
export function loadAuthContext(): Context | null {
    let value = sessionStorage.getItem(stateSessionStorageKey);
    if (!value && isElectronDesktop()) {
        value = localStorage.getItem(stateSessionStorageKey);
        if (value) {
            sessionStorage.setItem(stateSessionStorageKey, value);
        }
    }
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value) as Context;
    } catch {
        return null;
    }
}

/**
 * Temporary storage for the authorization code flow
 * @param context - the data to store in sessionStorage
 */
export function storeAuthContext(context: Context): void {
    const serialized = JSON.stringify(context);
    sessionStorage.setItem(stateSessionStorageKey, serialized);
    if (isElectronDesktop()) {
        localStorage.setItem(stateSessionStorageKey, serialized);
    }
}
