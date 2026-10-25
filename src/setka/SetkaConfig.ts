/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import SdkConfig from "../SdkConfig";

import "./setkaI18nBootstrap";

const SETKA_SERVER_SUFFIX = "setka-matrix.ru";

/** When false, theme picker UI is hidden on Setka builds (logic/settings remain). */
/** Temporarily forced off everywhere — flip to true (and remove UI comments) to restore. */
export const SETKA_SHOW_THEME_UI = false;

/** True when the active session or deployment targets Setka Matrix. */
export function isSetkaHomeserver(client?: MatrixClient | null): boolean {
    const domain = client?.getDomain()?.toLowerCase();
    if (domain && (domain === SETKA_SERVER_SUFFIX || domain.endsWith(`.${SETKA_SERVER_SUFFIX}`))) {
        return true;
    }

    const configuredName = SdkConfig.get("default_server_config")?.["m.homeserver"]?.server_name?.toLowerCase();
    if (configuredName && (configuredName === SETKA_SERVER_SUFFIX || configuredName.endsWith(`.${SETKA_SERVER_SUFFIX}`))) {
        return true;
    }

    const baseUrl = SdkConfig.get("default_server_config")?.["m.homeserver"]?.base_url?.toLowerCase() ?? "";
    return baseUrl.includes("setka-matrix.ru");
}
