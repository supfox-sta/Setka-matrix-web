/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import Field from "../components/views/elements/Field";
import Modal from "../Modal";
import { openSetkaBotCredentialsDialog } from "./SetkaBotCredentialsDialog";
import {
    createSetkaBot,
    getSetkaBotCommands,
    getSetkaBotReplyMarkup,
    setSetkaBotCommands,
    setSetkaBotReplyMarkup,
    type SetkaBotSummary,
    updateSetkaBot,
} from "./SetkaBotsApi";

export type SetkaBotCreatorMode = "create" | "edit";

interface Props {
    client: MatrixClient;
    mode: SetkaBotCreatorMode;
    bot?: SetkaBotSummary | null;
    onSaved?: () => void;
    onFinished: () => void;
}

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{1,30}[a-z0-9]$/;

function parseCommandsText(text: string): Array<{ command: string; description: string }> {
    const commands: Array<{ command: string; description: string }> = [];
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [command, ...rest] = trimmed.split(/\s+/);
        commands.push({
            command: command.replace(/^\//, ""),
            description: rest.join(" ").trim(),
        });
    }
    return commands;
}

function formatCommandsText(commands: Array<{ command: string; description: string }>): string {
    return commands.map((item) => `/${item.command} ${item.description}`.trim()).join("\n");
}

const SetkaBotCreatorDialog: React.FC<Props> = ({ client, mode, bot = null, onSaved, onFinished }) => {
    const [username, setUsername] = useState(bot?.username ?? "");
    const [displayName, setDisplayName] = useState(bot?.display_name ?? "");
    const [webhookUrl, setWebhookUrl] = useState(bot?.webhook_url ?? "");
    const [commandsText, setCommandsText] = useState("");
    const [keyboardJson, setKeyboardJson] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdCredentials, setCreatedCredentials] = useState<{
        bot: SetkaBotSummary;
        token: string;
        matrix_user?: string;
        matrix_password?: string;
    } | null>(null);

    const isCreate = mode === "create";
    const title = isCreate ? _t("setka|bot_creator|create_title") : _t("setka|bot_creator|edit_title");

    useEffect(() => {
        if (!bot || isCreate) return;
        let cancelled = false;
        void (async () => {
            try {
                const [commands, markup] = await Promise.all([
                    getSetkaBotCommands(client, bot.bot_id),
                    getSetkaBotReplyMarkup(client, bot.bot_id),
                ]);
                if (cancelled) return;
                setCommandsText(formatCommandsText(commands));
                setKeyboardJson(markup ? JSON.stringify(markup, null, 2) : "");
            } catch (e) {
                logger.warn("Failed to load bot editor data", e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [bot, client, isCreate]);

    const onSubmit = useCallback(async () => {
        const trimmedName = displayName.trim();
        if (!trimmedName) {
            setError(_t("setka|bot_creator|display_name_required"));
            return;
        }

        if (isCreate) {
            const trimmedUsername = username.trim().toLowerCase().replace(/_bot$/, "");
            if (!USERNAME_PATTERN.test(trimmedUsername)) {
                setError(_t("setka|bot_creator|username_invalid"));
                return;
            }
            setBusy(true);
            setError(null);
            try {
                const created = await createSetkaBot(client, trimmedUsername, trimmedName);
                setCreatedCredentials(created);
                onSaved?.();
                openSetkaBotCredentialsDialog({
                    title: _t("setka|bot_creator|credentials_title"),
                    client,
                    botUserId: created.bot.bot_user_id,
                    apiToken: created.token,
                    matrixUser: created.matrix_user,
                    matrixPassword: created.matrix_password,
                    botcreatorService: created.bot.username === "bottool",
                });
            } catch (e) {
                logger.warn("Failed to create Setka bot", e);
                setError(_t("setka|bot_creator|create_error"));
            } finally {
                setBusy(false);
            }
            return;
        }

        if (!bot) return;
        setBusy(true);
        setError(null);
        try {
            await updateSetkaBot(client, bot.bot_id, {
                display_name: trimmedName,
                webhook_url: webhookUrl.trim() || null,
            });
            const commands = parseCommandsText(commandsText);
            await setSetkaBotCommands(client, bot.bot_id, commands);
            if (keyboardJson.trim()) {
                const markup = JSON.parse(keyboardJson) as Record<string, unknown>;
                await setSetkaBotReplyMarkup(client, bot.bot_id, markup);
            } else {
                await setSetkaBotReplyMarkup(client, bot.bot_id, null);
            }
            onSaved?.();
            onFinished();
        } catch (e) {
            logger.warn("Failed to update Setka bot", e);
            setError(_t("setka|bot_creator|save_error"));
        } finally {
            setBusy(false);
        }
    }, [bot, client, commandsText, displayName, isCreate, keyboardJson, onFinished, onSaved, username, webhookUrl]);

    const domain = client.getDomain() ?? "matrix.setka-matrix.ru";

    return (
        <BaseDialog
            className="mx_SetkaBotCreatorDialog mx_UserSettingsDialog"
            onFinished={onFinished}
            title={title}
            titleClass="mx_UserSettingsDialog_title"
            fixedWidth={false}
        >
            <div className="mx_SetkaBotCreatorDialog_body">
                {createdCredentials ? (
                    <>
                        <p className="mx_SetkaBotCreatorDialog_success">{_t("setka|bot_creator|created_success")}</p>
                        <p className="mx_SetkaBotCreatorDialog_hint">{_t("setka|bot_creator|credentials_intro")}</p>
                        <div className="mx_SetkaBotCreatorDialog_actions">
                            <AccessibleButton
                                kind="primary"
                                onClick={() => {
                                    openSetkaBotCredentialsDialog({
                                        title: _t("setka|bot_creator|credentials_title"),
                                        client,
                                        botUserId: createdCredentials.bot.bot_user_id,
                                        apiToken: createdCredentials.token,
                                        matrixUser: createdCredentials.matrix_user,
                                        matrixPassword: createdCredentials.matrix_password,
                                        botcreatorService: createdCredentials.bot.username === "bottool",
                                    });
                                }}
                            >
                                {_t("setka|bot_creator|show_credentials")}
                            </AccessibleButton>
                            <AccessibleButton kind="secondary" onClick={onFinished}>
                                {_t("action|done")}
                            </AccessibleButton>
                        </div>
                    </>
                ) : (
                    <>
                        {isCreate && (
                            <>
                                <Field
                                    element="input"
                                    type="text"
                                    label={_t("setka|bot_creator|username_label")}
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    autoComplete="off"
                                />
                                <p className="mx_SetkaBotCreatorDialog_hint">
                                    {_t("setka|bot_creator|username_hint", { domain })}
                                </p>
                            </>
                        )}
                        {!isCreate && bot && (
                            <p className="mx_SetkaBotCreatorDialog_meta">{bot.bot_user_id}</p>
                        )}
                        <Field
                            element="input"
                            type="text"
                            label={_t("setka|bot_creator|display_name_label")}
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                        />
                        {!isCreate && (
                            <>
                                <Field
                                    element="input"
                                    type="url"
                                    label={_t("setka|bot_creator|webhook_label")}
                                    value={webhookUrl}
                                    onChange={(event) => setWebhookUrl(event.target.value)}
                                    autoComplete="off"
                                />
                                <Field
                                    element="textarea"
                                    label={_t("setka|bot_creator|commands_label")}
                                    value={commandsText}
                                    onChange={(event) => setCommandsText(event.target.value)}
                                />
                                <p className="mx_SetkaBotCreatorDialog_hint">{_t("setka|bot_creator|commands_hint")}</p>
                                <Field
                                    element="textarea"
                                    label={_t("setka|bot_creator|keyboard_label")}
                                    value={keyboardJson}
                                    onChange={(event) => setKeyboardJson(event.target.value)}
                                />
                                <p className="mx_SetkaBotCreatorDialog_hint">{_t("setka|bot_creator|keyboard_hint")}</p>
                            </>
                        )}
                        {error && <p className="mx_SetkaBotCreatorDialog_error">{error}</p>}
                        <div className="mx_SetkaBotCreatorDialog_actions">
                            <AccessibleButton kind="primary" onClick={() => void onSubmit()} disabled={busy}>
                                {isCreate ? _t("setka|bot_creator|create_button") : _t("action|save")}
                            </AccessibleButton>
                        </div>
                    </>
                )}
            </div>
        </BaseDialog>
    );
};

export function openSetkaBotCreatorDialog(
    client: MatrixClient,
    options: {
        mode: SetkaBotCreatorMode;
        bot?: SetkaBotSummary | null;
        onSaved?: () => void;
    },
): void {
    Modal.createDialog(
        SetkaBotCreatorDialog,
        {
            client,
            mode: options.mode,
            bot: options.bot ?? null,
            onSaved: options.onSaved,
        },
        "mx_SetkaBotCreatorDialog_wrapper",
        false,
        true,
    );
}

export default SetkaBotCreatorDialog;
