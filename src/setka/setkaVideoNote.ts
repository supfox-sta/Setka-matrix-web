/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import {
    MsgType,
    THREAD_RELATION_TYPE,
    type IEventRelation,
    type MatrixClient,
    type MatrixEvent,
} from "matrix-js-sdk/src/matrix";

import { uploadFile } from "../ContentMessages";
import { attachRelation } from "../utils/messages";
import { SETKA_VIDEO_NOTE_KEY } from "./setkaVideoNoteConstants";

export { SETKA_VIDEO_NOTE_KEY } from "./setkaVideoNoteConstants";

export function isSetkaVideoNote(mxEvent: MatrixEvent): boolean {
    const content = mxEvent.getContent();
    if (content[SETKA_VIDEO_NOTE_KEY]) return true;
    const body = content.body;
    return typeof body === "string" && body.toLowerCase().startsWith("video-note");
}

export async function sendSetkaVideoNote(
    client: MatrixClient,
    roomId: string,
    blob: Blob,
    relation?: IEventRelation,
): Promise<void> {
    const mimeType = blob.type?.startsWith("video/") ? blob.type : "video/webm";
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const file = new File([blob], `video-note.${extension}`, { type: mimeType });

    const content: Record<string, unknown> = {
        body: "video-note",
        msgtype: MsgType.Video,
        [SETKA_VIDEO_NOTE_KEY]: true,
        info: {
            mimetype: mimeType,
            w: 480,
            h: 480,
            size: file.size,
        },
    };

    attachRelation(content, relation);

    const upload = await uploadFile(client, roomId, file);
    content.url = upload.url;
    content.file = upload.file;

    const threadId = relation?.rel_type === THREAD_RELATION_TYPE.name ? relation.event_id : null;
    await client.sendMessage(roomId, threadId ?? null, content);
}
