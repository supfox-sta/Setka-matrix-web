/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../languageHandler";
import Modal from "../Modal";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import InlineSpinner from "../components/views/elements/InlineSpinner";
import { mediaFromMxc } from "../customisations/Media";
import { deleteSetkaStickerPack, findSetkaPackByMxcUrl } from "./setkaStickerPackActions";
import { fetchSetkaStickerPacks, type SetkaStickerPack } from "./setkaStickerPacks";

interface Props {
    client: MatrixClient;
    mxcUrl: string;
    onFinished: () => void;
}

const SetkaStickerPackPreviewDialog: React.FC<Props> = ({ client, mxcUrl, onFinished }) => {
    const userId = client.getUserId()!;
    const [pack, setPack] = useState<SetkaStickerPack | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const packs = await fetchSetkaStickerPacks(client, userId);
                if (cancelled) return;
                const found = findSetkaPackByMxcUrl(
                    packs.filter((p) => p.kind === "sticker"),
                    mxcUrl,
                );
                setPack(found ?? null);
                if (!found) {
                    setError(_t("setka|sticker_pack|not_found"));
                }
            } catch (e) {
                logger.warn("Failed to load sticker pack preview", e);
                if (!cancelled) setError(_t("setka|sticker_pack|load_error"));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client, mxcUrl, userId]);

    const onToggleCollection = useCallback(async (): Promise<void> => {
        if (!pack || busy) return;
        setBusy(true);
        setError(null);
        try {
            await deleteSetkaStickerPack(client, userId, pack.id);
            onFinished();
        } catch (e) {
            logger.warn("Failed to update sticker pack collection", e);
            setError(_t("setka|sticker_pack|action_error"));
            setBusy(false);
        }
    }, [busy, client, onFinished, pack, userId]);

    const iconUrl = pack?.iconMxcUrl ? mediaFromMxc(pack.iconMxcUrl).getSquareThumbnailHttp(54) : undefined;

    return (
        <div className="mx_SetkaStickerPackPreview">
            <h2 className="mx_SetkaStickerPackPreview_title">{_t("setka|sticker_pack|preview_title")}</h2>
            {loading ? (
                <div className="mx_SetkaStickerPackPreview_centered">
                    <InlineSpinner />
                </div>
            ) : pack ? (
                <>
                    <div className="mx_SetkaStickerPackPreview_header">
                        {iconUrl ? (
                            <img className="mx_SetkaStickerPackPreview_icon" src={iconUrl} alt="" />
                        ) : (
                            <div className="mx_SetkaStickerPackPreview_icon mx_SetkaStickerPackPreview_icon_placeholder" />
                        )}
                        <div className="mx_SetkaStickerPackPreview_meta">
                            <span className="mx_SetkaStickerPackPreview_name">{pack.name}</span>
                            <span className="mx_SetkaStickerPackPreview_kind">
                                {_t("setka|sticker_pack|kind_sticker")}
                                {" · "}
                                {_t("setka|sticker_pack|installed")}
                            </span>
                        </div>
                    </div>
                    <div className="mx_SetkaStickerPackPreview_grid">
                        {pack.stickers.map((sticker) => {
                            const url = mediaFromMxc(sticker.mxcUrl).getSquareThumbnailHttp(96);
                            return (
                                <img
                                    key={sticker.id}
                                    className="mx_SetkaStickerPackPreview_sticker"
                                    src={url}
                                    alt={sticker.name ?? ""}
                                />
                            );
                        })}
                    </div>
                    <AccessibleButton
                        kind="primary"
                        className="mx_SetkaStickerPackPreview_action"
                        onClick={() => void onToggleCollection()}
                        disabled={busy}
                    >
                        {busy ? <InlineSpinner w={16} h={16} /> : _t("setka|sticker_pack|remove_collection")}
                    </AccessibleButton>
                </>
            ) : (
                <p className="mx_SetkaStickerPackPreview_error">{error ?? _t("setka|sticker_pack|not_found")}</p>
            )}
            {error && pack && <p className="mx_SetkaStickerPackPreview_error">{error}</p>}
            <AccessibleButton kind="secondary" onClick={onFinished} className="mx_SetkaStickerPackPreview_close">
                {_t("action|close")}
            </AccessibleButton>
        </div>
    );
};

export function openSetkaStickerPackPreview(client: MatrixClient, mxcUrl: string): void {
    Modal.createDialog(
        SetkaStickerPackPreviewDialog,
        { client, mxcUrl },
        "mx_SetkaStickerPackPreview_wrapper",
        false,
        true,
    );
}
