/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import {
    type MatrixClient,
    OAUTH_AWARE_PREFERRED_FLOW_FIELD,
    SSOAction,
    type SSOFlow,
    type ValidatedAuthMetadata,
} from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import PlatformPeg from "../PlatformPeg";
import SdkConfig from "../SdkConfig";
import { startOAuthLogin } from "../utils/oauth/authorize";
import { getOAuthClientId } from "../utils/oauth/registerClient";
import { isSetkaHomeserver } from "./SetkaConfig";
import { showSetkaOAuthError } from "./setkaOAuthErrors";

/**
 * Start login/registration for Setka homeservers.
 * MSC3824 SSO flows must use MAS (OIDC), not legacy Synapse /login/sso/redirect.
 */
export async function startSetkaDelegatedAuth(options: {
    matrixClient: MatrixClient;
    flow?: SSOFlow;
    hsUrl: string;
    isUrl?: string;
    delegatedAuthentication?: ValidatedAuthMetadata;
    loginType?: "sso" | "cas";
    fragmentAfterLogin?: string;
    idpId?: string;
    action?: SSOAction;
}): Promise<void> {
    const { matrixClient, flow, hsUrl, isUrl, delegatedAuthentication, loginType = "sso", action } = options;
    const isRegistration = action === SSOAction.REGISTER;

    const shouldUseOAuth =
        delegatedAuthentication &&
        isSetkaHomeserver(matrixClient) &&
        (!flow || OAUTH_AWARE_PREFERRED_FLOW_FIELD.findIn(flow));

    if (shouldUseOAuth) {
        try {
            const clientId = await getOAuthClientId(delegatedAuthentication, SdkConfig.get().oidc_static_clients);
            await startOAuthLogin(delegatedAuthentication, clientId, hsUrl, isUrl, isRegistration);
            return;
        } catch (error) {
            logger.error("Setka delegated OAuth failed", error);
            showSetkaOAuthError(error);
            throw error;
        }
    }

    PlatformPeg.get()?.startSingleSignOn(
        matrixClient,
        loginType,
        options.fragmentAfterLogin,
        options.idpId,
        action,
    );
}
