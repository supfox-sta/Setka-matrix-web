/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import SdkConfig from "../SdkConfig";
import ElectronPlatform from "../vector/platform/ElectronPlatform";

/**
 * Setka desktop: OAuth must use the HTTPS redirect URI registered on MAS (web client),
 * not the custom setka:// scheme (MAS rejects native dynamic registration).
 * After login in the system browser, web.setka-matrix.ru redirects back into the app.
 */
export default class SetkaElectronPlatform extends ElectronPlatform {
    public override get defaultOAuthClientUri(): string {
        return SdkConfig.get().oidc_metadata?.client_uri ?? "https://web.setka-matrix.ru";
    }

    public override getOAuthCallbackUrl(): URL {
        const clientUri = SdkConfig.get().oidc_metadata?.client_uri ?? this.defaultOAuthClientUri;
        const url = new URL(clientUri);
        url.search = "";
        url.searchParams.set("no_universal_links", "true");
        return url;
    }
}
