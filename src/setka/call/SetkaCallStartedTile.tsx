/*
Setka: timeline content for m.rtc.notification events. Never throws. It renders inside the normal
message bubble (sender, time and bubble come from the timeline), so a call reads like any message.
*/

import React, { type JSX, useEffect, useState } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { useSetkaCallSession } from "./SetkaCallStore";
import { CameraIcon, MicIcon } from "./SetkaCallIcons";

interface Live {
    count: number;
    startedTs: number;
}

/** Reads who is in the room's call right now; refreshed on a timer, never throws. */
function useLiveCall(roomId: string | undefined): Live {
    const [live, setLive] = useState<Live>({ count: 0, startedTs: 0 });
    useEffect(() => {
        if (!roomId) return;
        const read = (): void => {
            try {
                const client = MatrixClientPeg.get();
                const room = client?.getRoom(roomId);
                if (!client || !room) return;
                const ms = client.matrixRTC.getRoomSession(room).memberships;
                const startedTs = ms.length ? Math.min(...ms.map((m) => m.createdTs?.() ?? Date.now())) : 0;
                setLive((p) => (p.count === ms.length && p.startedTs === startedTs ? p : { count: ms.length, startedTs }));
            } catch {
                // ignore
            }
        };
        read();
        const id = window.setInterval(read, 2000);
        return () => window.clearInterval(id);
    }, [roomId]);
    return live;
}

export function SetkaCallStartedTile({ mxEvent }: { mxEvent: MatrixEvent }): JSX.Element | null {
    const session = useSetkaCallSession();
    const roomId = mxEvent.getRoomId();
    const live = useLiveCall(roomId);
    if (!roomId) return null;

    const content = (mxEvent.getContent() ?? {}) as Record<string, unknown>;
    const voice = content["m.call.intent"] === "audio";
    const inThisCall = !!session && session.room.roomId === roomId;
    // The event belongs to the call that is running now if it was sent around/after that call started.
    const isLive = live.count > 0 && mxEvent.getTs() >= live.startedTs - 120_000;

    const join = (): void => {
        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: roomId,
            view_call: true,
            voiceOnly: voice,
            skipLobby: true,
            metricsTrigger: undefined,
        });
    };

    return (
        <div className="mx_SetkaCallTile" data-live={isLive || undefined}>
            <span className="mx_SetkaCallTile_icon">
                {voice ? <MicIcon width={18} height={18} /> : <CameraIcon width={18} height={18} />}
            </span>
            <span className="mx_SetkaCallTile_text">
                {voice ? "Голосовой звонок" : "Видеозвонок"}
                {" · "}
                <span className="mx_SetkaCallTile_state">
                    {isLive ? `идёт сейчас, в звонке: ${live.count}` : "завершён"}
                </span>
            </span>
            {isLive && (
                <button type="button" className="mx_SetkaCallTile_join" onClick={join}>
                    {inThisCall ? "Открыть" : "Присоединиться"}
                </button>
            )}
        </div>
    );
}
