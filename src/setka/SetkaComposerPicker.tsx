/*

Copyright 2026 Setka Matrix



SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { THREAD_RELATION_TYPE, type IEventRelation, type MatrixClient } from "matrix-js-sdk/src/matrix";

import { logger } from "matrix-js-sdk/src/logger";

import ReactionIcon from "@vector-im/compound-design-tokens/assets/web/icons/reaction";

import StickerIcon from "@vector-im/compound-design-tokens/assets/web/icons/sticker";

import ImageIcon from "@vector-im/compound-design-tokens/assets/web/icons/image";



import { _t } from "../languageHandler";

import AccessibleButton from "../components/views/elements/AccessibleButton";

import InlineSpinner from "../components/views/elements/InlineSpinner";

import { EmojiPickerWithRecents } from "../emojipicker/EmojiPickerWithRecents";

import { mediaFromMxc } from "../customisations/Media";

import defaultDispatcher from "../dispatcher/dispatcher";

import { SETKA_STOCK_EMOJI_PACK_ID } from "./SetkaProfileApi";

import {

    fetchTrendingKlipyGifs,

    reportKlipyGifShare,

    searchKlipyGifs,

    type KlipyGif,

} from "./setkaKlipyApi";

import {

    fetchSetkaStickerPacks,

    inlineEmojiToken,

    isGifSticker,

    type SetkaPackSticker,

    type SetkaStickerPack,

} from "./setkaStickerPacks";

import { openSetkaPackEditor } from "./SetkaPackEditorDialog";

import { fetchSetkaPlusSubscription } from "./SetkaPlusApi";

import SetkaPlusDialog from "./SetkaPlusDialog";

import Modal from "../Modal";



export type SetkaComposerPickerTab = "emoji" | "stickers" | "gif";



interface Props {

    client: MatrixClient;

    addEmoji: (emoji: string) => boolean;

    relation?: IEventRelation;

    onClose: () => void;

}



function sendSticker(sticker: SetkaPackSticker, relation?: IEventRelation): void {

    const threadId =

        relation?.rel_type === THREAD_RELATION_TYPE.name ? (relation.event_id ?? null) : null;

    const isGif = isGifSticker(sticker);

    defaultDispatcher.dispatch({

        action: "post_sticker_message",

        data: {

            content: {

                url: sticker.mxcUrl,

                info: {

                    w: 128,

                    h: 128,

                    mimetype: isGif ? "image/gif" : "image/png",

                },

            },

            description: sticker.name ?? "",

            name: sticker.name ?? "",

            threadId,

        },

    });

}



async function sendKlipyGif(

    client: MatrixClient,

    gif: KlipyGif,

    customerId: string,

    relation?: IEventRelation,

): Promise<void> {

    const response = await fetch(gif.gifUrl);

    if (!response.ok) {

        throw new Error(`Failed to download GIF: ${response.status}`);

    }

    const blob = await response.blob();

    const { content_uri: contentUri } = await client.uploadContent(blob, {

        type: "image/gif",

        name: `${gif.slug}.gif`,

    });

    const threadId =

        relation?.rel_type === THREAD_RELATION_TYPE.name ? (relation.event_id ?? null) : null;

    defaultDispatcher.dispatch({

        action: "post_sticker_message",

        data: {

            content: {

                url: contentUri,

                info: {

                    w: gif.width,

                    h: gif.height,

                    mimetype: "image/gif",

                },

            },

            description: gif.title,

            name: gif.title,

            threadId,

        },

    });

    void reportKlipyGifShare(gif.slug, customerId);

}



const SetkaComposerPicker: React.FC<Props> = ({ client, addEmoji, relation, onClose }) => {

    const userId = client.getUserId()!;

    const [tab, setTab] = useState<SetkaComposerPickerTab>("emoji");

    const [packs, setPacks] = useState<SetkaStickerPack[]>([]);

    const [loading, setLoading] = useState(true);

    const [activePackId, setActivePackId] = useState<string>(SETKA_STOCK_EMOJI_PACK_ID);

    const [klipyGifs, setKlipyGifs] = useState<KlipyGif[]>([]);

    const [klipyLoading, setKlipyLoading] = useState(false);

    const [klipyQuery, setKlipyQuery] = useState("");

    const [klipySendingId, setKlipySendingId] = useState<number | null>(null);

    const [packRevision, setPackRevision] = useState(0);

    const [plusActive, setPlusActive] = useState(false);

    const klipyRequestId = useRef(0);



    const reloadPacks = useCallback(() => setPackRevision((value) => value + 1), []);



    useEffect(() => {

        let cancelled = false;

        fetchSetkaPlusSubscription(client, userId)

            .then((subscription) => {

                if (!cancelled) setPlusActive(Boolean(subscription.is_active));

            })

            .catch(() => {

                if (!cancelled) setPlusActive(false);

            });

        return () => {

            cancelled = true;

        };

    }, [client, userId]);



    useEffect(() => {

        let cancelled = false;

        (async () => {

            setLoading(true);

            try {

                const loaded = await fetchSetkaStickerPacks(client, userId);

                if (!cancelled) setPacks(loaded);

            } catch (e) {

                logger.warn("Failed to load Setka sticker packs", e);

            } finally {

                if (!cancelled) setLoading(false);

            }

        })();

        return () => {

            cancelled = true;

        };

    }, [client, userId, packRevision]);



    useEffect(() => {

        if (tab !== "gif") return;



        const requestId = ++klipyRequestId.current;

        const timer = window.setTimeout(() => {

            (async () => {

                setKlipyLoading(true);

                try {

                    const page = klipyQuery.trim()

                        ? await searchKlipyGifs(klipyQuery, userId)

                        : await fetchTrendingKlipyGifs(userId);

                    if (requestId !== klipyRequestId.current) return;

                    setKlipyGifs(page.gifs);

                } catch (e) {

                    if (requestId !== klipyRequestId.current) return;

                    logger.warn("Failed to load Klipy GIFs", e);

                    setKlipyGifs([]);

                } finally {

                    if (requestId === klipyRequestId.current) setKlipyLoading(false);

                }

            })();

        }, klipyQuery.trim() ? 300 : 0);



        return () => {

            window.clearTimeout(timer);

        };

    }, [klipyQuery, tab, userId]);



    const emojiPacks = useMemo(() => packs.filter((pack) => pack.kind === "emoji"), [packs]);

    const stickerPacks = useMemo(() => packs.filter((pack) => pack.kind === "sticker"), [packs]);



    const stockPack = useMemo<SetkaStickerPack>(

        () => ({

            id: SETKA_STOCK_EMOJI_PACK_ID,

            name: _t("setka|picker|stock_pack"),

            kind: "emoji",

            stickers: [],

        }),

        [],

    );



    const packRail = useMemo(() => {

        if (tab === "emoji") {

            return [stockPack, ...emojiPacks];

        }

        if (tab === "stickers") {

            return stickerPacks;

        }

        return [];

    }, [emojiPacks, stickerPacks, stockPack, tab]);



    useEffect(() => {

        if (tab === "gif") return;

        if (!packRail.some((pack) => pack.id === activePackId)) {

            setActivePackId(packRail[0]?.id ?? SETKA_STOCK_EMOJI_PACK_ID);

        }

    }, [activePackId, packRail, tab]);



    const activePack = packRail.find((pack) => pack.id === activePackId) ?? packRail[0];

    const showUnicodePicker = tab === "emoji" && activePackId === SETKA_STOCK_EMOJI_PACK_ID;



    const onPackEmoji = useCallback(

        (sticker: SetkaPackSticker) => {

            if (activePackId !== SETKA_STOCK_EMOJI_PACK_ID && !plusActive) {

                Modal.createDialog(SetkaPlusDialog, { client }, "mx_SetkaPlusDialog");

                return;

            }

            addEmoji(`${inlineEmojiToken(sticker)} `);

            onClose();

        },

        [activePackId, addEmoji, client, onClose, plusActive],

    );



    const onPackSticker = useCallback(

        (sticker: SetkaPackSticker) => {

            sendSticker(sticker, relation);

            onClose();

        },

        [onClose, relation],

    );



    const onKlipyGif = useCallback(

        async (gif: KlipyGif) => {

            if (klipySendingId !== null) return;

            setKlipySendingId(gif.id);

            try {

                await sendKlipyGif(client, gif, userId, relation);

                onClose();

            } catch (e) {

                logger.warn("Failed to send Klipy GIF", e);

            } finally {

                setKlipySendingId(null);

            }

        },

        [client, klipySendingId, onClose, relation, userId],

    );



    const onCreatePack = useCallback(() => {

        openSetkaPackEditor(client, { kind: "sticker", onSaved: reloadPacks });

    }, [client, reloadPacks]);



    const onEditPack = useCallback(() => {

        const pack = stickerPacks.find((item) => item.id === activePackId);

        if (!pack) return;

        openSetkaPackEditor(client, { kind: "sticker", pack, onSaved: reloadPacks });

    }, [activePackId, client, reloadPacks, stickerPacks]);



    const tabs: { id: SetkaComposerPickerTab; label: string; Icon: typeof ReactionIcon }[] = [

        { id: "emoji", label: _t("setka|picker|tab_emoji"), Icon: ReactionIcon },

        { id: "stickers", label: _t("setka|picker|tab_stickers"), Icon: StickerIcon },

        { id: "gif", label: _t("setka|picker|tab_gif"), Icon: ImageIcon },

    ];



    return (

        <div className="mx_SetkaComposerPicker">

            <div className="mx_SetkaComposerPicker_content">

                {loading ? (

                    <div className="mx_SetkaComposerPicker_loading">

                        <InlineSpinner />

                    </div>

                ) : tab === "emoji" ? (

                    showUnicodePicker ? (

                        <div className="mx_SetkaComposerPicker_emojiPicker">

                            <EmojiPickerWithRecents

                                onChoose={(emoji) => {

                                    addEmoji(emoji);

                                    onClose();

                                    return true;

                                }}

                                onFinished={onClose}

                            />

                        </div>

                    ) : (

                        <div className="mx_SetkaComposerPicker_grid mx_SetkaComposerPicker_grid_emoji">

                            {activePack?.stickers.map((sticker) => {

                                const url =

                                    mediaFromMxc(sticker.mxcUrl).getSquareThumbnailHttp(48) ?? "";

                                return (

                                    <AccessibleButton

                                        key={sticker.id}

                                        className="mx_SetkaComposerPicker_cell"

                                        onClick={() => onPackEmoji(sticker)}

                                        title={sticker.name}

                                    >

                                        <img src={url} alt={sticker.name ?? ""} />

                                    </AccessibleButton>

                                );

                            })}

                        </div>

                    )

                ) : tab === "stickers" ? (

                    stickerPacks.length === 0 ? (

                        <p className="mx_SetkaComposerPicker_empty">{_t("setka|picker|empty_stickers")}</p>

                    ) : (

                        <div className="mx_SetkaComposerPicker_grid mx_SetkaComposerPicker_grid_stickers">

                            {activePack?.stickers.map((sticker) => {

                                const url =

                                    mediaFromMxc(sticker.mxcUrl).getSquareThumbnailHttp(96) ?? "";

                                return (

                                    <AccessibleButton

                                        key={sticker.id}

                                        className="mx_SetkaComposerPicker_cell mx_SetkaComposerPicker_cell_sticker"

                                        onClick={() => onPackSticker(sticker)}

                                        title={sticker.name}

                                    >

                                        <img src={url} alt={sticker.name ?? ""} />

                                    </AccessibleButton>

                                );

                            })}

                        </div>

                    )

                ) : (

                    <div className="mx_SetkaComposerPicker_gifPane">

                        <input

                            className="mx_SetkaComposerPicker_gifSearch"

                            type="search"

                            value={klipyQuery}

                            onChange={(event) => setKlipyQuery(event.target.value)}

                            placeholder={_t("setka|picker|gif_search_placeholder")}

                            aria-label={_t("setka|picker|gif_search_placeholder")}

                        />

                        {klipyLoading ? (

                            <div className="mx_SetkaComposerPicker_loading">

                                <InlineSpinner />

                            </div>

                        ) : klipyGifs.length === 0 ? (

                            <p className="mx_SetkaComposerPicker_empty">{_t("setka|picker|empty_gif")}</p>

                        ) : (

                            <div className="mx_SetkaComposerPicker_grid mx_SetkaComposerPicker_grid_stickers mx_SetkaComposerPicker_grid_gifs">

                                {klipyGifs.map((gif) => (

                                    <AccessibleButton

                                        key={gif.id}

                                        className="mx_SetkaComposerPicker_cell mx_SetkaComposerPicker_cell_sticker"

                                        onClick={() => void onKlipyGif(gif)}

                                        title={gif.title}

                                        disabled={klipySendingId === gif.id}

                                    >

                                        <img src={gif.previewUrl} alt={gif.title} />

                                    </AccessibleButton>

                                ))}

                            </div>

                        )}

                    </div>

                )}

            </div>



            {(packRail.length > 0 || tab === "stickers") && tab !== "gif" && (

                <div className="mx_SetkaComposerPicker_packRail" role="tablist" aria-label={_t("setka|picker|packs")}>

                    {packRail.map((pack) => {

                        const iconUrl = pack.iconMxcUrl

                            ? mediaFromMxc(pack.iconMxcUrl).getSquareThumbnailHttp(32)

                            : undefined;

                        const isStock = pack.id === SETKA_STOCK_EMOJI_PACK_ID;

                        return (

                            <AccessibleButton

                                key={pack.id}

                                role="tab"

                                aria-selected={activePackId === pack.id}

                                className={

                                    "mx_SetkaComposerPicker_packIcon" +

                                    (activePackId === pack.id ? " mx_SetkaComposerPicker_packIcon_active" : "")

                                }

                                onClick={() => setActivePackId(pack.id)}

                                title={pack.name}

                            >

                                {isStock ? (

                                    <ReactionIcon width={20} height={20} />

                                ) : iconUrl ? (

                                    <img src={iconUrl} alt="" />

                                ) : (

                                    <span>{pack.name.slice(0, 1)}</span>

                                )}

                            </AccessibleButton>

                        );

                    })}

                    {tab === "stickers" && (

                        <>

                            <AccessibleButton

                                className="mx_SetkaComposerPicker_packIcon mx_SetkaComposerPicker_packIcon_action"

                                onClick={onCreatePack}

                                title={_t("setka|pack_editor|create_button")}

                                aria-label={_t("setka|pack_editor|create_button")}

                            >

                                <span className="mx_SetkaComposerPicker_packIcon_plus">+</span>

                            </AccessibleButton>

                            {activePack && (

                                <AccessibleButton

                                    className="mx_SetkaComposerPicker_packIcon mx_SetkaComposerPicker_packIcon_action"

                                    onClick={onEditPack}

                                    title={_t("setka|pack_editor|edit_pack")}

                                    aria-label={_t("setka|pack_editor|edit_pack")}

                                >

                                    <span className="mx_SetkaComposerPicker_packIcon_edit">✎</span>

                                </AccessibleButton>

                            )}

                        </>

                    )}

                </div>

            )}



            <div className="mx_SetkaComposerPicker_tabBar" role="tablist">

                {tabs.map(({ id, label, Icon }) => (

                    <AccessibleButton

                        key={id}

                        role="tab"

                        aria-selected={tab === id}

                        className={

                            "mx_SetkaComposerPicker_tab" + (tab === id ? " mx_SetkaComposerPicker_tab_active" : "")

                        }

                        onClick={() => setTab(id)}

                    >

                        <Icon width={20} height={20} />

                        <span>{label}</span>

                    </AccessibleButton>

                ))}

            </div>

        </div>

    );

};



export default SetkaComposerPicker;

