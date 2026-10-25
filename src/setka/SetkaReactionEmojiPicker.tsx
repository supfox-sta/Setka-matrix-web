/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    EventType,
    type MatrixEvent,
    RelationType,
    type Relations,
} from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import AccessibleButton from "../components/views/elements/AccessibleButton";
import InlineSpinner from "../components/views/elements/InlineSpinner";
import { MatrixClientPeg } from "../MatrixClientPeg";
import dis from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import { type FocusComposerPayload } from "../dispatcher/payloads/FocusComposerPayload";
import RoomContext from "../contexts/RoomContext";
import { mediaFromMxc } from "../customisations/Media";
import { _t } from "../languageHandler";
import { SETKA_STOCK_EMOJI_PACK_ID } from "./SetkaProfileApi";
import {
    fetchSetkaStickerPacks,
    type SetkaPackSticker,
    type SetkaStickerPack,
    SETKA_STOCK_EMOJIS,
} from "./setkaStickerPacks";

interface Props {
    mxEvent: MatrixEvent;
    reactions?: Relations | null;
    onFinished(): void;
}

const SetkaReactionEmojiPicker: React.FC<Props> = ({ mxEvent, reactions, onFinished }) => {
    const roomContext = React.useContext(RoomContext);
    const client = MatrixClientPeg.safeGet();
    const userId = client.getUserId()!;
    const [packs, setPacks] = useState<SetkaStickerPack[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePackId, setActivePackId] = useState<string>(SETKA_STOCK_EMOJI_PACK_ID);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const loaded = await fetchSetkaStickerPacks(client, userId);
                if (!cancelled) setPacks(loaded);
            } catch (e) {
                logger.warn("Failed to load Setka emoji packs for reactions", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client, userId]);

    const myReactions = useMemo((): Record<string, string> => {
        if (!reactions) return {};
        const annotations = reactions.getAnnotationsBySender()?.[userId] ?? new Set<MatrixEvent>();
        return Object.fromEntries(
            [...annotations]
                .filter((event) => !event.isRedacted())
                .map((event) => [event.getRelation()?.key, event.getId()]),
        );
    }, [reactions, userId]);

    const onChoose = useCallback(
        (reaction: string): boolean => {
            onFinished();
            if (myReactions[reaction]) {
                if (mxEvent.isRedacted() || !roomContext.canSelfRedact) return false;
                client.redactEvent(mxEvent.getRoomId()!, myReactions[reaction]!);
                dis.dispatch<FocusComposerPayload>({
                    action: Action.FocusAComposer,
                    context: roomContext.timelineRenderingType,
                });
                return false;
            }

            client.sendEvent(mxEvent.getRoomId()!, EventType.Reaction, {
                "m.relates_to": {
                    rel_type: RelationType.Annotation,
                    event_id: mxEvent.getId()!,
                    key: reaction,
                },
            });
            dis.dispatch({ action: "message_sent" });
            dis.dispatch<FocusComposerPayload>({
                action: Action.FocusAComposer,
                context: roomContext.timelineRenderingType,
            });
            return true;
        },
        [client, mxEvent, myReactions, onFinished, roomContext.canSelfRedact, roomContext.timelineRenderingType],
    );

    const stockPack = useMemo(
        (): SetkaStickerPack => ({
            id: SETKA_STOCK_EMOJI_PACK_ID,
            name: _t("setka|picker|stock_pack"),
            kind: "emoji",
            stickers: [],
        }),
        [],
    );

    const emojiPacks = useMemo(() => {
        const custom = packs.filter((pack) => pack.kind === "emoji");
        return [stockPack, ...custom];
    }, [packs, stockPack]);

    const activePack = useMemo(() => {
        return emojiPacks.find((pack) => pack.id === activePackId) ?? emojiPacks[0];
    }, [activePackId, emojiPacks]);

    const onPackEmoji = useCallback(
        (sticker: SetkaPackSticker) => {
            onChoose(sticker.mxcUrl);
        },
        [onChoose],
    );

    const showUnicodePicker = !activePack || activePack.id === SETKA_STOCK_EMOJI_PACK_ID;

    return (
        <div className="mx_SetkaReactionEmojiPicker">
            {emojiPacks.length > 1 && (
                <div className="mx_SetkaReactionEmojiPicker_tabs">
                    {emojiPacks.map((pack) => (
                        <AccessibleButton
                            key={pack.id}
                            className={
                                "mx_SetkaReactionEmojiPicker_tab" +
                                (pack.id === activePack?.id ? " mx_SetkaReactionEmojiPicker_tab_active" : "")
                            }
                            onClick={() => setActivePackId(pack.id)}
                        >
                            {pack.name}
                        </AccessibleButton>
                    ))}
                </div>
            )}
            <div className="mx_SetkaReactionEmojiPicker_content">
                {loading ? (
                    <div className="mx_SetkaReactionEmojiPicker_loading">
                        <InlineSpinner />
                    </div>
                ) : showUnicodePicker ? (
                    <div className="mx_SetkaReactionEmojiPicker_grid mx_SetkaReactionEmojiPicker_grid_stock">
                        {SETKA_STOCK_EMOJIS.map((emoji) => (
                            <AccessibleButton
                                key={emoji}
                                className={
                                    "mx_SetkaReactionEmojiPicker_cell" +
                                    (myReactions[emoji] ? " mx_SetkaReactionEmojiPicker_cell_selected" : "")
                                }
                                onClick={() => onChoose(emoji)}
                            >
                                {emoji}
                            </AccessibleButton>
                        ))}
                    </div>
                ) : (
                    <div className="mx_SetkaReactionEmojiPicker_grid">
                        {activePack?.stickers.map((sticker) => {
                            const url = mediaFromMxc(sticker.mxcUrl).getSquareThumbnailHttp(48) ?? "";
                            const selected = Boolean(myReactions[sticker.mxcUrl]);
                            return (
                                <AccessibleButton
                                    key={sticker.id}
                                    className={
                                        "mx_SetkaReactionEmojiPicker_cell" +
                                        (selected ? " mx_SetkaReactionEmojiPicker_cell_selected" : "")
                                    }
                                    onClick={() => onPackEmoji(sticker)}
                                    title={sticker.name}
                                >
                                    <img src={url} alt={sticker.name ?? ""} />
                                </AccessibleButton>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SetkaReactionEmojiPicker;
