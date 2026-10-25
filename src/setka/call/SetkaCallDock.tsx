/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type FC, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { MediaTrack, RemoteRTCMember } from "@element-hq/matrixrtc-sdk";

import { SDKContext } from "../../contexts/SDKContext";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { useSetkaCallSession } from "./SetkaCallStore";
import { CallControls, stateLabel } from "./SetkaCallView";
import { useBehavior } from "./useBehavior";
import { playCallSound } from "./SetkaCallSounds";
import { SetkaCallAudio, useCallAudioPrefs } from "./SetkaCallAudio";
import { ReturnIcon } from "./SetkaCallIcons";

const AudioSink: FC<{ track: MediaTrack | undefined; userId: string }> = ({ track, userId }) => {
    const ref = useRef<HTMLAudioElement>(null);
    const prefs = useCallAudioPrefs();
    const kind = track?.source === "screenShareAudio" ? "screen" : "voice";
    const eff = prefs.effective(userId, kind);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.muted = eff.muted;
        el.volume = eff.volume;
    }, [eff.muted, eff.volume, track]);
    useEffect(() => {
        const el = ref.current;
        if (!el || !track) return;
        track.attach(el);
        const e = SetkaCallAudio.effective(userId, track.source === "screenShareAudio" ? "screen" : "voice");
        el.muted = e.muted;
        el.volume = e.volume;

        // Browsers may block autoplay; retry on the next user gesture so the call is never silent.
        const tryPlay = (): void => {
            el.play().then(
                () => removeListeners(),
                () => undefined,
            );
        };
        const removeListeners = (): void => {
            document.removeEventListener("pointerdown", tryPlay, true);
            document.removeEventListener("keydown", tryPlay, true);
        };
        document.addEventListener("pointerdown", tryPlay, true);
        document.addEventListener("keydown", tryPlay, true);
        tryPlay();
        // The stream may be swapped by the SDK after attach; keep it playing.
        el.addEventListener("loadedmetadata", tryPlay);
        return () => {
            removeListeners();
            el.removeEventListener("loadedmetadata", tryPlay);
            track.detach(el);
        };
    }, [track, userId]);
    return track ? <audio ref={ref} autoPlay playsInline /> : null;
};

/** Plays one remote member's microphone and screen-share audio. Always mounted while a call is active. */
const MemberAudio: FC<{ member: RemoteRTCMember }> = ({ member }) => {
    const tracks = useBehavior(member.tracks$) ?? [];
    // Every audio track of a remote member is played, whatever its declared source is.
    return (
        <>
            {tracks
                .filter((t) => t.kind === "audio")
                .map((t) => (
                    <AudioSink key={t.id} track={t} userId={member.userId} />
                ))}
        </>
    );
};

/**
 * Mounted once at the app root. Keeps the call audible no matter which screen is open and shows a
 * mini bar with the call controls when the user is not looking at the call.
 */
export const SetkaCallDock: FC = () => {
    const session = useSetkaCallSession();
    const roomViewStore = useContext(SDKContext).roomViewStore;
    const viewing = useSyncExternalStore(
        (cb) => {
            roomViewStore.on(UPDATE_EVENT, cb);
            return () => {
                roomViewStore.off(UPDATE_EVENT, cb);
            };
        },
        () => `${roomViewStore.getRoomId()}|${roomViewStore.isViewingCall()}`,
    );

    const participation = session?.active ?? null;
    const remotes = useBehavior(participation?.remoteMembers$) ?? [];
    const state = useBehavior(participation?.state$);

    // Sounds when someone joins / leaves (not for the initial roster).
    const knownIds = useRef<Set<string> | null>(null);
    const remoteKey = remotes.map((m) => m.memberId).join("|");
    const connected = state?.kind === "connected";
    useEffect(() => {
        if (!connected) {
            knownIds.current = null;
            return;
        }
        const ids = new Set(remoteKey ? remoteKey.split("|") : []);
        const prev = knownIds.current;
        knownIds.current = ids;
        if (!prev) return;
        let joined = false;
        let left = false;
        ids.forEach((id) => {
            if (!prev.has(id)) joined = true;
        });
        prev.forEach((id) => {
            if (!ids.has(id)) left = true;
        });
        if (joined) playCallSound("peerJoin");
        else if (left) playCallSound("peerLeave");
    }, [remoteKey, connected]);

    if (!session || !participation) return null;

    const [viewedRoomId, viewingCall] = viewing.split("|");
    const onCallScreen = viewedRoomId === session.room.roomId && viewingCall === "true";
    const label = stateLabel(state);
    void onCallScreen;

    return (
        <>
            <div className="mx_SetkaCallDock_audio" aria-hidden>
                {remotes.map((m) => (
                    <MemberAudio key={m.memberId} member={m} />
                ))}
            </div>
            {false && !onCallScreen && (
                <div className="mx_SetkaCallDock">
                    <div className="mx_SetkaCallDock_info">
                        <div className="mx_SetkaCallDock_title">{session.room.name}</div>
                        <div className="mx_SetkaCallDock_sub">{label ?? "Идёт звонок"}</div>
                    </div>
                    <button
                        className="mx_SetkaCall_btn"
                        title="Вернуться к звонку"
                        onClick={() =>
                            defaultDispatcher.dispatch<ViewRoomPayload>({
                                action: Action.ViewRoom,
                                room_id: session.room.roomId,
                                view_call: true,
                                metricsTrigger: undefined,
                            })
                        }
                    >
                        <ReturnIcon />
                    </button>
                    <CallControls session={session} participation={participation} compact />
                </div>
            )}
        </>
    );
};
