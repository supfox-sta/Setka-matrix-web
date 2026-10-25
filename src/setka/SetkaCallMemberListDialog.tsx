/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";

import BaseDialog from "../components/views/dialogs/BaseDialog";
import MemberListView from "../components/views/rooms/MemberList/MemberListView";
import Modal from "../Modal";

interface Props {
    roomId: string;
    onFinished: () => void;
}

/**
 * Member list as an overlay dialog while a Setka call is active,
 * so opening people does not steal the call chat panel.
 */
const SetkaCallMemberListDialog: React.FC<Props> = ({ roomId, onFinished }) => {
    return (
        <BaseDialog
            className="mx_SetkaCallMemberListDialog"
            onFinished={onFinished}
            hasCancel={false}
            fixedWidth={false}
        >
            <div className="mx_SetkaCallMemberListDialog_body">
                <MemberListView roomId={roomId} onClose={onFinished} />
            </div>
        </BaseDialog>
    );
};

export function openSetkaCallMemberListDialog(roomId: string): void {
    Modal.createDialog(
        SetkaCallMemberListDialog,
        { roomId },
        "mx_SetkaCallMemberListDialog_wrapper",
        false,
        true,
    );
}

export default SetkaCallMemberListDialog;
