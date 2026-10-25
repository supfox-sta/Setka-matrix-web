/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { ClientEvent, type MatrixClient, type Room, SyncState } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { logger } from "matrix-js-sdk/src/logger";

import { Action } from "../dispatcher/actions";
import { type AfterLeaveRoomPayload } from "../dispatcher/payloads/AfterLeaveRoomPayload";
import dis from "../dispatcher/dispatcher";
import DMRoomMap from "../utils/DMRoomMap";
import { isSetkaHomeserver } from "./SetkaConfig";

function shouldForgetLeftRoom(room: Room): boolean {
    if (room.isSpaceRoom()) return false;
    const membership = room.getMyMembership();
    return membership === KnownMembership.Leave || membership === KnownMembership.Ban;
}

function forgetRoomQuietly(client: MatrixClient, roomId: string): void {
    client.forget(roomId).catch((err) => {
        logger.warn("Setka: failed to forget room", roomId, err);
    });
}

/** Remove left/banned rooms from the local store so they do not reappear in the list. */
export function forgetSetkaLeftRooms(client: MatrixClient): void {
    if (!isSetkaHomeserver(client)) return;
    for (const room of client.getRooms()) {
        if (shouldForgetLeftRoom(room)) {
            forgetRoomQuietly(client, room.roomId);
        }
    }
}

/** Forget DM rooms with a user when membership is leave/ban (e.g. before reopening BotCreator). */
export function forgetLeftDmRoomsWithUser(client: MatrixClient, userId: string): void {
    if (!isSetkaHomeserver(client)) return;
    const roomIds = DMRoomMap.shared().getDMRoomsForUserId(userId);
    for (const roomId of roomIds) {
        const room = client.getRoom(roomId);
        if (room && shouldForgetLeftRoom(room)) {
            forgetRoomQuietly(client, roomId);
        }
    }
}

/**
 * On Setka homeservers: hide left rooms from the list and forget them locally after leave / sync.
 */
export function initSetkaLeftRooms(client: MatrixClient): () => void {
    if (!isSetkaHomeserver(client)) {
        return () => undefined;
    }

    let cleanedAfterSync = false;

    const onSync = (state: SyncState): void => {
        if (!cleanedAfterSync && state === SyncState.Prepared) {
            cleanedAfterSync = true;
            forgetSetkaLeftRooms(client);
        }
    };

    const onAction = (payload: AfterLeaveRoomPayload): void => {
        if (payload.action !== Action.AfterLeaveRoom) return;
        forgetRoomQuietly(client, payload.room_id);
    };

    client.on(ClientEvent.Sync, onSync);
    const dispatcherRef = dis.register(onAction);

    return () => {
        client.removeListener(ClientEvent.Sync, onSync);
        dis.unregister(dispatcherRef);
    };
}
