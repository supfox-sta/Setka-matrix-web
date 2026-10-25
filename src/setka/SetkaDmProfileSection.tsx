/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";
import { type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";

import { useDmMember } from "../components/views/avatars/WithPresenceIndicator";
import SetkaUserProfileSection from "./SetkaUserProfileSection";

interface Props {
    client: MatrixClient;
    room: Room;
    displayName: string;
}

const SetkaDmProfileSection: React.FC<Props> = ({ client, room, displayName }) => {
    const dmMember = useDmMember(room);
    const userId = dmMember?.userId;
    if (!userId) return null;

    return (
        <SetkaUserProfileSection
            client={client}
            userId={userId}
            displayName={displayName}
            avatarMxcUrl={dmMember?.getMxcAvatarUrl()}
        />
    );
};

export default SetkaDmProfileSection;
