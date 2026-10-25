/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { Action } from "../dispatcher/actions";
import defaultDispatcher from "../dispatcher/dispatcher";
import { type ViewRoomPayload } from "../dispatcher/payloads/ViewRoomPayload";
import createRoom from "../createRoom";
import { findDMForUser } from "../utils/dm/findDMForUser";
import { forgetLeftDmRoomsWithUser } from "./setkaLeftRooms";

/** Matrix localpart; Setka bots are always registered as `{username}_bot`. */
export const SETKA_BOTCREATOR_LOCALPART = "bottool_bot";

export function getSetkaBotCreatorUserId(client: MatrixClient): string {
    return `@${SETKA_BOTCREATOR_LOCALPART}:${client.getDomain()}`;
}

/** Open an active DM with BotCreator or start a new one (skips stale left rooms). */
export function openSetkaBotCreatorChat(client: MatrixClient): void {
    const userId = getSetkaBotCreatorUserId(client);
    forgetLeftDmRoomsWithUser(client, userId);

    const existingDm = findDMForUser(client, userId);
    if (existingDm) {
        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: existingDm.roomId,
            metricsTrigger: "MessageUser",
        });
        return;
    }

    void createRoom(client, {
        dmUserId: userId,
        encryption: false,
        andView: true,
    });
}
