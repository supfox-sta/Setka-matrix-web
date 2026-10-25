/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type FC, useContext, useEffect, useRef, useState, type AriaRole } from "react";
import type { Room } from "matrix-js-sdk/src/matrix";
import { CallType } from "matrix-js-sdk/src/webrtc/call";

import { type Call, CallEvent } from "../../../models/Call";
import { CallStore } from "../../../stores/CallStore";
import { SDKContext } from "../../../contexts/SDKContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import { isVideoRoom } from "../../../utils/video-rooms";
import { SetkaCallView } from "../../../setka/call/SetkaCallView";
import { SetkaCallLobby } from "../../../setka/call/SetkaCallLobby";
import { SetkaCallStore, useSetkaCallSession } from "../../../setka/call/SetkaCallStore";

interface NativeElementCallViewProps {
    room: Room;
    resizing: boolean;
    call: Call;
    role?: AriaRole;
    onClose: () => void;
}

/**
 * In-client call: MatrixRTC + LiveKit through Element Call's headless SDK, rendered with Setka's
 * own UI (src/setka/call). No iframe, no widget API, no Element Call UI.
 *
 * The call itself lives in SetkaCallStore, so this view only starts it (once) and displays it:
 * switching rooms does not hang up. Video rooms show a lobby with a Join button first.
 */
export const NativeElementCallView: FC<NativeElementCallViewProps> = ({ room, call, role, onClose }) => {
    const client = useContext(SDKContext).client;
    const session = useSetkaCallSession();
    const alreadyRunning = session?.room.roomId === room.roomId;
    // After leaving a video room the lobby comes back (even if we originally skipped it).
    const [returnToLobby, setReturnToLobby] = useState(false);
    const needsLobby = isVideoRoom(room) && (call.widgetGenerationParameters.skipLobby !== true || returnToLobby);
    const [lobbyChoice, setLobbyChoice] = useState<null | { video: boolean }>(null);
    const waitingInLobby = needsLobby && !alreadyRunning && lobbyChoice === null;

    const wasInCall = useRef(false);
    useEffect(() => {
        if (alreadyRunning) {
            wasInCall.current = true;
        } else if (wasInCall.current) {
            // We left the call: forget the previous lobby choice so the next join is a fresh one.
            wasInCall.current = false;
            setLobbyChoice(null);
            setReturnToLobby(true);
        }
    }, [alreadyRunning]);

    useEffect(() => {
        if (!client || waitingInLobby) return;
        const store = SetkaCallStore.instance;
        if (store.session?.room.roomId === room.roomId) return;

        // One call at a time: leave a call that is running in another room.
        const others = [...CallStore.instance.connectedCalls].filter((c) => c.roomId !== room.roomId);
        others.forEach((c) => void c.disconnect());

        const isDM = Boolean(DMRoomMap.shared().getUserIdForRoomId(room.roomId));
        const wantsVideo = lobbyChoice ? lobbyChoice.video : call.callType !== CallType.Voice;
        const intent = wantsVideo ? "video" : "audio";
        // Only the first person into an empty call notifies; joining a running call is silent.
        const someoneElseInCall = [...call.participants.keys()].some((m) => m.userId !== client.getSafeUserId());
        const notify = someoneElseInCall ? undefined : isDM ? "ring" : "notification";

        store.start(client, room, { intent, notify }, call);
    }, [client, room, call, waitingInLobby, lobbyChoice]);

    // When the Call model is closed from elsewhere (header, PiP close), the UI closes too.
    useEffect(() => {
        call.on(CallEvent.Close, onClose);
        return () => {
            call.off(CallEvent.Close, onClose);
        };
    }, [call, onClose]);

    if (!client) return null;

    if (waitingInLobby) {
        return (
            <div className="mx_CallView mx_CallView_native" role={role}>
                <SetkaCallLobby
                    roomName={room.name}
                    participants={call.participants.size}
                    onJoin={(video) => setLobbyChoice({ video })}
                />
            </div>
        );
    }

    return (
        <div className="mx_CallView mx_CallView_native" role={role}>
            <SetkaCallView roomId={room.roomId} />
        </div>
    );
};
