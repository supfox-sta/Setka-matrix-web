/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type FC, useEffect, useRef, useState } from "react";

import { CameraIcon, CameraOffIcon } from "./SetkaCallIcons";

/**
 * Pre-join screen: a big camera preview with mic/camera switches on it, the room name and a single
 * obvious Join button. Everything scales with the available area.
 */
export const SetkaCallLobby: FC<{
    roomName: string;
    participants: number;
    onJoin: (withVideo: boolean) => void;
    onCancel?: () => void;
}> = ({ roomName, participants, onJoin }) => {
    const [video, setVideo] = useState(true);
    const [denied, setDenied] = useState(false);
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!video) return;
        let stream: MediaStream | null = null;
        let cancelled = false;
        navigator.mediaDevices
            ?.getUserMedia({ video: true })
            .then((s) => {
                if (cancelled) {
                    s.getTracks().forEach((t) => t.stop());
                    return;
                }
                stream = s;
                if (ref.current) ref.current.srcObject = s;
            })
            .catch(() => {
                setDenied(true);
                setVideo(false);
            });
        return () => {
            cancelled = true;
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [video]);

    return (
        <div className="mx_SetkaCall mx_SetkaCallLobby">
            <div className="mx_SetkaCallLobby_card">
                <div className="mx_SetkaCallLobby_preview">
                    {video ? (
                        <video ref={ref} autoPlay playsInline muted />
                    ) : (
                        <div className="mx_SetkaCallLobby_off">
                            <CameraOffIcon width={40} height={40} />
                            <span>{denied ? "Нет доступа к камере" : "Камера выключена"}</span>
                        </div>
                    )}
                </div>
                <div className="mx_SetkaCallLobby_info">
                    <div className="mx_SetkaCallLobby_title">{roomName}</div>
                    <div className="mx_SetkaCallLobby_sub">
                        {participants > 0 ? `Сейчас в звонке: ${participants}` : "Пока никого нет — вы будете первым"}
                    </div>
                </div>
                <div className="mx_SetkaCallLobby_actions">
                    <button
                        type="button"
                        className="mx_SetkaCall_btn"
                        data-off={!video || undefined}
                        title={video ? "Выключить камеру" : "Включить камеру"}
                        onClick={() => {
                            setDenied(false);
                            setVideo(!video);
                        }}
                    >
                        {video ? <CameraIcon /> : <CameraOffIcon />}
                    </button>
                    <button type="button" className="mx_SetkaCallLobby_join" onClick={() => onJoin(video)}>
                        Присоединиться
                    </button>
                </div>
            </div>
        </div>
    );
};
