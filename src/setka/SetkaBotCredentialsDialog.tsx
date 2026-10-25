/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useMemo } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import CopyableText from "../components/views/elements/CopyableText";
import Modal from "../Modal";
import {
    formatSetkaBotCreatorEnvFile,
    formatSetkaBotEnvFile,
    formatSetkaBotPythonQuickstart,
    type SetkaBotCredentials,
} from "./setkaBotDevUtils";

interface Props {
    title: string;
    credentials: SetkaBotCredentials;
    /** Show /etc/setka-botcreator.env block for @botcreator service */
    botcreatorService?: boolean;
    onFinished: () => void;
}

function CredentialRow({ label, value }: { label: string; value: string }): React.ReactElement {
    return (
        <CopyableText getTextToCopy={() => value}>
            <div className="mx_SetkaBotCredentialsDialog_row">
                <span className="mx_SetkaBotCredentialsDialog_label">{label}</span>
                <code className="mx_SetkaBotCredentialsDialog_value">{value}</code>
            </div>
        </CopyableText>
    );
}

const SetkaBotCredentialsDialog: React.FC<Props> = ({
    title,
    credentials,
    botcreatorService = false,
    onFinished,
}) => {
    const envText = useMemo(
        () =>
            botcreatorService
                ? formatSetkaBotCreatorEnvFile(credentials)
                : formatSetkaBotEnvFile(credentials),
        [botcreatorService, credentials],
    );
    const pythonText = useMemo(() => formatSetkaBotPythonQuickstart(credentials), [credentials]);

    return (
        <BaseDialog
            className="mx_SetkaBotCredentialsDialog"
            onFinished={onFinished}
            title={title}
            fixedWidth={false}
        >
            <div className="mx_SetkaBotCredentialsDialog_body">
                <p className="mx_SetkaBotCredentialsDialog_hint">
                    {_t("setka|bot_creator|credentials_once_hint")}
                </p>
                <CredentialRow label={_t("setka|bot_creator|mxid_label")} value={credentials.botUserId} />
                {credentials.apiToken && (
                    <CredentialRow label={_t("setka|bot_creator|token_label")} value={credentials.apiToken} />
                )}
                {credentials.matrixUser && credentials.matrixPassword && (
                    <>
                        <CredentialRow
                            label={_t("setka|bot_creator|matrix_user_label")}
                            value={credentials.matrixUser}
                        />
                        <CredentialRow
                            label={_t("setka|bot_creator|matrix_password_label")}
                            value={credentials.matrixPassword}
                        />
                    </>
                )}
                <p className="mx_SetkaBotCredentialsDialog_section">{_t("setka|bot_creator|env_file_label")}</p>
                <CopyableText getTextToCopy={() => envText}>
                    <pre className="mx_SetkaBotCredentialsDialog_pre">{envText}</pre>
                </CopyableText>
                <p className="mx_SetkaBotCredentialsDialog_section">{_t("setka|bot_creator|python_snippet_label")}</p>
                <CopyableText getTextToCopy={() => pythonText}>
                    <pre className="mx_SetkaBotCredentialsDialog_pre mx_SetkaBotCredentialsDialog_pre_code">
                        {pythonText}
                    </pre>
                </CopyableText>
                <div className="mx_SetkaBotCredentialsDialog_actions">
                    <AccessibleButton kind="primary" onClick={onFinished}>
                        {_t("action|done")}
                    </AccessibleButton>
                </div>
            </div>
        </BaseDialog>
    );
};

export function openSetkaBotCredentialsDialog(
    options: {
        title: string;
        client: MatrixClient;
        botUserId: string;
        apiToken?: string;
        matrixUser?: string;
        matrixPassword?: string;
        botcreatorService?: boolean;
    },
): void {
    const homeserver = options.client.getHomeserverUrl() ?? `https://${options.client.getDomain()}`;
    Modal.createDialog(
        SetkaBotCredentialsDialog,
        {
            title: options.title,
            credentials: {
                homeserver,
                botUserId: options.botUserId,
                apiToken: options.apiToken,
                matrixUser: options.matrixUser,
                matrixPassword: options.matrixPassword,
            },
            botcreatorService: options.botcreatorService,
        },
        "mx_SetkaBotCredentialsDialog_wrapper",
        false,
        true,
    );
}

export default SetkaBotCredentialsDialog;
