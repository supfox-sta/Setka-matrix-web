/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixEvent, MsgType, type MatrixClient, EventType } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import { isVoiceMessage } from "../utils/EventUtils";
import { isSetkaHomeserver } from "./SetkaConfig";
import { isSetkaVideoNote } from "./setkaVideoNote";

/** Hide avatar-only membership notifications in Setka. */
export function setkaShouldHideMembershipEvent(ev: MatrixEvent): boolean {
    if (ev.getType() !== EventType.RoomMember) return false;
    const content = ev.getContent();
    const prev = ev.getPrevContent();
    const avatarChanged =
        (content.avatar_url ?? null) !== (prev?.avatar_url ?? null) ||
        (content.url ?? null) !== (prev?.url ?? null);
    const nameChanged = (content.displayname ?? null) !== (prev?.displayname ?? null);
    return avatarChanged && !nameChanged;
}

/** Custom room-list / notification preview for media messages. */
export function setkaMessagePreviewText(ev: MatrixEvent, client: MatrixClient): string | null {
    if (!isSetkaHomeserver(client)) return null;
    if (ev.getType() !== EventType.RoomMessage && ev.getType() !== EventType.RoomMessageEncrypted) {
        return null;
    }

    if (isSetkaVideoNote(ev)) {
        return _t("setka|preview|video_note");
    }
    if (isVoiceMessage(ev)) {
        return _t("setka|preview|voice");
    }

    const msgtype = ev.getContent().msgtype;
    if (msgtype === MsgType.Image) {
        return _t("setka|preview|image");
    }
    if (msgtype === MsgType.Video) {
        return _t("setka|preview|video");
    }
    return null;
}
