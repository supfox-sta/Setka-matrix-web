/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type Room } from "matrix-js-sdk/src/matrix";

import { setkaContactsStore } from "./setkaContactsStore";

export function getSetkaContactRoomName(roomId: string): string | undefined {
    return setkaContactsStore.getContactDisplayName(roomId);
}

export function resolveSetkaRoomDisplayName(room: Room, fallback = ""): string {
    const contactName = getSetkaContactRoomName(room.roomId);
    if (contactName) return contactName;
    return room.name || fallback;
}
