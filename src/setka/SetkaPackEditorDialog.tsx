/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useRef, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import PlusIcon from "@vector-im/compound-design-tokens/assets/web/icons/plus";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import Field from "../components/views/elements/Field";
import InlineSpinner from "../components/views/elements/InlineSpinner";
import QuestionDialog from "../components/views/dialogs/QuestionDialog";
import Modal from "../Modal";
import { mediaFromMxc } from "../customisations/Media";
import {
    addSetkaPackSticker,
    createSetkaPackShareLink,
    createSetkaStickerPack,
    deleteSetkaPack,
    removeSetkaPackSticker,
    saveSetkaStickerPack,
} from "./setkaPackEditorApi";
import { uploadSetkaPackSticker } from "./setkaPackMedia";
import { type SetkaPackKind, type SetkaStickerPack } from "./setkaStickerPacks";

interface Props {
    client: MatrixClient;
    kind?: SetkaPackKind;
    pack?: SetkaStickerPack | null;
    onSaved?: () => void;
    onFinished: () => void;
}

const SetkaPackEditorDialog: React.FC<Props> = ({ client, kind = "sticker", pack: initialPack = null, onSaved, onFinished }) => {
    const userId = client.getUserId()!;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pack, setPack] = useState<SetkaStickerPack | null>(initialPack);
    const [name, setName] = useState(initialPack?.name ?? "");
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isCreate = !pack;
    const title = isCreate ? _t("setka|pack_editor|create_title") : _t("setka|pack_editor|edit_title");

    const onSave = useCallback(async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError(_t("setka|pack_editor|name_required"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            if (pack) {
                await saveSetkaStickerPack(client, userId, { ...pack, name: trimmed, kind });
            } else {
                const created = await createSetkaStickerPack(client, userId, trimmed, kind);
                setPack(created);
            }
            onSaved?.();
            if (!pack) {
                // Stay open after create so user can add stickers.
                return;
            }
            onFinished();
        } catch (e) {
            logger.warn("Failed to save sticker pack", e);
            setError(_t("setka|pack_editor|save_error"));
        } finally {
            setBusy(false);
        }
    }, [client, kind, name, onFinished, onSaved, pack, userId]);

    const onPickFiles = useCallback(() => {
        if (!pack || busy || uploading) return;
        fileInputRef.current?.click();
    }, [busy, pack, uploading]);

    const onFilesSelected = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            event.target.value = "";
            if (!pack || !files?.length) return;
            setUploading(true);
            setError(null);
            try {
                let nextPack = pack;
                for (const file of Array.from(files)) {
                    const sticker = await uploadSetkaPackSticker(client, file, kind);
                    nextPack = await addSetkaPackSticker(client, userId, nextPack, sticker);
                }
                setPack(nextPack);
                onSaved?.();
            } catch (e) {
                logger.warn("Failed to upload pack media", e);
                setError(_t("setka|pack_editor|upload_error"));
            } finally {
                setUploading(false);
            }
        },
        [client, kind, onSaved, pack, userId],
    );

    const onDeleteSticker = useCallback(
        async (stickerId: string) => {
            if (!pack || busy) return;
            setBusy(true);
            setError(null);
            try {
                const nextPack = await removeSetkaPackSticker(client, userId, pack, stickerId);
                setPack(nextPack);
                onSaved?.();
            } catch (e) {
                logger.warn("Failed to delete sticker from pack", e);
                setError(_t("setka|pack_editor|delete_sticker_error"));
            } finally {
                setBusy(false);
            }
        },
        [busy, client, onSaved, pack, userId],
    );

    const onDeletePack = useCallback(() => {
        if (!pack || busy) return;
        const { finished } = Modal.createDialog(QuestionDialog, {
            title: _t("setka|pack_editor|delete_pack_title"),
            description: _t("setka|pack_editor|delete_pack_body", { name: pack.name }),
            button: _t("action|delete"),
            danger: true,
        });
        finished.then(([confirmed]) => {
            if (!confirmed || !pack) return;
            setBusy(true);
            deleteSetkaPack(client, userId, pack.id)
                .then(() => {
                    onSaved?.();
                    onFinished();
                })
                .catch((e) => {
                    logger.warn("Failed to delete pack", e);
                    setError(_t("setka|pack_editor|delete_pack_error"));
                    setBusy(false);
                });
        });
    }, [busy, client, onFinished, onSaved, pack, userId]);

    const onSharePack = useCallback(async () => {
        if (!pack || busy) return;
        setBusy(true);
        setError(null);
        try {
            const url = await createSetkaPackShareLink(client, userId, pack.id);
            await navigator.clipboard.writeText(url);
        } catch (e) {
            logger.warn("Failed to share pack", e);
            setError(_t("setka|pack_editor|share_error"));
        } finally {
            setBusy(false);
        }
    }, [busy, client, pack, userId]);

    const stickers = pack?.stickers ?? [];

    return (
        <BaseDialog
            className="mx_SetkaPackEditorDialog mx_UserSettingsDialog"
            onFinished={onFinished}
            title={title}
            titleClass="mx_UserSettingsDialog_title"
            fixedWidth={false}
        >
            <div className="mx_SetkaPackEditorDialog_body">
                <Field
                    element="input"
                    type="text"
                    label={_t("setka|pack_editor|name_label")}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />

                {kind === "emoji" && (
                    <p className="mx_SetkaPackEditorDialog_hint">{_t("setka|pack_editor|emoji_plus_hint")}</p>
                )}

                {error && <p className="mx_SetkaPackEditorDialog_error">{error}</p>}

                {!pack ? (
                    <p className="mx_SetkaPackEditorDialog_empty">{_t("setka|pack_editor|empty_new")}</p>
                ) : stickers.length === 0 ? (
                    <p className="mx_SetkaPackEditorDialog_empty">{_t("setka|pack_editor|empty_existing")}</p>
                ) : (
                    <div className="mx_SetkaPackEditorDialog_grid">
                        {stickers.map((sticker) => {
                            const url = mediaFromMxc(sticker.mxcUrl).getSquareThumbnailHttp(96) ?? "";
                            return (
                                <div key={sticker.id} className="mx_SetkaPackEditorDialog_cell">
                                    <img src={url} alt={sticker.name ?? ""} />
                                    <AccessibleButton
                                        kind="danger_outline"
                                        className="mx_SetkaPackEditorDialog_cellDelete"
                                        onClick={() => void onDeleteSticker(sticker.id)}
                                        disabled={busy}
                                        aria-label={_t("action|delete")}
                                    >
                                        ×
                                    </AccessibleButton>
                                </div>
                            );
                        })}
                        <AccessibleButton
                            className="mx_SetkaPackEditorDialog_addCell"
                            onClick={onPickFiles}
                            disabled={busy || uploading}
                            aria-label={_t("setka|pack_editor|add_media")}
                        >
                            {uploading ? <InlineSpinner /> : <PlusIcon width={24} height={24} />}
                        </AccessibleButton>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="mx_SetkaPackEditorDialog_fileInput"
                    onChange={(event) => void onFilesSelected(event)}
                />

                <div className="mx_SetkaPackEditorDialog_actions">
                    {pack && (
                        <>
                            <AccessibleButton kind="danger_outline" onClick={onDeletePack} disabled={busy}>
                                {_t("setka|pack_editor|delete_pack")}
                            </AccessibleButton>
                            <AccessibleButton kind="secondary" onClick={() => void onSharePack()} disabled={busy}>
                                {_t("action|share")}
                            </AccessibleButton>
                        </>
                    )}
                    <AccessibleButton kind="primary" onClick={() => void onSave()} disabled={busy || uploading}>
                        {isCreate ? _t("setka|pack_editor|create_button") : _t("setka|pack_editor|save_button")}
                    </AccessibleButton>
                </div>
            </div>
        </BaseDialog>
    );
};

export function openSetkaPackEditor(
    client: MatrixClient,
    options: {
        kind?: SetkaPackKind;
        pack?: SetkaStickerPack | null;
        onSaved?: () => void;
    } = {},
): void {
    Modal.createDialog(
        SetkaPackEditorDialog,
        {
            client,
            kind: options.kind ?? "sticker",
            pack: options.pack ?? null,
            onSaved: options.onSaved,
        },
        "mx_SetkaPackEditorDialog_wrapper",
        false,
        true,
    );
}

export default SetkaPackEditorDialog;
