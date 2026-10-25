/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type FC, useCallback, useContext, useEffect, useRef, useState } from "react";
import { type MatrixEvent, RoomEvent, EventType } from "matrix-js-sdk/src/matrix";
import { type IRTCNotificationContent } from "matrix-js-sdk/src/matrixrtc";

import { SDKContext } from "../../contexts/SDKContext";
import RoomAvatar from "../../components/views/avatars/RoomAvatar";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { type ActionPayload } from "../../dispatcher/payloads";
import { useDispatcher } from "../../hooks/useDispatcher";
import ToastStore from "../../stores/ToastStore";
import DMRoomMap from "../../utils/DMRoomMap";
import { AudioID } from "../../LegacyCallHandler";
import { getNotificationEventSendTs } from "../../toasts/IncomingCallToast";
import { CameraIcon, HangupIcon } from "./SetkaCallIcons";
import { useSetkaCallSession } from "./SetkaCallStore";

const MAX_RING_TIME_MS = 90 * 1000;

/** Discord-style incoming call card: big avatar, who is calling, decline / accept buttons. */
export const SetkaIncomingCallToast: FC<{ notificationEvent: MatrixEvent; toastKey: string }> = ({
    notificationEvent,
    toastKey,
}) => {
    const sdk = useContext(SDKContext);
    const roomId = notificationEvent.getRoomId()!;
    const content = notificationEvent.getContent() as Partial<IRTCNotificationContent>;
    const room = sdk.client?.getRoom(roomId) ?? undefined;
    const isVoice = content["m.call.intent"] === "audio";
    const isRing = content.notification_type === "ring";
    const session = useSetkaCallSession();
    const busyElsewhere = !!session && session.room.roomId !== roomId;
    const [declining, setDeclining] = useState(false);
    const ringing = useRef(false);

    const dismiss = useCallback((): void => {
        ToastStore.sharedInstance().dismissToast(toastKey);
        sdk.legacyCallHandler.pause(AudioID.Ring);
    }, [toastKey, sdk.legacyCallHandler]);

    // Ring only for direct calls (notification_type "ring").
    useEffect(() => {
        if (isRing && !ringing.current && !sdk.legacyCallHandler.isPlaying(AudioID.Ring)) {
            ringing.current = true;
            void sdk.legacyCallHandler.play(AudioID.Ring);
        }
        return () => {
            if (ringing.current) sdk.legacyCallHandler.pause(AudioID.Ring);
        };
    }, [isRing, sdk.legacyCallHandler]);

    // Give up after the notification lifetime.
    useEffect(() => {
        const lifetime = content.lifetime ?? MAX_RING_TIME_MS;
        const ms = getNotificationEventSendTs(notificationEvent) + lifetime - Date.now();
        const t = setTimeout(dismiss, Math.max(0, ms));
        return () => clearTimeout(t);
    }, [content.lifetime, notificationEvent, dismiss]);

    // Declined / joined from another of our devices, or the call already ended.
    useEffect(() => {
        if (!room) return;
        const me = room.client.getUserId();
        const onTimeline = (ev: MatrixEvent): void => {
            if (ev.getSender() === me && ev.getType() === EventType.RTCDecline) dismiss();
        };
        room.on(RoomEvent.Timeline, onTimeline);
        return () => {
            room.off(RoomEvent.Timeline, onTimeline);
        };
    }, [room, dismiss]);

    // We opened the call ourselves.
    useDispatcher(
        defaultDispatcher,
        useCallback(
            (p: ActionPayload) => {
                if (p.action === Action.ViewRoom && p.room_id === roomId && p.view_call) dismiss();
            },
            [roomId, dismiss],
        ),
    );

    const accept = (withVideo: boolean): void => {
        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: roomId,
            view_call: true,
            skipLobby: true,
            voiceOnly: !withVideo,
            metricsTrigger: undefined,
        });
    };

    const decline = async (): Promise<void> => {
        setDeclining(true);
        try {
            await room?.client.sendRtcDecline(roomId, notificationEvent.getId() ?? "");
        } finally {
            dismiss();
        }
    };

    const otherUserId = DMRoomMap.shared().getUserIdForRoomId(roomId);
    const callerName = notificationEvent.sender?.name ?? notificationEvent.getSender() ?? "";
    const title = otherUserId ? callerName : (room?.name ?? "Групповой звонок");
    const sub = otherUserId
        ? isVoice
            ? "Входящий голосовой звонок…"
            : "Входящий видеозвонок…"
        : `${callerName} начал(а) ${isVoice ? "голосовой звонок" : "видеозвонок"}`;

    return (
        <div className="mx_SetkaIncoming">
            <div className="mx_SetkaIncoming_avatar" data-ring={isRing || undefined}>
                <RoomAvatar room={room} size="84px" />
            </div>
            <div className="mx_SetkaIncoming_title">{title}</div>
            <div className="mx_SetkaIncoming_sub">{sub}</div>
            {busyElsewhere && <div className="mx_SetkaIncoming_note">Вы уже в другом звонке — он будет завершён</div>}
            <div className="mx_SetkaIncoming_buttons">
                <button
                    type="button"
                    className="mx_SetkaIncoming_btn mx_SetkaIncoming_btn_decline"
                    title="Отклонить"
                    disabled={declining}
                    onClick={() => void decline()}
                >
                    <HangupIcon />
                </button>
                {!isVoice && (
                    <button
                        type="button"
                        className="mx_SetkaIncoming_btn mx_SetkaIncoming_btn_accept"
                        title="Принять с видео"
                        onClick={() => accept(true)}
                    >
                        <CameraIcon />
                    </button>
                )}
                <button
                    type="button"
                    className="mx_SetkaIncoming_btn mx_SetkaIncoming_btn_accept"
                    title={isVoice ? "Принять" : "Принять только с голосом"}
                    onClick={() => accept(false)}
                >
                    <HangupIcon style={{ transform: "rotate(135deg)" }} />
                </button>
            </div>
        </div>
    );
};
