/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";
import classNames from "classnames";
import { type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import { ThreadsIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { isMessageEvent } from "../events/EventTileFactory";
import { isSetkaHomeserver } from "./SetkaConfig";
import { isSetkaChannelRoom } from "./setkaChannelUtils";
import { isSetkaVideoNote } from "./setkaVideoNote";

interface Props {
    mxEvent: MatrixEvent;
    room: Room;
    timelineRenderingType: TimelineRenderingType;
    isOwnEvent: boolean;
}

function openDiscussion(mxEvent: MatrixEvent): void {
    defaultDispatcher.dispatch({
        action: Action.ShowThread,
        rootEvent: mxEvent,
        push: true,
    });
}

const SetkaChannelCommentsRow: React.FC<Props> = ({
    mxEvent,
    room,
    timelineRenderingType,
    isOwnEvent,
}) => {
    const client = room.client;
    if (!client || !isSetkaHomeserver(client)) return null;
    if (!isSetkaChannelRoom(room)) return null;
    if (timelineRenderingType !== TimelineRenderingType.Room) return null;
    if (mxEvent.isRedacted() || mxEvent.isThreadReply) return null;
    if (!isMessageEvent(mxEvent) && mxEvent.getType() !== "m.sticker") return null;
    if (isSetkaVideoNote(mxEvent)) return null;

    const thread = mxEvent.getThread() ?? room.findThreadForEvent(mxEvent);
    const replyCount = thread?.length ?? 0;

    return (
        <AccessibleButton
            className={classNames("mx_SetkaChannelCommentsRow", {
                mx_SetkaChannelCommentsRow_own: isOwnEvent,
            })}
            onClick={() => openDiscussion(mxEvent)}
        >
            <ThreadsIcon width={18} height={18} />
            <span>
                {replyCount > 0
                    ? _t("setka|channel|replies", { count: replyCount })
                    : _t("setka|channel|comments")}
            </span>
        </AccessibleButton>
    );
};

export default SetkaChannelCommentsRow;
