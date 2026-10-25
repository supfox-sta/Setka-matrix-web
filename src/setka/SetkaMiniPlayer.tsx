/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type Room } from "matrix-js-sdk/src/matrix";
import ChevronLeftIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-left";
import ChevronRightIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-right";
import CloseIcon from "@vector-im/compound-design-tokens/assets/web/icons/close";
import PauseIcon from "@vector-im/compound-design-tokens/assets/web/icons/pause";
import PlayIcon from "@vector-im/compound-design-tokens/assets/web/icons/play";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import { PlaybackState } from "../audio/Playback";
import { setkaMediaPlayerStore, SetkaMediaPlayerStoreEvent, type SetkaMediaSession } from "./setkaMediaPlayerStore";

interface Props {
    room: Room;
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [1, 1.5, 2];

/**
 * Slim one-row player pinned to the top of the timeline:
 * [prev] [play] [next]  title / seekbar with times  [volume] [x]
 */
const SetkaMiniPlayer: React.FC<Props> = ({ room }) => {
    const [session, setSession] = useState<SetkaMediaSession | null>(() => setkaMediaPlayerStore.getSession());
    const [closing, setClosing] = useState(false);
    const [volumeOpen, setVolumeOpen] = useState(false);
    const [volume, setVolume] = useState(() => setkaMediaPlayerStore.getVolume());
    const [tick, setTick] = useState(0);

    const dragStartX = useRef<number | null>(null);
    const floatingRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onUpdate = (): void => setSession(setkaMediaPlayerStore.getSession());
        setkaMediaPlayerStore.on(SetkaMediaPlayerStoreEvent.Update, onUpdate);
        return () => {
            setkaMediaPlayerStore.off(SetkaMediaPlayerStoreEvent.Update, onUpdate);
        };
    }, []);

    useEffect(() => {
        const isActivePlayback =
            session?.playback &&
            (session.playback.currentState === PlaybackState.Playing ||
                session.playback.currentState === PlaybackState.Paused);
        const isActiveVideo = session?.kind === "video_note" && session.playing;
        if (!isActivePlayback && !isActiveVideo) return;
        const id = window.setInterval(() => setTick((v) => v + 1), 250);
        return () => window.clearInterval(id);
    }, [session?.eventId, session?.playback, session?.playing, session?.kind]);

    useEffect(() => {
        if (!session || session.roomId !== room.roomId) return;
        const tile = document.querySelector(`[data-event-id="${session.eventId}"]`);
        if (!tile) return;
        const observer = new IntersectionObserver(
            (entries) => {
                setkaMediaPlayerStore.setTileVisible(session.eventId, entries[0]?.isIntersecting ?? true);
            },
            { threshold: 0.2 },
        );
        observer.observe(tile);
        return () => observer.disconnect();
    }, [room.roomId, session]);

    useEffect(() => {
        if (!session) return;
        setkaMediaPlayerStore.setVolume(volume);
    }, [session, volume]);

    const onVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
        const next = Number(event.target.value);
        setVolume(next);
        setkaMediaPlayerStore.setVolume(next);
    }, []);

    const onClose = useCallback(() => {
        setClosing(true);
        window.setTimeout(() => {
            setkaMediaPlayerStore.clear();
            setClosing(false);
            setVolumeOpen(false);
        }, 220);
    }, []);

    const seekFromEvent = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
        const rect = event.currentTarget.getBoundingClientRect();
        const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        setkaMediaPlayerStore.seekTo(fraction);
        setTick((v) => v + 1);
    }, []);

    const onSeekDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): void => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            seekFromEvent(event);
        },
        [seekFromEvent],
    );

    const onSeekMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>): void => {
            if (event.buttons === 0) return;
            seekFromEvent(event);
        },
        [seekFromEvent],
    );

    const onFloatingPointerDown = useCallback((event: React.PointerEvent): void => {
        dragStartX.current = event.clientX;
        floatingRef.current?.setPointerCapture(event.pointerId);
    }, []);

    const onFloatingPointerMove = useCallback((event: React.PointerEvent): void => {
        if (dragStartX.current === null) return;
        if (event.clientX - dragStartX.current > 72) {
            dragStartX.current = null;
            setkaMediaPlayerStore.dismissVideoNote();
        }
    }, []);

    const onFloatingPointerUp = useCallback((): void => {
        dragStartX.current = null;
    }, []);

    if (!session || session.roomId !== room.roomId) return null;

    const isAudioActive =
        session.playback &&
        (session.playback.currentState === PlaybackState.Playing ||
            session.playback.currentState === PlaybackState.Paused);
    const isVideoActive = session.kind === "video_note" && session.videoElement;
    if (!isAudioActive && !isVideoActive) return null;

    const showSkip = session.kind === "voice" || session.kind === "video_note";
    const isPlaying =
        session.kind === "video_note" ? session.playing : session.playback?.currentState === PlaybackState.Playing;
    const showFloatingVideo =
        session.kind === "video_note" && !session.tileVisible && session.videoElement && session.playing;

    const duration =
        session.kind === "video_note" ? (session.videoElement?.duration ?? 0) : (session.playback?.durationSeconds ?? 0);
    const position =
        session.kind === "video_note" ? (session.videoElement?.currentTime ?? 0) : (session.playback?.timeSeconds ?? 0);
    const progress = duration > 0 ? position / duration : 0;
    void tick;
    void SPEEDS;

    return (
        <>
            <div
                className={"mx_SetkaMiniPlayer" + (closing ? " mx_SetkaMiniPlayer_closing" : "")}
                role="region"
                aria-label={_t("setka|player|aria")}
            >
                <div className="mx_SetkaMiniPlayer_transport">
                    {showSkip && (
                        <AccessibleButton
                            className="mx_SetkaMiniPlayer_btn"
                            onClick={() => setkaMediaPlayerStore.playPrevious(room)}
                            aria-label={_t("setka|player|previous")}
                        >
                            <ChevronLeftIcon width={18} height={18} />
                        </AccessibleButton>
                    )}
                    <AccessibleButton
                        className="mx_SetkaMiniPlayer_btn mx_SetkaMiniPlayer_btn_primary"
                        onClick={() => setkaMediaPlayerStore.togglePlay()}
                        aria-label={isPlaying ? _t("setka|player|pause") : _t("setka|player|play")}
                    >
                        {isPlaying ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
                    </AccessibleButton>
                    {showSkip && (
                        <AccessibleButton
                            className="mx_SetkaMiniPlayer_btn"
                            onClick={() => setkaMediaPlayerStore.playNext(room)}
                            aria-label={_t("setka|player|next")}
                        >
                            <ChevronRightIcon width={18} height={18} />
                        </AccessibleButton>
                    )}
                </div>

                <div className="mx_SetkaMiniPlayer_main">
                    <div className="mx_SetkaMiniPlayer_title" title={session.title}>
                        {session.title}
                    </div>
                    <div className="mx_SetkaMiniPlayer_progressRow">
                        <span className="mx_SetkaMiniPlayer_timeText">{formatTime(position)}</span>
                        <div
                            className="mx_SetkaMiniPlayer_seek"
                            onPointerDown={onSeekDown}
                            onPointerMove={onSeekMove}
                            role="slider"
                            aria-label={_t("setka|player|seek")}
                            aria-valuemin={0}
                            aria-valuemax={duration}
                            aria-valuenow={position}
                        >
                            <div className="mx_SetkaMiniPlayer_seekTrack">
                                <div
                                    className="mx_SetkaMiniPlayer_seekFill"
                                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                                />
                            </div>
                        </div>
                        <span className="mx_SetkaMiniPlayer_timeText">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="mx_SetkaMiniPlayer_side">
                    <div className="mx_SetkaMiniPlayer_volumeWrap">
                        <AccessibleButton
                            className="mx_SetkaMiniPlayer_btn"
                            onClick={() => setVolumeOpen((v) => !v)}
                            aria-label={_t("setka|player|volume")}
                        >
                            {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                        </AccessibleButton>
                        {volumeOpen && (
                            <div className="mx_SetkaMiniPlayer_volumePop">
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={volume}
                                    onChange={onVolumeChange}
                                    aria-label={_t("setka|player|volume")}
                                />
                            </div>
                        )}
                    </div>
                    <AccessibleButton
                        className="mx_SetkaMiniPlayer_btn mx_SetkaMiniPlayer_btn_close"
                        onClick={onClose}
                        aria-label={_t("action|close")}
                    >
                        <CloseIcon width={16} height={16} />
                    </AccessibleButton>
                </div>
            </div>

            {showFloatingVideo && (
                <div
                    ref={floatingRef}
                    className="mx_SetkaMiniPlayer_floatingVideo"
                    onPointerDown={onFloatingPointerDown}
                    onPointerMove={onFloatingPointerMove}
                    onPointerUp={onFloatingPointerUp}
                    onPointerCancel={onFloatingPointerUp}
                >
                    <video
                        className="mx_SetkaMiniPlayer_floatingVideo_el"
                        src={session.videoElement!.currentSrc || session.videoElement!.src}
                        muted
                        playsInline
                        autoPlay
                    />
                </div>
            )}
        </>
    );
};

export default SetkaMiniPlayer;
