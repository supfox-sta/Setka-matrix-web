/*
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type Room, RoomEvent } from "matrix-js-sdk/src/matrix";
import { useEffect, useState } from "react";

import { type IOOBData } from "../stores/ThreepidInviteStore";
import { useTypedEventEmitter } from "./useEventEmitter";
import { _t } from "../languageHandler";
import { isSetkaHomeserver } from "../setka/SetkaConfig";
import { setkaContactsStore, subscribeSetkaContacts } from "../setka/setkaContactsStore";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { getSetkaContactRoomName } from "../setka/setkaRoomName";

const getRoomName = (room?: Room, oobName = ""): string => {
    if (!room) return oobName;
    const client = MatrixClientPeg.get();
    if (client && isSetkaHomeserver(client)) {
        const contactName = getSetkaContactRoomName(room.roomId);
        if (contactName) return contactName;
    }
    return room.name || oobName;
};

/**
 * Determines the room name from a combination of the room model and potential
 * out-of-band information
 * @param room - The room model
 * @param oobData - out-of-band information about the room
 * @returns {string} the room name
 */
export function useRoomName(room?: Room, oobData?: IOOBData): string {
    let oobName = _t("common|unnamed_room");
    if (oobData && oobData.name) {
        oobName = oobData.name;
    }

    const [name, setName] = useState<string>(getRoomName(room, oobName));

    useTypedEventEmitter(room, RoomEvent.Name, () => {
        setName(getRoomName(room, oobName));
    });

    useEffect(() => {
        const client = MatrixClientPeg.get();
        if (!client || !room || !isSetkaHomeserver(client)) return;
        void setkaContactsStore.ensureLoaded(client);
        return subscribeSetkaContacts(() => setName(getRoomName(room, oobName)));
    }, [room, oobName]);

    useEffect(() => {
        setName(getRoomName(room, oobName));
    }, [room, oobName]);

    return name;
}
