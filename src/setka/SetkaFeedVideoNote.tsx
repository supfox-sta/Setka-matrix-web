/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { mediaFromMxc } from "../customisations/Media";

interface Props {
    client: MatrixClient;
    mxcUrl: string;
}

const RING_RADIUS = 56;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SetkaFeedVideoNote: React.FC<Props> = ({ client, mxcUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [src, setSrc] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setSrc(mediaFromMxc(mxcUrl, client).srcHttp);
    }, [client, mxcUrl]);

    const togglePlayback = useCallback((): void => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            void video.play();
        } else {
            video.pause();
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = (): void => setPlaying(true);
        const onPause = (): void => setPlaying(false);
        const onTimeUpdate = (): void => {
            if (video.duration > 0) {
                setProgress(video.currentTime / video.duration);
            }
        };
        const onEnded = (): void => {
            setPlaying(false);
            setProgress(0);
            video.currentTime = 0;
        };

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", onEnded);

        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("ended", onEnded);
        };
    }, [src]);

    const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

    return (
        <div className="mx_SetkaFeedVideoNote">
            <div className="mx_SetkaFeedVideoNote_shell">
                <button type="button" className="mx_SetkaFeedVideoNote_playHit" onClick={togglePlayback} aria-label="Play">
                    {src && (
                        <video
                            ref={videoRef}
                            className="mx_SetkaFeedVideoNote_player"
                            src={src}
                            playsInline
                            preload="metadata"
                            controls={false}
                            controlsList="nodownload nofullscreen noremoteplayback"
                            disablePictureInPicture
                        />
                    )}
                    {!playing && <span className="mx_SetkaFeedVideoNote_playIcon" aria-hidden />}
                </button>
                <svg className="mx_SetkaFeedVideoNote_ring" viewBox="0 0 120 120" aria-hidden>
                    <circle className="mx_SetkaVideoNote_ringTrack" cx="60" cy="60" r={RING_RADIUS} />
                    <circle
                        className="mx_SetkaVideoNote_ringProgress"
                        cx="60"
                        cy="60"
                        r={RING_RADIUS}
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                    />
                </svg>
            </div>
        </div>
    );
};

export default SetkaFeedVideoNote;
