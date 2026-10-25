/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import { mediaFromMxc } from "../customisations/Media";
import { type MediaEventHelper } from "../utils/MediaEventHelper";
import { preventSetkaNativeMediaContextMenu } from "./setkaMediaContextMenu";
import { setkaMediaPlayerStore } from "./setkaMediaPlayerStore";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { isSetkaHomeserver } from "./SetkaConfig";

interface PlayerProps {
    mxEvent: MatrixEvent;
    mediaEventHelper?: MediaEventHelper;
}

const RING_RADIUS = 82;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SetkaVideoNotePlayer: React.FC<PlayerProps> = ({ mxEvent, mediaEventHelper }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const ringRef = useRef<SVGSVGElement>(null);
    const [src, setSrc] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async (): Promise<void> => {
            if (mediaEventHelper) {
                const resolved = await mediaEventHelper.sourceUrl.value;
                if (!cancelled) setSrc(resolved);
                return;
            }

            const content = mxEvent.getContent();
            const url = content.url as string | undefined;
            if (!url) {
                if (!cancelled) setSrc(null);
                return;
            }
            if (!cancelled) setSrc(mediaFromMxc(url).srcHttp);
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [mxEvent, mediaEventHelper]);

    const seekToFraction = useCallback(
        (fraction: number): void => {
            const video = videoRef.current;
            if (!video || !Number.isFinite(video.duration)) return;
            const clamped = Math.min(1, Math.max(0, fraction));
            video.currentTime = clamped * video.duration;
            setProgress(clamped);
        },
        [],
    );

    const fractionFromPointer = useCallback((clientX: number, clientY: number): number => {
        const ring = ringRef.current;
        if (!ring) return 0;
        const rect = ring.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(clientY - cy, clientX - cx);
        const normalized = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
        return normalized / (2 * Math.PI);
    }, []);

    const onRingPointerDown = (event: React.PointerEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        setIsScrubbing(true);
        ringRef.current?.setPointerCapture(event.pointerId);
        seekToFraction(fractionFromPointer(event.clientX, event.clientY));
    };

    const onRingPointerMove = (event: React.PointerEvent): void => {
        if (!isScrubbing) return;
        seekToFraction(fractionFromPointer(event.clientX, event.clientY));
    };

    const onRingPointerUp = (event: React.PointerEvent): void => {
        if (!isScrubbing) return;
        setIsScrubbing(false);
        ringRef.current?.releasePointerCapture(event.pointerId);
    };

    const togglePlayback = (): void => {
        const video = videoRef.current;
        if (!video || !src) return;
        if (video.paused) {
            void video.play().catch(() => {
                /* autoplay policy or missing source */
            });
        } else {
            video.pause();
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = (): void => {
            setPlaying(true);
            const client = MatrixClientPeg.get();
            const roomId = mxEvent.getRoomId();
            if (client && roomId && isSetkaHomeserver(client) && video) {
                const sender = mxEvent.sender?.name ?? mxEvent.getSender() ?? "";
                setkaMediaPlayerStore.attachVideoNote(roomId, mxEvent, sender, video, true);
            }
        };
        const onPause = (): void => {
            setPlaying(false);
            setkaMediaPlayerStore.updateVideoPlaying(false);
        };
        const onLoaded = (): void => setDuration(video.duration || 0);
        const onTimeUpdate = (): void => {
            if (!isScrubbing && video.duration > 0) {
                setProgress(video.currentTime / video.duration);
            }
        };
        const onEnded = (): void => {
            setPlaying(false);
            setProgress(0);
            video.currentTime = 0;
            const eventId = mxEvent.getId();
            if (eventId && setkaMediaPlayerStore.getSession()?.eventId === eventId) {
                setkaMediaPlayerStore.clear();
            }
        };

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", onEnded);

        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("loadedmetadata", onLoaded);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("ended", onEnded);
        };
    }, [isScrubbing, mxEvent, src]);

    useEffect(() => {
        const eventId = mxEvent.getId();
        if (!eventId) return;
        setkaMediaPlayerStore.registerVideoNotePlay(eventId, () => {
            void videoRef.current?.play().catch(() => {
                /* autoplay policy */
            });
        });
        return () => setkaMediaPlayerStore.unregisterVideoNotePlay(eventId);
    }, [mxEvent]);

    const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

    return (
        <div className="mx_SetkaVideoNote">
            <div className="mx_SetkaVideoNote_shell">
                <button
                    type="button"
                    className="mx_SetkaVideoNote_playHit"
                    onClick={togglePlayback}
                    onContextMenu={preventSetkaNativeMediaContextMenu}
                    aria-label="Play"
                >
                    {src && (
                        <video
                            ref={videoRef}
                            className="mx_SetkaVideoNote_player"
                            src={src}
                            playsInline
                            preload="metadata"
                            controls={false}
                            controlsList="nodownload nofullscreen noremoteplayback"
                            disablePictureInPicture
                        />
                    )}
                    {!playing && <span className="mx_SetkaVideoNote_playIcon" aria-hidden />}
                </button>
                <svg
                    ref={ringRef}
                    className="mx_SetkaVideoNote_ring"
                    viewBox="0 0 180 180"
                >
                    <circle className="mx_SetkaVideoNote_ringTrack" cx="90" cy="90" r={RING_RADIUS} />
                    <circle
                        className="mx_SetkaVideoNote_ringProgress"
                        cx="90"
                        cy="90"
                        r={RING_RADIUS}
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                    />
                </svg>
                <div
                    className="mx_SetkaVideoNote_ringHit"
                    onPointerDown={onRingPointerDown}
                    onPointerMove={onRingPointerMove}
                    onPointerUp={onRingPointerUp}
                    onPointerCancel={onRingPointerUp}
                    aria-hidden
                />
                {duration > 0 && (
                    <span className="mx_SetkaVideoNote_duration" aria-hidden>
                        {Math.max(0, Math.ceil(duration * (1 - progress)))}s
                    </span>
                )}
            </div>
        </div>
    );
};

export default SetkaVideoNotePlayer;
