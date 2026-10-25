/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import Modal from "../Modal";
import ErrorDialog from "../components/views/dialogs/ErrorDialog";
import { getOAuthErrorMessage } from "../utils/oauth/error";
import { OAuth2Error } from "matrix-js-sdk/src/matrix";
import { _t } from "../languageHandler";

export function showSetkaOAuthError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    let description = getOAuthErrorMessage(err);

    if (err.message === OAuth2Error.DynamicRegistrationFailed) {
        description =
            "Не удалось зарегистрировать OAuth-клиент. Для десктопа нужен client_id в config.json (oidc_static_clients).";
    }

    Modal.createDialog(ErrorDialog, {
        title: _t("auth|oidc|generic_auth_error"),
        description,
    });
}
