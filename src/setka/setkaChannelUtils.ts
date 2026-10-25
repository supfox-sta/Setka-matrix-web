/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { EventType, M_BEACON_INFO, M_POLL_START, type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";

import { MatrixClientPeg } from "../MatrixClientPeg";
import { ElementCallEventType } from "../call-types";

const CHANNEL_TOPIC_PREFIX = "setka:channel";
const CHANNEL_TAG_PATTERN = /^[a-z0-9_]{3,32}$/i;

/** Matches Android SetkaChannelConfig.MODERATOR_POWER_LEVEL */
export const SETKA_CHANNEL_MODERATOR_POWER_LEVEL = 50;

export function normalizeChannelTag(raw?: string | null): string | null {
    const trimmed = raw?.trim().replace(/^#/, "").trim() ?? "";
    if (!trimmed) return null;
    return CHANNEL_TAG_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function formatChannelTopic(userDescription?: string | null, tag?: string | null): string {
    const normalizedTag = normalizeChannelTag(tag);
    const trimmed = userDescription?.trim() ?? "";
    let topic = CHANNEL_TOPIC_PREFIX;
    if (normalizedTag) {
        topic += ` #${normalizedTag}`;
    }
    if (trimmed) {
        topic += ` ${trimmed}`;
    }
    return topic;
}

export function parseChannelTag(topic?: string | null): string | null {
    if (typeof topic !== "string" || !topic.trim().toLowerCase().startsWith(CHANNEL_TOPIC_PREFIX)) return null;
    const remainder = topic.trim().slice(CHANNEL_TOPIC_PREFIX.length).trim();
    if (!remainder) return null;
    const firstToken = remainder.split(/\s/)[0]?.trim() ?? "";
    if (!firstToken.startsWith("#")) return null;
    return normalizeChannelTag(firstToken);
}

export function isSetkaChannelRoom(room?: Room | null): boolean {
    if (!room) return false;
    const topic = room.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic;
    return typeof topic === "string" && topic.startsWith(CHANNEL_TOPIC_PREFIX);
}

/** Hide system/info timeline events in Setka channel rooms. */
export function shouldHideSetkaChannelTimelineEvent(ev: MatrixEvent): boolean {
    const client = MatrixClientPeg.get();
    if (!client) return false;

    const room = client.getRoom(ev.getRoomId() ?? "");
    if (!isSetkaChannelRoom(room)) return false;

    const type = ev.getType();
    if (type === EventType.RoomMessage || type === EventType.RoomMessageEncrypted) return false;
    if (type === EventType.Sticker) return false;
    if (type === EventType.CallInvite || ElementCallEventType.matches(type)) return false;
    if (type === EventType.RTCNotification) return false;
    if (M_POLL_START.matches(type) || M_BEACON_INFO.matches(type)) return false;

    return true;
}

export function canPostToSetkaChannelMainFeed(room: Room, userId: string): boolean {
    const member = room.getMember(userId);
    if (!member) return false;
    return member.powerLevel >= SETKA_CHANNEL_MODERATOR_POWER_LEVEL;
}

export function canEditSetkaChannel(room: Room, userId: string): boolean {
    return canPostToSetkaChannelMainFeed(room, userId);
}

export function getSetkaChannelDescription(room?: Room | null): string {
    if (!room) return "";
    const topic = room.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic;
    if (typeof topic !== "string" || !topic.startsWith(CHANNEL_TOPIC_PREFIX)) return "";
    const withoutPrefix = topic.slice(CHANNEL_TOPIC_PREFIX.length).trim();
    const hashIndex = withoutPrefix.indexOf("#");
    if (hashIndex === -1) return withoutPrefix.trim();
    const afterTag = withoutPrefix.slice(hashIndex + 1).trim();
    const spaceIndex = afterTag.indexOf(" ");
    return (spaceIndex === -1 ? afterTag : afterTag.slice(spaceIndex + 1)).trim();
}
