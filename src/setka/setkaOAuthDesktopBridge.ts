/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { parseAppUrl } from "../vector/url_utils";

const DESKTOP_STATE_MARKERS = ["element-desktop-ssoid", "setka-desktop-ssoid"];
const SETKA_HOST_SUFFIX = "setka-matrix.ru";
const SETKA_DESKTOP_PROTOCOL = "setka";

/**
 * When Setka Desktop opens the system browser for OAuth, MAS redirects to the HTTPS
 * web callback. This bridge forwards the auth code into the desktop app via setka://
 */
export function maybeRedirectSetkaDesktopOAuth(): boolean {
    if (window.electron) {
        return false;
    }

    if (!window.location.hostname.endsWith(SETKA_HOST_SUFFIX)) {
        return false;
    }

    const { params } = parseAppUrl(window.location);
    const oauth2 = params.oauth2;
    if (!oauth2?.code || !oauth2.state) {
        return false;
    }

    const state = String(oauth2.state);
    if (!DESKTOP_STATE_MARKERS.some((marker) => state.includes(marker))) {
        return false;
    }

    const target = `${SETKA_DESKTOP_PROTOCOL}:/vector/webapp/?no_universal_links=true${window.location.hash}`;
    window.location.replace(target);
    return true;
}
