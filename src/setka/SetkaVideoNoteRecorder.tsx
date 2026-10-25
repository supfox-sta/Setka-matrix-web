/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type IEventRelation, type MatrixClient } from "matrix-js-sdk/src/matrix";
import { VideoCallSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../languageHandler";
import Modal from "../Modal";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import { sendSetkaVideoNote } from "./setkaVideoNote";

const MAX_RECORD_MS = 60_000;

interface Props {
    client: MatrixClient;
    roomId: string;
    relation?: IEventRelation;
    onFinished: () => void;
}

type Phase = "idle" | "recording" | "preview";

const SetkaVideoNoteDialog: React.FC<Props> = ({ client, roomId, relation, onFinished }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [phase, setPhase] = useState<Phase>("idle");
    const [blob, setBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);

    const stopStream = useCallback((): void => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async (): Promise<void> => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (e) {
            setError(_t("setka|video_note|camera_error"));
            stopStream();
        }
    }, [stopStream]);

    useEffect(() => {
        void startCamera();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            recorderRef.current?.stop();
            stopStream();
        };
    }, [startCamera, stopStream]);

    useEffect(() => {
        if (phase !== "preview" || !blob || !previewRef.current) return;
        const url = URL.createObjectURL(blob);
        previewRef.current.src = url;
        void previewRef.current.play();
        return () => URL.revokeObjectURL(url);
    }, [blob, phase]);

    const stopRecording = useCallback((): void => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        recorderRef.current?.stop();
        recorderRef.current = null;
        stopStream();
    }, [stopStream]);

    const startRecording = (): void => {
        const stream = streamRef.current;
        if (!stream || phase === "recording") return;
        chunksRef.current = [];
        setElapsedMs(0);
        setPhase("recording");

        const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
                ? "video/webm;codecs=vp9"
                : MediaRecorder.isTypeSupported("video/webm")
                  ? "video/webm"
                  : "",
        });
        recorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.onstop = () => {
            const recorded = new Blob(chunksRef.current, {
                type: recorder.mimeType || "video/webm",
            });
            setBlob(recorded);
            setPhase("preview");
        };
        recorder.start(200);
        const startedAt = Date.now();
        timerRef.current = setInterval(() => {
            const ms = Date.now() - startedAt;
            setElapsedMs(ms);
            if (ms >= MAX_RECORD_MS) stopRecording();
        }, 200);
    };

    const onSend = async (): Promise<void> => {
        if (!blob || sending) return;
        setSending(true);
        try {
            await sendSetkaVideoNote(client, roomId, blob, relation);
            onFinished();
        } catch {
            setError(_t("setka|video_note|send_error"));
            setSending(false);
        }
    };

    const onRetake = (): void => {
        setBlob(null);
        setPhase("idle");
        void startCamera();
    };

    const seconds = Math.floor(elapsedMs / 1000);

    return (
        <div className="mx_SetkaVideoNoteDialog">
            <div className="mx_SetkaVideoNoteDialog_circle">
                {phase === "preview" && blob ? (
                    <video
                        ref={previewRef}
                        className="mx_SetkaVideoNoteDialog_video"
                        playsInline
                        muted
                        loop
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture
                    />
                ) : (
                    <video
                        ref={videoRef}
                        className="mx_SetkaVideoNoteDialog_video"
                        playsInline
                        muted
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture
                    />
                )}
                {phase === "recording" && (
                    <div className="mx_SetkaVideoNoteDialog_timer">{seconds}s</div>
                )}
            </div>
            {error && <p className="mx_SetkaVideoNoteDialog_error">{error}</p>}
            <div className="mx_SetkaVideoNoteDialog_actions">
                {phase === "preview" ? (
                    <>
                        <AccessibleButton kind="secondary" onClick={onRetake} disabled={sending}>
                            {_t("setka|video_note|retake")}
                        </AccessibleButton>
                        <AccessibleButton kind="primary" onClick={() => void onSend()} disabled={sending}>
                            {_t("action|send")}
                        </AccessibleButton>
                    </>
                ) : (
                    <>
                        <AccessibleButton kind="secondary" onClick={onFinished}>
                            {_t("action|cancel")}
                        </AccessibleButton>
                        {phase === "recording" ? (
                            <AccessibleButton kind="danger" onClick={stopRecording}>
                                {_t("setka|video_note|stop")}
                            </AccessibleButton>
                        ) : (
                            <AccessibleButton kind="primary" onClick={startRecording}>
                                {_t("setka|video_note|record")}
                            </AccessibleButton>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export function openSetkaVideoNoteRecorder(
    client: MatrixClient,
    roomId: string,
    relation?: IEventRelation,
): void {
    Modal.createDialog(
        SetkaVideoNoteDialog,
        { client, roomId, relation },
        "mx_SetkaVideoNoteDialog_wrapper",
        false,
        true,
    );
}

interface ButtonProps {
    client: MatrixClient;
    roomId: string;
    relation?: IEventRelation;
    className?: string;
}

const SetkaVideoNoteButton: React.FC<ButtonProps> = ({ client, roomId, relation, className }) => (
    <AccessibleButton
        className={className}
        onClick={() => openSetkaVideoNoteRecorder(client, roomId, relation)}
        title={_t("setka|video_note|record")}
    >
        <VideoCallSolidIcon />
    </AccessibleButton>
);

export default SetkaVideoNoteButton;
