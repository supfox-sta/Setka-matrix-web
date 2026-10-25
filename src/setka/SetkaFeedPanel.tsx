/*

Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { logger } from "matrix-js-sdk/src/logger";

import FavouriteIcon from "@vector-im/compound-design-tokens/assets/web/icons/favourite";

import ChatIcon from "@vector-im/compound-design-tokens/assets/web/icons/chat";

import UserIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";



import { _t } from "../languageHandler";

import AccessibleButton from "../components/views/elements/AccessibleButton";

import BaseAvatar from "../components/views/avatars/BaseAvatar";

import InlineSpinner from "../components/views/elements/InlineSpinner";

import defaultDispatcher from "../dispatcher/dispatcher";

import { Action } from "../dispatcher/actions";

import { mediaFromMxc } from "../customisations/Media";

import {

    fetchSetkaFeed,

    fetchSetkaPublicChannels,

    isSetkaFeedVideoNote,

    recordSetkaFeedView,

    toggleSetkaFeedLike,

    type SetkaFeedPost,

    type SetkaPublicChannel,

} from "./SetkaFeedApi";

import SetkaFeedVideoNote from "./SetkaFeedVideoNote";



export type SetkaFeedSubTab = "recommended" | "subscriptions" | "channels";



const FEED_REFRESH_MS = 45_000;

function dedupeFeedPosts(posts: SetkaFeedPost[]): SetkaFeedPost[] {
    const seen = new Set<string>();
    const out: SetkaFeedPost[] = [];
    for (const post of posts) {
        const key = `${post.roomId}:${post.eventId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(post);
    }
    return out;
}



interface Props {

    client: MatrixClient;

}



function formatRelativeTime(timestampMs: number): string {

    if (!timestampMs) return "";

    const delta = Date.now() - timestampMs;

    const minutes = Math.floor(delta / 60000);

    if (minutes < 1) return _t("setka|feed|time_now");

    if (minutes < 60) return _t("setka|feed|time_minutes", { count: minutes });

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return _t("setka|feed|time_hours", { count: hours });

    const days = Math.floor(hours / 24);

    return _t("setka|feed|time_days", { count: days });

}



const SetkaFeedPanel: React.FC<Props> = ({ client }) => {

    const [subTab, setSubTab] = useState<SetkaFeedSubTab>("recommended");

    const [posts, setPosts] = useState<SetkaFeedPost[]>([]);

    const [channels, setChannels] = useState<SetkaPublicChannel[]>([]);

    const [loading, setLoading] = useState(true);

    const [loadingMore, setLoadingMore] = useState(false);

    const [nextBatch, setNextBatch] = useState<string | undefined>();

    const [error, setError] = useState(false);

    const listRef = useRef<HTMLDivElement>(null);

    const sentinelRef = useRef<HTMLDivElement>(null);

    const nextBatchRef = useRef<string | undefined>();

    const loadingMoreRef = useRef(false);



    useEffect(() => {

        nextBatchRef.current = nextBatch;

    }, [nextBatch]);



    useEffect(() => {

        loadingMoreRef.current = loadingMore;

    }, [loadingMore]);



    const loadFeed = useCallback(

        async (mode: "recommended" | "subscriptions", since?: string) => {

            return fetchSetkaFeed(client, mode, since);

        },

        [client],

    );



    const loadInitial = useCallback(

        async (silent = false) => {

            if (!silent) {

                setLoading(true);

            }

            setError(false);

            if (!silent) {

                setNextBatch(undefined);

            }

            try {

                if (subTab === "channels") {

                    const page = await fetchSetkaPublicChannels(client);

                    setChannels(page.channels);

                    setPosts([]);

                    setNextBatch(page.nextBatch);

                } else {

                    const page = await loadFeed(subTab);

                    setPosts(dedupeFeedPosts(page.posts));

                    setChannels([]);

                    setNextBatch(page.nextBatch);

                }

            } catch (e) {

                logger.warn("Failed to load Setka feed", e);

                if (!silent) {

                    setError(true);

                    setPosts([]);

                    setChannels([]);

                }

            } finally {

                if (!silent) {

                    setLoading(false);

                }

            }

        },

        [client, loadFeed, subTab],

    );



    useEffect(() => {

        void loadInitial();

    }, [loadInitial]);



    useEffect(() => {

        const timer = window.setInterval(() => {

            void loadInitial(true);

        }, FEED_REFRESH_MS);

        return () => window.clearInterval(timer);

    }, [loadInitial]);



    const onLoadMore = useCallback(async () => {

        const batch = nextBatchRef.current;

        if (!batch || loadingMoreRef.current) return;

        setLoadingMore(true);

        try {

            if (subTab === "channels") {

                const page = await fetchSetkaPublicChannels(client, batch);

                setChannels((prev) => [...prev, ...page.channels]);

                setNextBatch(page.nextBatch);

            } else {

                const page = await loadFeed(subTab, batch);

                setPosts((prev) => dedupeFeedPosts([...prev, ...page.posts]));

                setNextBatch(page.nextBatch);

            }

        } catch (e) {

            logger.warn("Failed to load more Setka feed", e);

        } finally {

            setLoadingMore(false);

        }

    }, [client, loadFeed, subTab]);



    useEffect(() => {

        const root = listRef.current;

        const sentinel = sentinelRef.current;

        if (!root || !sentinel) return;



        const observer = new IntersectionObserver(

            (entries) => {

                if (entries.some((entry) => entry.isIntersecting)) {

                    void onLoadMore();

                }

            },

            { root, rootMargin: "120px" },

        );

        observer.observe(sentinel);

        return () => observer.disconnect();

    }, [onLoadMore, posts.length, channels.length, loading, subTab]);



    const onOpenPost = useCallback(

        async (post: SetkaFeedPost) => {

            try {

                await recordSetkaFeedView(client, post.eventId);

            } catch {

                // non-blocking

            }

            defaultDispatcher.dispatch({

                action: Action.ViewRoom,

                room_id: post.roomId,

                event_id: post.eventId,

                highlighted: true,

                scroll_into_view: true,

                metricsTrigger: "Other",

            });

        },

        [client],

    );



    const onOpenChannel = useCallback((roomId: string) => {

        defaultDispatcher.dispatch({

            action: Action.ViewRoom,

            room_id: roomId,

            metricsTrigger: "Other",

        });

    }, []);



    const onToggleLike = useCallback(

        async (post: SetkaFeedPost) => {

            try {

                const result = await toggleSetkaFeedLike(client, post.eventId);

                setPosts((prev) =>

                    prev.map((item) =>

                        item.eventId === post.eventId

                            ? { ...item, liked: result.liked, likeCount: result.likeCount }

                            : item,

                    ),

                );

            } catch (e) {

                logger.warn("Failed to toggle feed like", e);

            }

        },

        [client],

    );



    const subTabs = useMemo(

        () =>

            [

                { id: "recommended" as const, label: _t("setka|feed|tab_recommended") },

                { id: "subscriptions" as const, label: _t("setka|feed|tab_subscriptions") },

                { id: "channels" as const, label: _t("setka|feed|tab_channels") },

            ] as const,

        [],

    );



    return (

        <div className="mx_SetkaFeedPanel">

            <div className="mx_SetkaFeedPanel_header">

                <div className="mx_SetkaFeedPanel_subTabs" role="tablist" aria-label={_t("setka|feed|subtabs_aria")}>

                    {subTabs.map((tab) => (

                        <AccessibleButton

                            key={tab.id}

                            role="tab"

                            aria-selected={subTab === tab.id}

                            className={

                                "mx_SetkaFeedPanel_subTab" +

                                (subTab === tab.id ? " mx_SetkaFeedPanel_subTab_active" : "")

                            }

                            onClick={() => setSubTab(tab.id)}

                        >

                            {tab.label}

                        </AccessibleButton>

                    ))}

                </div>

            </div>



            <div className="mx_SetkaFeedPanel_list" ref={listRef}>

                {loading ? (

                    <div className="mx_SetkaFeedPanel_centered">

                        <InlineSpinner />

                    </div>

                ) : error ? (

                    <p className="mx_SetkaFeedPanel_centered">{_t("setka|feed|load_error")}</p>

                ) : subTab === "channels" ? (

                    channels.length === 0 ? (

                        <p className="mx_SetkaFeedPanel_centered">{_t("setka|feed|empty_channels")}</p>

                    ) : (

                        channels.map((channel) => (

                            <AccessibleButton

                                key={channel.roomId}

                                className="mx_SetkaFeedPanel_channelCard"

                                onClick={() => onOpenChannel(channel.roomId)}

                            >

                                <BaseAvatar

                                    idName={channel.roomId}

                                    name={channel.name}

                                    url={

                                        channel.avatarUrl

                                            ? client.mxcUrlToHttp(channel.avatarUrl, 48, 48, "crop")

                                            : undefined

                                    }

                                    size="48px"

                                />

                                <div className="mx_SetkaFeedPanel_channelText">

                                    <span className="mx_SetkaFeedPanel_channelName">{channel.name}</span>

                                    {channel.categoryLabel && (

                                        <span className="mx_SetkaFeedPanel_channelMeta">{channel.categoryLabel}</span>

                                    )}

                                    <span className="mx_SetkaFeedPanel_channelMeta">

                                        {_t("setka|feed|members", { count: channel.memberCount })}

                                    </span>

                                </div>

                            </AccessibleButton>

                        ))

                    )

                ) : posts.length === 0 ? (

                    <p className="mx_SetkaFeedPanel_centered">{_t("setka|feed|empty_posts")}</p>

                ) : (

                    posts.map((post) => {

                        const mediaUrl = post.mediaMxc

                            ? mediaFromMxc(post.mediaMxc).getThumbnailOfSourceHttp(480, 480)

                            : undefined;

                        const avatarUrl = post.channelAvatar

                            ? client.mxcUrlToHttp(post.channelAvatar, 40, 40, "crop")

                            : undefined;

                        return (

                            <article key={`${post.roomId}:${post.eventId}`} className="mx_SetkaFeedPanel_postCard">

                                <AccessibleButton

                                    className="mx_SetkaFeedPanel_postMain"

                                    onClick={() => void onOpenPost(post)}

                                >

                                    <div className="mx_SetkaFeedPanel_postHeader">

                                        <BaseAvatar

                                            idName={post.roomId}

                                            name={post.channelName ?? post.roomId}

                                            url={avatarUrl}

                                            size="40px"

                                        />

                                        <div className="mx_SetkaFeedPanel_postHeaderText">

                                            <span className="mx_SetkaFeedPanel_postChannel">

                                                {post.channelName ?? post.roomId}

                                            </span>

                                            <span className="mx_SetkaFeedPanel_postMeta">

                                                {formatRelativeTime(post.createdAt)}

                                                {post.categoryLabel ? ` · ${post.categoryLabel}` : ""}

                                            </span>

                                        </div>

                                    </div>

                                    {post.body && !isSetkaFeedVideoNote(post) && (
                                        <p className="mx_SetkaFeedPanel_postBody">{post.body}</p>
                                    )}

                                    {isSetkaFeedVideoNote(post) && post.mediaMxc ? (
                                        <SetkaFeedVideoNote client={client} mxcUrl={post.mediaMxc} />
                                    ) : (
                                        mediaUrl && (
                                            <img className="mx_SetkaFeedPanel_postMedia" src={mediaUrl} alt="" />
                                        )
                                    )}

                                </AccessibleButton>

                                <div className="mx_SetkaFeedPanel_postActions">

                                    <AccessibleButton

                                        className={

                                            "mx_SetkaFeedPanel_action" +

                                            (post.liked ? " mx_SetkaFeedPanel_action_active" : "")

                                        }

                                        onClick={() => void onToggleLike(post)}

                                    >

                                        <FavouriteIcon width={16} height={16} />

                                        <span>{post.likeCount}</span>

                                    </AccessibleButton>

                                    <AccessibleButton

                                        className="mx_SetkaFeedPanel_action"

                                        onClick={() => void onOpenPost(post)}

                                    >

                                        <ChatIcon width={16} height={16} />

                                        <span>{post.commentCount}</span>

                                    </AccessibleButton>

                                    <AccessibleButton

                                        className="mx_SetkaFeedPanel_action"

                                        onClick={() => onOpenChannel(post.roomId)}

                                    >

                                        <UserIcon width={16} height={16} />

                                        <span>{_t("setka|feed|open_channel")}</span>

                                    </AccessibleButton>

                                </div>

                            </article>

                        );

                    })

                )}



                {loadingMore && (

                    <div className="mx_SetkaFeedPanel_centered mx_SetkaFeedPanel_loadingMore">

                        <InlineSpinner />

                    </div>

                )}

                <div ref={sentinelRef} className="mx_SetkaFeedPanel_sentinel" aria-hidden />

            </div>

        </div>

    );

};



export default SetkaFeedPanel;

