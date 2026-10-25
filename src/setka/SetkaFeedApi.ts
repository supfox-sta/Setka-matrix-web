/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedRequest } from "./setkaHttp";

export type SetkaFeedMode = "recommended" | "subscriptions";

export interface SetkaFeedPost {
    eventId: string;
    roomId: string;
    sender: string;
    createdAt: number;
    msgtype: string;
    body: string;
    mediaMxc?: string;
    commentCount: number;
    viewCount: number;
    likeCount: number;
    liked: boolean;
    subscribed: boolean;
    channelName?: string;
    channelAvatar?: string;
    categoryLabel?: string;
}

export interface SetkaFeedPage {
    posts: SetkaFeedPost[];
    nextBatch?: string;
}

export interface SetkaPublicChannel {
    roomId: string;
    name: string;
    topic?: string;
    avatarUrl?: string;
    memberCount: number;
    categoryLabel?: string;
}

export interface SetkaPublicChannelsPage {
    channels: SetkaPublicChannel[];
    nextBatch?: string;
}

const KNOWN_FEED_MSGTYPES = new Set(["m.text", "m.image", "m.video", "m.audio", "m.file", "m.notice", "m.emote"]);
const FEED_MEDIA_MSGTYPES = new Set(["m.image", "m.video", "m.audio", "m.file"]);

export function isSetkaFeedVideoNote(post: Pick<SetkaFeedPost, "msgtype" | "body">): boolean {
    if (post.msgtype !== "m.video") return false;
    return post.body.trim().toLowerCase().startsWith("video-note");
}

function parseFeedPostFields(raw: Record<string, unknown>): { msgtype: string; body: string; mediaMxc?: string } {
    let msgtype = String(raw.msgtype ?? "").trim();
    let body = String(raw.body ?? "").trim();
    let mediaMxc = String(raw.media_mxc ?? "").trim() || undefined;

    if (!KNOWN_FEED_MSGTYPES.has(msgtype)) {
        if (msgtype.startsWith("mxc://")) {
            mediaMxc = msgtype;
            msgtype = "m.image";
        } else if (body.startsWith("mxc://") && msgtype) {
            mediaMxc = body;
            body = msgtype;
            msgtype = "m.text";
        } else if (msgtype) {
            body = msgtype;
            msgtype = "m.text";
        }
    }

    if (!mediaMxc && body.startsWith("mxc://")) {
        mediaMxc = body;
        body = "";
        if (!msgtype || msgtype === "m.text") {
            msgtype = "m.image";
        }
    }

    if (!msgtype) msgtype = "m.text";
    return { msgtype, body, mediaMxc };
}

function isVisibleInFeed(post: SetkaFeedPost): boolean {
    if (isSetkaFeedVideoNote(post) && post.mediaMxc) return true;
    if (post.body.trim() && !isSetkaFeedVideoNote(post)) return true;
    return Boolean(post.mediaMxc && FEED_MEDIA_MSGTYPES.has(post.msgtype));
}

function parseFeedPage(data: unknown): SetkaFeedPage {
    if (!data || typeof data !== "object") {
        return { posts: [] };
    }
    const raw = data as Record<string, unknown>;
    const array = Array.isArray(raw.posts) ? raw.posts : [];
    const posts: SetkaFeedPost[] = [];
    for (const item of array) {
        if (!item || typeof item !== "object") continue;
        const entry = item as Record<string, unknown>;
        const eventId = String(entry.event_id ?? "").trim();
        const roomId = String(entry.room_id ?? "").trim();
        if (!eventId || !roomId) continue;
        const fields = parseFeedPostFields(entry);
        posts.push({
            eventId,
            roomId,
            sender: String(entry.sender ?? ""),
            createdAt: Number(entry.created_at ?? 0),
            msgtype: fields.msgtype,
            body: fields.body,
            mediaMxc: fields.mediaMxc,
            commentCount: Number(entry.comment_count ?? 0),
            viewCount: Number(entry.view_count ?? 0),
            likeCount: Number(entry.like_count ?? 0),
            liked: Boolean(entry.liked),
            subscribed: Boolean(entry.subscribed),
            channelName: String(entry.room_name ?? "").trim() || undefined,
            channelAvatar: String(entry.room_avatar_url ?? "").trim() || undefined,
            categoryLabel: String(entry.category_label ?? "").trim() || undefined,
        });
    }
    const nextBatch = String(raw.next_batch ?? "").trim() || undefined;
    return { posts: posts.filter(isVisibleInFeed), nextBatch };
}

function parseChannelsPage(data: unknown): SetkaPublicChannelsPage {
    if (!data || typeof data !== "object") {
        return { channels: [] };
    }
    const raw = data as Record<string, unknown>;
    const array = Array.isArray(raw.channels) ? raw.channels : [];
    const channels: SetkaPublicChannel[] = [];
    for (const item of array) {
        if (!item || typeof item !== "object") continue;
        const entry = item as Record<string, unknown>;
        const roomId = String(entry.room_id ?? "").trim();
        const name = String(entry.name ?? entry.room_name ?? "").trim();
        if (!roomId || !name) continue;
        channels.push({
            roomId,
            name,
            topic: String(entry.topic ?? "").trim() || undefined,
            avatarUrl: String(entry.avatar_url ?? entry.room_avatar_url ?? "").trim() || undefined,
            memberCount: Number(entry.member_count ?? entry.number_of_members ?? 0),
            categoryLabel: String(entry.category_label ?? "").trim() || undefined,
        });
    }
    return {
        channels: channels.sort((a, b) => b.memberCount - a.memberCount),
        nextBatch: String(raw.next_batch ?? "").trim() || undefined,
    };
}

export async function fetchSetkaFeed(
    client: MatrixClient,
    mode: SetkaFeedMode,
    since?: string,
    limit = 20,
): Promise<SetkaFeedPage> {
    const params = new URLSearchParams({ mode, limit: String(limit) });
    if (since?.trim()) params.set("since", since.trim());
    const data = await setkaAuthedRequest<unknown>(client, Method.Get, `/setka/feed?${params.toString()}`);
    return parseFeedPage(data);
}

export async function fetchSetkaPublicChannels(
    client: MatrixClient,
    since?: string,
    limit = 80,
): Promise<SetkaPublicChannelsPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (since?.trim()) params.set("since", since.trim());
    const data = await setkaAuthedRequest<unknown>(
        client,
        Method.Get,
        `/setka/channels/public?${params.toString()}`,
    );
    return parseChannelsPage(data);
}

export async function recordSetkaFeedView(client: MatrixClient, eventId: string): Promise<void> {
    const encoded = encodeURIComponent(eventId);
    await setkaAuthedRequest(client, Method.Post, `/setka/feed/posts/${encoded}/view`, {});
}

export async function toggleSetkaFeedLike(
    client: MatrixClient,
    eventId: string,
): Promise<{ liked: boolean; likeCount: number }> {
    const encoded = encodeURIComponent(eventId);
    const data = await setkaAuthedRequest<{ liked?: boolean; like_count?: number }>(
        client,
        Method.Post,
        `/setka/feed/posts/${encoded}/like`,
        {},
    );
    return { liked: Boolean(data.liked), likeCount: Number(data.like_count ?? 0) };
}
