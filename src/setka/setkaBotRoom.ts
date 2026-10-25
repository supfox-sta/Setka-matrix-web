/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { EventType, type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import { isSetkaHomeserver } from "./SetkaConfig";

/** Setka bots are registered as `{username}_bot` on the homeserver. */
export function isSetkaBotUserId(userId: string): boolean {
    const localpart = userId.split(":")[0]?.replace(/^@/, "") ?? "";
    return localpart.endsWith("_bot");
}

function joinedSetkaBots(room: Room): string[] {
    return room
        .getJoinedMembers()
        .map((m) => m.userId)
        .filter((id) => isSetkaBotUserId(id));
}

/**
 * True in a 1:1 room with a Setka bot (Start button, hide rename, etc.).
 */
export function isSetkaBotDirectMessage(room: Room, client?: MatrixClient | null): boolean {
    const cli = client ?? room.client;
    if (!isSetkaHomeserver(cli)) return false;
    if (room.isSpaceRoom()) return false;

    const myMembership = room.getMyMembership();
    if (myMembership !== KnownMembership.Join && myMembership !== KnownMembership.Invite) {
        return false;
    }

    const members = room.getJoinedMembers();
    if (members.length !== 2) return false;

    const myId = cli.getUserId();
    if (!myId) return false;

    const other = members.find((m) => m.userId !== myId);
    return other ? isSetkaBotUserId(other.userId) : false;
}

/**
 * Skip Element slash-command handling and autocomplete when Setka bots are present.
 * Lets `/ping`, `/help`, etc. reach bots in groups instead of Element's `/commands`.
 */
export function shouldBypassSetkaBotSlashCommands(room: Room, client?: MatrixClient | null): boolean {
    const cli = client ?? room.client;
    if (!isSetkaHomeserver(cli)) return false;
    if (room.isSpaceRoom()) return false;

    const myMembership = room.getMyMembership();
    if (myMembership !== KnownMembership.Join && myMembership !== KnownMembership.Invite) {
        return false;
    }

    if (isSetkaBotDirectMessage(room, cli)) return true;

    return joinedSetkaBots(room).length > 0;
}

/**
 * Bot DM not started yet — current user has not sent any room message.
 * Used to show a Start button instead of the composer.
 */
export function isSetkaBotDmNotStarted(room: Room, client?: MatrixClient | null): boolean {
    if (!isSetkaBotDirectMessage(room, client)) return false;
    const cli = client ?? room.client;
    const myId = cli.getUserId();
    if (!myId) return true;
    const timeline = room.getLiveTimeline().getEvents();
    return !timeline.some((ev) => ev.getSender() === myId && ev.getType() === EventType.RoomMessage);
}

/** Peer bot MXID in a 1:1 Setka bot DM, or null. */
export function getSetkaBotPeerUserId(room: Room, client?: MatrixClient | null): string | null {
    if (!isSetkaBotDirectMessage(room, client)) return null;
    const cli = client ?? room.client;
    const myId = cli.getUserId();
    if (!myId) return null;
    const other = room.getJoinedMembers().find((m) => m.userId !== myId);
    return other?.userId ?? null;
}

function stripBom(text: string): string {
    return text.replace(/^\ufeff/, "").trim();
}

function textMentionsBot(text: string, botUserId: string): boolean {
    const localpart = botUserId.split(":")[0]?.replace(/^@/, "") ?? "";
    if (!localpart) return false;
    const domain = botUserId.split(":")[1] ?? "";
    const raw = stripBom(text);
    const lower = raw.toLowerCase();

    if (lower.includes(`@${localpart.toLowerCase()}`)) return true;
    if (lower.includes(botUserId.toLowerCase())) return true;
    if (domain && lower.includes(`@${localpart.toLowerCase()}:${domain.toLowerCase()}`)) return true;
    if (domain && lower.includes(`@${localpart.toLowerCase()}:${domain.toLowerCase()}:`)) return true;

    // Element pill body: "fenik_bot: /ping" (no @ in text)
    if (new RegExp(`^${localpart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*\\S`, "i").test(raw)) {
        return true;
    }
    return false;
}

function isBareGroupBotCommand(text: string): boolean {
    return stripBom(text).startsWith("/");
}

/**
 * Bots to relay plaintext to (E2EE): 1:1 peer bot, @mentioned bots, or bare /command in a group with bots.
 */
export function getSetkaBotRelayTargets(
    room: Room,
    messageText: string,
    client?: MatrixClient | null,
): string[] {
    const cli = client ?? room.client;
    if (!isSetkaHomeserver(cli)) return [];

    const peer = getSetkaBotPeerUserId(room, cli);
    if (peer) return [peer];

    const bots = joinedSetkaBots(room);
    if (!bots.length || room.getJoinedMembers().length <= 2) return [];

    if (isBareGroupBotCommand(messageText)) {
        return bots;
    }

    const mentioned = bots.filter((id) => textMentionsBot(messageText, id));
    return [...new Set(mentioned)];
}
