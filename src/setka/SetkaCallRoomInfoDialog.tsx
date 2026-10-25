/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";

import BaseDialog from "../components/views/dialogs/BaseDialog";
import RoomAvatar from "../components/views/avatars/RoomAvatar";
import Modal from "../Modal";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { openSetkaCallMemberListDialog } from "./SetkaCallMemberListDialog";
import DMRoomMap from "../utils/DMRoomMap";
import RoomSettingsDialog from "../components/views/dialogs/RoomSettingsDialog";

interface Props {
    roomId: string;
    onFinished: () => void;
}

/** Room info as a modal while a call is on screen, so the chat next to the call is never replaced. */
const SetkaCallRoomInfoDialog: React.FC<Props> = ({ roomId, onFinished }) => {
    const room = MatrixClientPeg.get()?.getRoom(roomId);
    if (!room) return null;
    const topic = (room.currentState.getStateEvents("m.room.topic", "")?.getContent() as { topic?: string })?.topic;
    const members = room.getJoinedMemberCount();
    // Private chats have no room settings: users must not be able to break them.
    const isDm = Boolean(DMRoomMap.shared().getUserIdForRoomId(roomId));

    return (
        <BaseDialog className="mx_SetkaCallRoomInfo" onFinished={onFinished} hasCancel fixedWidth={false}>
            <div className="mx_SetkaCallRoomInfo_body">
                <RoomAvatar room={room} size="96px" />
                <h2>{room.name}</h2>
                {topic && <p className="mx_SetkaCallRoomInfo_topic">{topic}</p>}
                <p className="mx_SetkaCallRoomInfo_meta">Участников: {members}</p>
                <div className="mx_SetkaCallRoomInfo_actions">
                    <button
                        type="button"
                        onClick={() => {
                            onFinished();
                            openSetkaCallMemberListDialog(roomId);
                        }}
                    >
                        Участники
                    </button>
                    {!isDm && (
                        <button
                            type="button"
                            onClick={() => {
                                onFinished();
                                Modal.createDialog(RoomSettingsDialog, { roomId }, "mx_RoomSettingsDialog", false, true);
                            }}
                        >
                            Настройки комнаты
                        </button>
                    )}
                </div>
            </div>
        </BaseDialog>
    );
};

export function openSetkaCallRoomInfoDialog(roomId: string): void {
    Modal.createDialog(SetkaCallRoomInfoDialog, { roomId }, "mx_SetkaCallRoomInfo_wrapper", false, true);
}

export default SetkaCallRoomInfoDialog;
