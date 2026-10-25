/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect, useState } from "react";
import PauseIcon from "@vector-im/compound-design-tokens/assets/web/icons/pause";
import PlayIcon from "@vector-im/compound-design-tokens/assets/web/icons/play";
import CloseIcon from "@vector-im/compound-design-tokens/assets/web/icons/close";

import { _t } from "../languageHandler";
import { setkaLeftPanelTabStore } from "./setkaLeftPanelTabStore";
import { useTheme } from "../hooks/useTheme";
import SetkaLogoLightSvg from "../../res/img/setka/logo.svg";
import SetkaLogoDarkSvg from "../../res/img/setka/logo-dark.svg";
import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { PlaybackState } from "../audio/Playback";
import { setkaMediaPlayerStore, SetkaMediaPlayerStoreEvent, type SetkaMediaSession } from "./setkaMediaPlayerStore";

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

/** The room open right now, read from the URL hash (before any ViewRoom action has been seen). */
function initialViewedRoomId(): string | null {
    const m = /#\/room\/([^/?]+)/.exec(window.location.hash);
    if (!m) return null;
    const ref = decodeURIComponent(m[1]);
    if (ref.startsWith("!")) return ref;
    const room = MatrixClientPeg.get()
        ?.getRooms()
        .find((r) => r.getCanonicalAlias() === ref || r.getAltAliases().includes(ref));
    return room?.roomId ?? null;
}

/** Id of the room that is open in the main view (null on home / settings). */
function useViewedRoomId(): string | null {
    const [roomId, setRoomId] = useState<string | null>(initialViewedRoomId);
    useEffect(() => {
        const ref = defaultDispatcher.register((payload) => {
            if (payload.action === Action.ViewRoom) setRoomId((payload as { room_id?: string }).room_id ?? null);
            else if (payload.action === Action.ViewHomePage) setRoomId(null);
        });
        return () => defaultDispatcher.unregister(ref);
    }, []);
    return roomId;
}

/**
 * Picture-in-picture player: replaces the logo while a voice message / video note
 * from ANOTHER room is playing. Expands into the room's playlist.
 */
const SetkaLeftPanelPlayer: React.FC<{ session: SetkaMediaSession }> = ({ session }) => {
    const [expanded, setExpanded] = useState(false);
    const [, setTick] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => setTick((v) => v + 1), 300);
        return () => window.clearInterval(id);
    }, []);

    const room = MatrixClientPeg.get()?.getRoom(session.roomId);
    const isPlaying =
        session.kind === "video_note" ? session.playing : session.playback?.currentState === PlaybackState.Playing;
    const duration =
        session.kind === "video_note" ? (session.videoElement?.duration ?? 0) : (session.playback?.durationSeconds ?? 0);
    const position =
        session.kind === "video_note" ? (session.videoElement?.currentTime ?? 0) : (session.playback?.timeSeconds ?? 0);
    const progress = duration > 0 ? Math.min(1, position / duration) : 0;
    const playlist = expanded && room ? setkaMediaPlayerStore.getMusicPlaylist(room) : [];
    const [volume, setVolume] = useState(() => setkaMediaPlayerStore.getVolume());
    const [volumeOpen, setVolumeOpen] = useState(false);

    const openRoom = (): void =>
        defaultDispatcher.dispatch({
            action: Action.ViewRoom,
            room_id: session.roomId,
            event_id: session.eventId,
            highlighted: true,
            metricsTrigger: undefined,
        });

    return (
        <div className={"mx_SetkaPip" + (expanded ? " mx_SetkaPip_expanded" : "")}>
            <div className="mx_SetkaPip_row">
                <button
                    type="button"
                    className="mx_SetkaPip_play"
                    onClick={() => setkaMediaPlayerStore.togglePlay()}
                    aria-label={isPlaying ? _t("setka|player|pause") : _t("setka|player|play")}
                >
                    {isPlaying ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
                </button>
                <button
                    type="button"
                    className="mx_SetkaPip_info"
                    onClick={() => setExpanded((v) => !v)}
                    title={session.title}
                >
                    <span className="mx_SetkaPip_title">{session.title}</span>
                    <span className="mx_SetkaPip_sub">
                        {room?.name ?? ""} · {formatTime(position)} / {formatTime(duration)}
                    </span>
                </button>
                <button
                    type="button"
                    className="mx_SetkaPip_close"
                    title="Громкость"
                    onClick={() => setVolumeOpen((v) => !v)}
                >
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </button>
                <button
                    type="button"
                    className="mx_SetkaPip_close"
                    onClick={() => setkaMediaPlayerStore.clear()}
                    aria-label={_t("action|close")}
                >
                    <CloseIcon width={16} height={16} />
                </button>
            </div>
            <div
                className="mx_SetkaPip_bar"
                onPointerDown={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setkaMediaPlayerStore.seekTo((e.clientX - r.left) / r.width);
                }}
            >
                <div className="mx_SetkaPip_barFill" style={{ width: `${progress * 100}%` }} />
            </div>
            {volumeOpen && (
                <input
                    className="mx_SetkaPip_volume"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    aria-label="Громкость"
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        setVolume(v);
                        setkaMediaPlayerStore.setVolume(v);
                    }}
                />
            )}
            {expanded && (
                <div className="mx_SetkaPip_list">
                    {playlist.map((ev, i) => (
                        <button
                            key={ev.getId()}
                            type="button"
                            className={
                                "mx_SetkaPip_item" + (ev.getId() === session.eventId ? " mx_SetkaPip_item_active" : "")
                            }
                            onClick={() => room && setkaMediaPlayerStore.playEvent(room, ev)}
                        >
                            <span className="mx_SetkaPip_itemNum">{i + 1}</span>
                            <span className="mx_SetkaPip_itemText">
                                {String(ev.getContent()?.filename ?? ev.getContent()?.body ?? "Файл")}
                            </span>
                        </button>
                    ))}
                    {playlist.length === 0 && <span className="mx_SetkaPip_itemText">Нет аудиофайлов</span>}
                    <button type="button" className="mx_SetkaPip_goto" onClick={openRoom}>
                        Перейти к чату
                    </button>
                </div>
            )}
        </div>
    );
};

const SetkaLeftPanelLogo: React.FC = () => {
    const themeState = useTheme();
    const isDarkTheme = themeState.theme.includes("dark");
    const viewedRoomId = useViewedRoomId();
    const [session, setSession] = useState<SetkaMediaSession | null>(() => setkaMediaPlayerStore.getSession());

    useEffect(() => {
        const onUpdate = (): void => setSession(setkaMediaPlayerStore.getSession());
        setkaMediaPlayerStore.on(SetkaMediaPlayerStoreEvent.Update, onUpdate);
        return () => {
            setkaMediaPlayerStore.off(SetkaMediaPlayerStoreEvent.Update, onUpdate);
        };
    }, []);

    const onClick = (): void => {
        setkaLeftPanelTabStore.setTab("chats");
    };

    const active =
        session &&
        session.kind === "music" &&
        session.roomId !== viewedRoomId &&
        session.playback?.currentState !== PlaybackState.Stopped;

    if (active && session) {
        return (
            <div className="mx_SetkaLeftPanelLogo mx_SetkaLeftPanelLogo_pip">
                <SetkaLeftPanelPlayer session={session} />
            </div>
        );
    }

    return (
        <div className="mx_SetkaLeftPanelLogo">
            <button
                type="button"
                className="mx_SetkaLeftPanelLogo_button"
                onClick={onClick}
                aria-label={_t("setka|logo|alt")}
            >
                <img
                    className="mx_SetkaLeftPanelLogo_image"
                    src={isDarkTheme ? SetkaLogoLightSvg : SetkaLogoDarkSvg}
                    alt=""
                />
            </button>
        </div>
    );
};

export default SetkaLeftPanelLogo;
