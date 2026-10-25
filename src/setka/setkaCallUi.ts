/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";

import { isSetkaHomeserver } from "./SetkaConfig";
import { openSetkaCallMemberListDialog } from "./SetkaCallMemberListDialog";
import RightPanelStore from "../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../stores/right-panel/RightPanelStorePhases";
import { SDKContextClass } from "../contexts/SDKContextClass";
import { isVideoRoom } from "../utils/video-rooms";

/** True when Setka is on the call / video-room stage (chat lives in the right panel). */
export function isSetkaViewingCall(client?: MatrixClient | null, room?: Room | null): boolean {
    if (!isSetkaHomeserver(client)) return false;
    if (room && isVideoRoom(room)) return true;
    return Boolean(SDKContextClass.instance.roomViewStore.isViewingCall());
}

/**
 * Open people list without replacing the call chat panel.
 * Returns true when handled (caller should not open RightPanel MemberList).
 */
export function openSetkaCallPeopleIfNeeded(
    client: MatrixClient | null | undefined,
    roomId: string,
    room?: Room | null,
): boolean {
    if (!isSetkaViewingCall(client, room ?? client?.getRoom(roomId))) return false;
    openSetkaCallMemberListDialog(roomId);
    // Keep / restore timeline in the call chat column
    const store = RightPanelStore.instance;
    if (!store.isOpenForRoom(roomId) || store.currentCardForRoom(roomId)?.phase !== RightPanelPhases.Timeline) {
        store.setCard({ phase: RightPanelPhases.Timeline }, true, roomId);
    }
    return true;
}

/** Ensure call chat (Timeline) is open in the right panel. */
export function ensureSetkaCallChatOpen(roomId: string): void {
    RightPanelStore.instance.setCard({ phase: RightPanelPhases.Timeline }, true, roomId);
}

/** Toggle call chat: open Timeline, or collapse panel for near-fullscreen call. */
export function toggleSetkaCallChat(roomId: string): void {
    const store = RightPanelStore.instance;
    const open = store.isOpenForRoom(roomId);
    const phase = store.currentCardForRoom(roomId)?.phase;

    if (open && phase === RightPanelPhases.Timeline) {
        store.hide(roomId);
        return;
    }

    store.setCard({ phase: RightPanelPhases.Timeline }, true, roomId);
}
