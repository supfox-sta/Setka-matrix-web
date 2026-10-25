/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import InlineSpinner from "../components/views/elements/InlineSpinner";
import { mediaFromMxc } from "../customisations/Media";
import { fetchSetkaEmojiPacks, type SetkaEmojiPack } from "./setkaEmojiPacks";

interface Props {
    client: MatrixClient;
    title: string;
    selectedMxc?: string;
    onFinished: (mxc?: string) => void;
}

const SetkaEmojiPickerDialog: React.FC<Props> = ({ client, title, selectedMxc, onFinished }) => {
    const userId = client.getUserId()!;
    const [packs, setPacks] = useState<SetkaEmojiPack[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePackId, setActivePackId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const loaded = await fetchSetkaEmojiPacks(client, userId);
                if (cancelled) return;
                setPacks(loaded);
                setActivePackId(loaded[0]?.id ?? null);
            } catch (e) {
                logger.warn("Failed to load Setka emoji packs", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client, userId]);

    const activePack = useMemo(
        () => packs.find((pack) => pack.id === activePackId) ?? packs[0],
        [activePackId, packs],
    );

    const onClear = useCallback(() => onFinished(""), [onFinished]);

    return (
        <BaseDialog
            className="mx_SetkaEmojiPickerDialog"
            onFinished={() => onFinished()}
            title={title}
            contentId="mx_SetkaEmojiPickerDialog_content"
        >
            <div className="mx_Dialog_content" id="mx_SetkaEmojiPickerDialog_content">
                {loading ? (
                    <div className="mx_SetkaEmojiPicker_loading">
                        <InlineSpinner />
                    </div>
                ) : packs.length === 0 ? (
                    <p className="mx_SetkaEmojiPicker_empty">{_t("setka|emoji|empty")}</p>
                ) : (
                    <>
                        <div className="mx_SetkaEmojiPicker_packs" role="tablist">
                            {packs.map((pack) => {
                                const iconUrl = pack.iconMxcUrl
                                    ? mediaFromMxc(pack.iconMxcUrl).getSquareThumbnailHttp(32)
                                    : undefined;
                                return (
                                    <AccessibleButton
                                        key={pack.id}
                                        role="tab"
                                        aria-selected={activePack?.id === pack.id}
                                        className={
                                            "mx_SetkaEmojiPicker_packTab" +
                                            (activePack?.id === pack.id ? " mx_SetkaEmojiPicker_packTab_active" : "")
                                        }
                                        onClick={() => setActivePackId(pack.id)}
                                        title={pack.name}
                                    >
                                        {iconUrl ? (
                                            <img src={iconUrl} alt="" />
                                        ) : (
                                            <span>{pack.name.slice(0, 1)}</span>
                                        )}
                                    </AccessibleButton>
                                );
                            })}
                        </div>
                        <div className="mx_SetkaEmojiPicker_grid" role="listbox">
                            {activePack?.stickers.map((sticker) => {
                                const url = mediaFromMxc(sticker.mxcUrl).getSquareThumbnailHttp(64) ?? "";
                                const selected = sticker.mxcUrl === selectedMxc;
                                return (
                                    <AccessibleButton
                                        key={sticker.id}
                                        role="option"
                                        aria-selected={selected}
                                        className={
                                            "mx_SetkaEmojiPicker_sticker" +
                                            (selected ? " mx_SetkaEmojiPicker_sticker_selected" : "")
                                        }
                                        onClick={() => onFinished(sticker.mxcUrl)}
                                        title={sticker.name ?? ""}
                                    >
                                        <img src={url} alt={sticker.name ?? ""} />
                                    </AccessibleButton>
                                );
                            })}
                        </div>
                    </>
                )}
                <div className="mx_SetkaEmojiPicker_actions">
                    <AccessibleButton kind="secondary" onClick={onClear}>
                        {_t("setka|emoji|clear")}
                    </AccessibleButton>
                </div>
            </div>
        </BaseDialog>
    );
};

export default SetkaEmojiPickerDialog;
