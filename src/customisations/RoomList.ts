/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { type Room } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import type { RoomListCustomisations as IRoomListCustomisations } from "@element-hq/element-web-module-api";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { isSetkaHomeserver } from "../setka/SetkaConfig";

export const RoomListCustomisations: IRoomListCustomisations<Room> = {
    isRoomVisible(room: Room): boolean {
        const client = MatrixClientPeg.get();
        if (!client || !isSetkaHomeserver(client)) {
            return true;
        }
        const membership = room.getMyMembership();
        if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
            return false;
        }
        return true;
    },
};
