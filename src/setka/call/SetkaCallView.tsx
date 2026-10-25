/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, {
    type CSSProperties,
    type FC,
    type ReactNode,
    useEffect,
    useLayoutEffect,
    useReducer,
    useRef,
    useState,
} from "react";
import type {
    AudioMediaTrack,
    LocalRTCMember,
    MediaTrack,
    ParticipationState,
    RemoteRTCMember,
    RTCParticipation,
} from "@element-hq/matrixrtc-sdk";

import { createPortal } from "react-dom";
import { ClientEvent, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { showRoomInviteDialog } from "../../RoomInvite";

import { SetkaCallStore, useSetkaCallSession } from "./SetkaCallStore";
import { type SetkaCallSession } from "./SetkaCallSession";
import { useBehavior } from "./useBehavior";
import { playCallSound } from "./SetkaCallSounds";
import { SetkaCallAudio, type AudioKind, useCallAudioPrefs } from "./SetkaCallAudio";
import { toggleSetkaCallChat } from "../setkaCallUi";
import MemberAvatar from "../../components/views/avatars/MemberAvatar";
import { CallDevicesPanel } from "./SetkaCallDevices";
import {
    CameraIcon,
    CameraOffIcon,
    ChatIcon,
    FullscreenIcon,
    HangupIcon,
    HeadphonesIcon,
    HeadphonesOffIcon,
    LockOffIcon,
    MicIcon,
    MicOffIcon,
    PinIcon,
    ScreenIcon,
} from "./SetkaCallIcons";

type Member = LocalRTCMember | RemoteRTCMember;

interface MenuState {
    x: number;
    y: number;
    member: Member;
    kind: AudioKind;
    tile: HTMLElement;
    tileId: string;
}
type OpenMenu = (e: React.MouseEvent, member: Member, kind: AudioKind, tileId: string) => void;

const isAudio = (t: MediaTrack | undefined): t is AudioMediaTrack => t?.kind === "audio";

function useIsFullscreen(): Element | null {
    const [el, setEl] = useState<Element | null>(document.fullscreenElement);
    useEffect(() => {
        const on = (): void => setEl(document.fullscreenElement);
        document.addEventListener("fullscreenchange", on);
        return () => document.removeEventListener("fullscreenchange", on);
    }, []);
    return el;
}

function toggleFullscreen(el: Element | null | undefined): void {
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void (el as HTMLElement).requestFullscreen?.();
}

/** Full screen toggle on a tile. While in full screen it stays visible so there is always a way back. */
const TileFsButton: FC = () => {
    const fs = useIsFullscreen();
    return (
        <button
            type="button"
            className="mx_SetkaCall_tileFs"
            data-active={!!fs || undefined}
            title={fs ? "Выйти из полноэкранного режима (Esc)" : "На весь экран"}
            onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen(e.currentTarget.closest(".mx_SetkaCall_tile"));
            }}
        >
            <FullscreenIcon width={16} height={16} />
            {fs && <span>Свернуть</span>}
        </button>
    );
};

/** Hands a <video> element to an SDK track; the SDK owns the stream and picks the quality. */
export const VideoSurface: FC<{ track: MediaTrack | undefined; hidden?: boolean; mirror?: boolean }> = ({
    track,
    hidden,
    mirror,
}) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || !track) return;
        track.attach(el);
        return () => track.detach(el);
    }, [track]);

    if (!track) return null;
    return (
        <video
            ref={ref}
            className="mx_SetkaCall_video"
            style={{ display: hidden ? "none" : undefined, transform: mirror ? "scaleX(-1)" : undefined }}
            autoPlay
            playsInline
            muted
        />
    );
};

const Avatar: FC<{ member: Member }> = ({ member }) => {
    const name = useBehavior(member.displayName$);
    const avatarUrl = useBehavior(member.avatarUrl$);
    const session = useSetkaCallSession();
    const roomMember = session?.room.getMember(member.userId) ?? null;
    if (roomMember) {
        return (
            <div className="mx_SetkaCall_avatar mx_SetkaCall_avatar_member">
                <MemberAvatar member={roomMember} size="128px" hideTitle viewUserOnClick={false} />
            </div>
        );
    }
    return (
        <div className="mx_SetkaCall_avatar">
            {avatarUrl?.startsWith("http") ? (
                <img src={avatarUrl} alt="" />
            ) : (
                <span>{(name ?? member.userId).replace(/^@/, "").charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
};

/** True once the SFU reported a key problem for this member (media cannot be decrypted). */
function useEncryptionProblem(member: Member): boolean {
    const [bad, setBad] = useState(false);
    useEffect(() => {
        setBad(false);
        const sub = member.encryptionError$.subscribe(() => setBad(true));
        return () => sub.unsubscribe();
    }, [member]);
    return bad;
}

/** Re-renders when any member's track list changes and returns the current lists. */
function useMembersTracks(members: Member[]): Map<string, MediaTrack[]> {
    const [, force] = useReducer((x: number) => x + 1, 0);
    const key = members.map((m) => m.memberId).join("|");
    useEffect(() => {
        const subs = members.map((m) => m.tracks$.subscribe(() => force()));
        return () => subs.forEach((s) => s.unsubscribe());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return new Map(members.map((m) => [m.memberId, (m.tracks$.value ?? []) as MediaTrack[]]));
}

interface TileProps {
    member: Member;
    onMenu: OpenMenu;
    onPick: (id: string) => void;
    focused?: boolean;
}

/** One participant, Discord style: camera or big avatar, name plate, green ring while speaking. */
const ParticipantTile: FC<TileProps> = ({ member, onMenu, onPick, focused }) => {
    const prefs = useCallAudioPrefs();
    const tracks = useBehavior(member.tracks$) ?? [];
    const name = useBehavior(member.displayName$);
    const keyProblem = useEncryptionProblem(member);
    const id = `cam-${member.memberId}`;

    const camera = tracks.find((t) => t.source === "camera");
    const mic = tracks.find((t) => t.source === "microphone");

    const cameraMuted = useBehavior(camera?.muted$) ?? true;
    const micMuted = useBehavior(mic?.muted$) ?? true;
    const speaking = (useBehavior(isAudio(mic) ? mic.isActive$ : undefined) ?? false) && !micMuted;
    const label = member.local ? "Вы" : (name ?? member.userId);
    const showVideo = !!camera && !cameraMuted;
    const mutedByMe = !member.local && (prefs.get(member.userId, "voice").muted || prefs.deafened);

    return (
        <div
            className="mx_SetkaCall_tile"
            data-speaking={speaking || undefined}
            data-local={member.local || undefined}
            data-video={showVideo || undefined}
            data-focused={focused || undefined}
            onClick={() => onPick(id)}
            onContextMenu={(e) => onMenu(e, member, "voice", id)}
            onDoubleClick={(e) => toggleFullscreen(e.currentTarget)}
        >
            <TileFsButton />
            <VideoSurface track={camera} hidden={!showVideo} mirror={member.local} />
            {!showVideo && <Avatar member={member} />}
            {keyProblem && (
                <div className="mx_SetkaCall_keyBadge" title="Ключ шифрования от этого участника не получен">
                    <LockOffIcon width={14} height={14} /> нет ключа
                </div>
            )}
            <div className="mx_SetkaCall_name">
                {micMuted && (
                    <span className="mx_SetkaCall_mutedMark" title="Микрофон выключен">
                        <MicOffIcon width={14} height={14} />
                    </span>
                )}
                {mutedByMe && (
                    <span className="mx_SetkaCall_mutedMark" title="Вы его заглушили">
                        <HeadphonesOffIcon width={14} height={14} />
                    </span>
                )}
                {label}
            </div>
        </div>
    );
};

/** A shared screen. Click to pin it large, double-click for full screen. */
const ScreenTile: FC<TileProps> = ({ member, onMenu, onPick, focused }) => {
    const tracks = useBehavior(member.tracks$) ?? [];
    const name = useBehavior(member.displayName$);
    const screen = tracks.find((t) => t.source === "screenShare");
    const id = `scr-${member.memberId}`;
    if (!screen) return null;
    return (
        <div
            className="mx_SetkaCall_tile mx_SetkaCall_tile_screen"
            data-video
            data-focused={focused || undefined}
            onClick={() => onPick(id)}
            onContextMenu={(e) => onMenu(e, member, "screen", id)}
            onDoubleClick={(e) => toggleFullscreen(e.currentTarget)}
        >
            <TileFsButton />
            <VideoSurface track={screen} />
            <div className="mx_SetkaCall_name">
                <ScreenIcon width={14} height={14} />
                {member.local ? "Ваш экран" : `Экран: ${name ?? member.userId}`}
            </div>
        </div>
    );
};

/** Right-click menu: volume, mute for me, pin, fullscreen, mute everyone. */
const MemberMenu: FC<{
    menu: MenuState;
    everyone: string[];
    pinned: boolean;
    onPick: (id: string) => void;
    onClose: () => void;
}> = ({ menu, everyone, pinned, onPick, onClose }) => {
    const prefs = useCallAudioPrefs();
    const ref = useRef<HTMLDivElement>(null);
    const { member, kind } = menu;
    const name = useBehavior(member.displayName$) ?? member.userId;
    const pref = prefs.get(member.userId, kind);
    const allMuted = prefs.areAllMuted(everyone);

    useEffect(() => {
        const close = (e: Event): void => {
            if (e instanceof KeyboardEvent && e.key !== "Escape") return;
            if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener("mousedown", close, true);
        document.addEventListener("keydown", close, true);
        window.addEventListener("blur", onClose);
        return () => {
            document.removeEventListener("mousedown", close, true);
            document.removeEventListener("keydown", close, true);
            window.removeEventListener("blur", onClose);
        };
    }, [onClose]);

    // keep the menu inside the window
    // Rendered in a portal on <body>: ancestors with backdrop-filter/transform turn `position: fixed`
    // into "relative to that ancestor", which made the menu spawn away from the cursor.
    const [pos, setPos] = useState({ left: menu.x, top: menu.y });
    useLayoutEffect(() => {
        const el = ref.current;
        const w = el?.offsetWidth ?? 240;
        const h = el?.offsetHeight ?? 290;
        setPos({
            left: Math.max(8, Math.min(menu.x, window.innerWidth - w - 8)),
            top: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)),
        });
    }, [menu.x, menu.y]);
    const title = kind === "screen" ? `Экран: ${name}` : name;

    return createPortal(
        <div ref={ref} className="mx_SetkaCall_menu" style={pos} onContextMenu={(e) => e.preventDefault()}>
            <div className="mx_SetkaCall_menuTitle">{title}</div>
            {!member.local && (
                <>
                    <label className="mx_SetkaCall_menuRow">
                        <span>{kind === "screen" ? "Громкость трансляции" : "Громкость"}</span>
                        <span className="mx_SetkaCall_menuValue">{Math.round(pref.volume * 100)}%</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(pref.volume * 100)}
                            onChange={(e) => prefs.setVolume(member.userId, kind, Number(e.target.value) / 100)}
                        />
                    </label>
                    <button
                        type="button"
                        className="mx_SetkaCall_menuItem"
                        onClick={() => prefs.setMuted(member.userId, kind, !pref.muted)}
                    >
                        {pref.muted
                            ? kind === "screen"
                                ? "Включить звук трансляции"
                                : "Включить звук участника"
                            : kind === "screen"
                              ? "Заглушить трансляцию"
                              : "Заглушить участника"}
                    </button>
                </>
            )}
            <button
                type="button"
                className="mx_SetkaCall_menuItem"
                onClick={() => {
                    onPick(menu.tileId);
                    onClose();
                }}
            >
                <PinIcon width={16} height={16} /> {pinned ? "Убрать закрепление" : "Закрепить"}
            </button>
            <button
                type="button"
                className="mx_SetkaCall_menuItem"
                onClick={() => {
                    void menu.tile.requestFullscreen?.();
                    onClose();
                }}
            >
                <FullscreenIcon width={16} height={16} /> На весь экран
            </button>
            {everyone.length > 0 && (
                <>
                    <div className="mx_SetkaCall_menuSep" />
                    <button
                        type="button"
                        className="mx_SetkaCall_menuItem"
                        onClick={() => {
                            prefs.setAllMuted(everyone, !allMuted);
                            onClose();
                        }}
                    >
                        {allMuted ? "Включить звук всем" : "Заглушить всех"}
                    </button>
                </>
            )}
        </div>,
        document.body,
    );
};

const CtlButton: FC<{
    title: string;
    onClick: () => void;
    off?: boolean;
    on?: boolean;
    leave?: boolean;
    children: ReactNode;
}> = ({ title, onClick, off, on, leave, children }) => (
    <button
        type="button"
        className={leave ? "mx_SetkaCall_btn mx_SetkaCall_btn_leave" : "mx_SetkaCall_btn"}
        data-off={off || undefined}
        data-on={on || undefined}
        title={title}
        aria-label={title}
        onClick={onClick}
    >
        {children}
    </button>
);

/** "Invite to the call": ping a room member (mention => push notification) or add someone new to the room. */
const CallInvitePanel: FC<{ session: SetkaCallSession; participation: RTCParticipation; onClose: () => void }> = ({
    session,
    participation,
    onClose,
}) => {
    const remotes = useBehavior(participation.remoteMembers$);
    const [sent, setSent] = useState<string[]>([]);
    const ref = useRef<HTMLDivElement>(null);
    const me = MatrixClientPeg.get()?.getUserId();
    const inCall = new Set(remotes.map((m) => m.userId));
    const candidates = session.room
        .getMembers()
        .filter((m) => (m.membership === "join" || m.membership === "invite") && m.userId !== me && !inCall.has(m.userId));

    useEffect(() => {
        const close = (e: Event): void => {
            if (e instanceof KeyboardEvent && e.key !== "Escape") return;
            if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener("mousedown", close, true);
        document.addEventListener("keydown", close, true);
        return () => {
            document.removeEventListener("mousedown", close, true);
            document.removeEventListener("keydown", close, true);
        };
    }, [onClose]);

    const ping = (userId: string, name: string): void => {
        setSent((s) => [...s, userId]);
        void MatrixClientPeg.get()?.sendMessage(session.room.roomId, {
            msgtype: "m.text",
            body: `📞 ${name}, заходи в звонок`,
            format: "org.matrix.custom.html",
            formatted_body: `📞 <a href="https://matrix.to/#/${userId}">${name}</a>, заходи в звонок`,
            "m.mentions": { user_ids: [userId] },
        } as never);
    };

    return (
        <div
            ref={ref}
            className="mx_SetkaCall_menu"
            style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", width: 300, maxHeight: 340, overflowY: "auto", zIndex: 5 }}
        >
            <div className="mx_SetkaCall_menuTitle">Пригласить в звонок</div>
            {candidates.length === 0 && <div className="mx_SetkaCall_menuRow">Все уже в звонке</div>}
            {candidates.map((m) => (
                <button
                    key={m.userId}
                    type="button"
                    className="mx_SetkaCall_menuItem"
                    disabled={sent.includes(m.userId)}
                    onClick={() => ping(m.userId, m.name)}
                >
                    <MemberAvatar member={m} size="24px" hideTitle viewUserOnClick={false} />
                    <span style={{ flex: 1, textAlign: "start" }}>{m.name}</span>
                    <span>{sent.includes(m.userId) ? "✓ Позвали" : m.membership === "invite" ? "Приглашён" : "Позвать"}</span>
                </button>
            ))}
            <div className="mx_SetkaCall_menuSep" />
            <button
                type="button"
                className="mx_SetkaCall_menuItem"
                onClick={() => {
                    onClose();
                    showRoomInviteDialog(session.room.roomId);
                }}
            >
                Пригласить нового человека в комнату…
            </button>
        </div>
    );
};

export const CallControls: FC<{ session: SetkaCallSession; participation: RTCParticipation; compact?: boolean }> = ({
    session,
    participation,
    compact,
}) => {
    const prefs = useCallAudioPrefs();
    const fsEl = useIsFullscreen();
    const local = useBehavior(participation.localMember$);
    const tracks = useBehavior(local?.tracks$) ?? null;
    const mic = tracks?.find((t) => t.source === "microphone");
    const cam = tracks?.find((t) => t.source === "camera");
    const screen = tracks?.find((t) => t.source === "screenShare");
    const micMuted = useBehavior(mic?.muted$) ?? true;
    const camMuted = useBehavior(cam?.muted$) ?? true;
    const [devicesOpen, setDevicesOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);

    // "Deafen": silence everyone and mute our own microphone; undo restores the microphone.
    const toggleDeafen = (): void => {
        const next = !prefs.deafened;
        prefs.setDeafened(next);
        if (next) {
            if (!micMuted) {
                prefs.wasMicMutedByDeafen = true;
                void session.toggle("microphone");
            } else {
                playCallSound("mute");
            }
        } else if (prefs.wasMicMutedByDeafen) {
            prefs.wasMicMutedByDeafen = false;
            if (session.isMuted("microphone")) void session.toggle("microphone");
        } else {
            playCallSound("unmute");
        }
    };

    return (
        <div className="mx_SetkaCall_controls">
            {devicesOpen && <CallDevicesPanel session={session} onClose={() => setDevicesOpen(false)} />}
            {inviteOpen && (
                <CallInvitePanel session={session} participation={participation} onClose={() => setInviteOpen(false)} />
            )}
            <div className="mx_SetkaCall_controlsBar">
                <CtlButton
                    off={micMuted}
                    title={micMuted ? "Включить микрофон" : "Выключить микрофон"}
                    onClick={() => {
                        // unmuting the mic while deafened also un-deafens, like Discord
                        if (prefs.deafened && micMuted) {
                            prefs.wasMicMutedByDeafen = false;
                            prefs.setDeafened(false);
                        }
                        void session.toggle("microphone");
                    }}
                >
                    {micMuted ? <MicOffIcon /> : <MicIcon />}
                </CtlButton>
                <CtlButton
                    off={prefs.deafened}
                    title={prefs.deafened ? "Включить звук" : "Отключить звук (заглушить всех)"}
                    onClick={toggleDeafen}
                >
                    {prefs.deafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                </CtlButton>
                {(
                    <>
                        <CtlButton title="Пригласить в звонок" on={inviteOpen} onClick={() => setInviteOpen((v) => !v)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M19 8v6M22 11h-6" />
                            </svg>
                        </CtlButton>
                        <span data-call-devices-btn>
                            <CtlButton title="Настройки звонка (микрофон, камера, звук)" on={devicesOpen} onClick={() => setDevicesOpen((v) => !v)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                                </svg>
                            </CtlButton>
                        </span>
                        <CtlButton
                            off={camMuted}
                            title={camMuted ? "Включить камеру" : "Выключить камеру"}
                            onClick={() => void session.toggle("camera")}
                        >
                            {camMuted ? <CameraOffIcon /> : <CameraIcon />}
                        </CtlButton>
                        <CtlButton
                            on={!!screen}
                            title={screen ? "Остановить демонстрацию" : "Демонстрация экрана"}
                            onClick={() => void session.toggleScreenShare()}
                        >
                            <ScreenIcon />
                        </CtlButton>
                        {!compact && (
                        <>
                        <CtlButton title="Показать / скрыть чат" onClick={() => toggleSetkaCallChat(session.room.roomId)}>
                            <ChatIcon />
                        </CtlButton>
                        <CtlButton
                            on={!!fsEl}
                            title={fsEl ? "Выйти из полноэкранного режима (Esc)" : "Звонок на весь экран"}
                            onClick={() => {
                                if (fsEl) toggleFullscreen(fsEl);
                                else toggleFullscreen(document.querySelector(".mx_SetkaCall:not(.mx_SetkaCallLobby)"));
                            }}
                        >
                            <FullscreenIcon />
                        </CtlButton>
                        </>
                        )}
                    </>
                )}
                <CtlButton leave title="Завершить звонок" onClick={() => SetkaCallStore.instance.end()}>
                    <HangupIcon />
                </CtlButton>
            </div>
        </div>
    );
};

export const stateLabel = (state: ParticipationState | undefined): string | null => {
    switch (state?.kind) {
        case "waitingForTransport":
        case "connecting":
            return "Подключение…";
        case "reconnecting":
            return "Связь потеряна, переподключаемся…";
        case "failed":
            return `Ошибка звонка: ${state.error.message}`;
        default:
            return null;
    }
};

/**
 * An area whose children are tiles sized to the largest 16:9 at which `count` tiles fit the area
 * (like Discord / Meet). Re-computed on every resize, so the layout adapts to any window size.
 */
const FitArea: FC<{ count: number; className: string; children: ReactNode }> = ({ count, className, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 320, h: 180 });
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const gap = 8;
        const calc = (): void => {
            const cs = getComputedStyle(el);
            const cw = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            const ch = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            if (cw <= 0 || ch <= 0 || count < 1) return;
            let best = { w: 0, h: 0 };
            for (let cols = 1; cols <= count; cols++) {
                const rows = Math.ceil(count / cols);
                let w = (cw - gap * (cols - 1)) / cols;
                let h = (w * 9) / 16;
                if (h * rows + gap * (rows - 1) > ch) {
                    h = (ch - gap * (rows - 1)) / rows;
                    w = (h * 16) / 9;
                }
                if (w > best.w) best = { w, h };
            }
            // never go below a readable size: the area scrolls instead
            const w = Math.max(96, Math.min(1400, Math.floor(best.w)));
            setSize((prev) => (prev.w === w ? prev : { w, h: Math.round((w * 9) / 16) }));
        };
        calc();
        // While the chat splitter is dragged the layout settles a frame late: measure again after it.
        let raf = 0;
        const ro = new ResizeObserver(() => {
            calc();
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(calc);
        });
        ro.observe(el);
        if (el.parentElement) ro.observe(el.parentElement);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [count]);
    const vars = { "--tw": `${size.w}px`, "--th": `${size.h}px` } as CSSProperties;
    return (
        <div ref={ref} className={className} style={vars}>
            {children}
        </div>
    );
};

const RING_TIMEOUT_MS = 45_000;
const DECLINE_TYPES = new Set(["org.matrix.msc4310.rtc.decline", "m.rtc.decline", "m.call.reject"]);

/**
 * DM only: the person we are calling and who has not joined yet. Shown as a dimmed avatar; once they join the
 * normal tile replaces it, and if they decline (or nobody answers) it disappears.
 */
function useRingingPeers(session: SetkaCallSession, remotes: Member[]): string[] {
    const [declined, setDeclined] = useState<string[]>([]);
    const [expired, setExpired] = useState(false);
    const me = MatrixClientPeg.get()?.getUserId();

    useEffect(() => {
        const client = MatrixClientPeg.get();
        if (!client) return;
        const onEvent = (ev: MatrixEvent): void => {
            if (ev.getRoomId() !== session.room.roomId || !DECLINE_TYPES.has(ev.getType())) return;
            const sender = ev.getSender();
            if (sender) setDeclined((d) => (d.includes(sender) ? d : [...d, sender]));
        };
        client.on(ClientEvent.Event, onEvent);
        const t = window.setTimeout(() => setExpired(true), RING_TIMEOUT_MS);
        return () => {
            client.off(ClientEvent.Event, onEvent);
            window.clearTimeout(t);
        };
    }, [session]);

    // someone who already joined and left is not "being called" anymore
    const seen = useRef<Set<string>>(new Set());
    remotes.forEach((m) => seen.current.add(m.userId));

    if (expired) return [];
    const joined = session.room.getJoinedMembers();
    if (joined.length !== 2) return [];
    const present = new Set(remotes.map((m) => m.userId));
    return joined
        .map((m) => m.userId)
        .filter((id) => id !== me && !present.has(id) && !seen.current.has(id) && !declined.includes(id));
}

const RingingTile: FC<{ session: SetkaCallSession; userId: string }> = ({ session, userId }) => {
    const roomMember = session.room.getMember(userId);
    return (
        <div className="mx_SetkaCall_tile mx_SetkaCall_tile_ringing">
            <div className="mx_SetkaCall_avatar mx_SetkaCall_avatar_member">
                {roomMember && <MemberAvatar member={roomMember} size="128px" hideTitle viewUserOnClick={false} />}
            </div>
            <div className="mx_SetkaCall_name">{roomMember?.name ?? userId} · вызываем…</div>
        </div>
    );
};

const Stage: FC<{
    session: SetkaCallSession;
    participation: RTCParticipation;
    popped?: boolean;
    onPopout?: () => void;
}> = ({ session, participation, popped, onPopout }) => {
    const state = useBehavior(participation.state$);
    const local = useBehavior(participation.localMember$);
    const remotes = useBehavior(participation.remoteMembers$);
    const label = stateLabel(state);
    const members: Member[] = [...remotes, ...(local ? [local] : [])];
    const tracksByMember = useMembersTracks(members);
    const [menu, setMenu] = useState<MenuState | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    const [autoPinOff, setAutoPinOff] = useState(false);
    const alone = state?.kind === "connected" && remotes.length === 0;
    const ringing = useRingingPeers(session, remotes);

    // All tiles of the call: every participant, plus one tile per shared screen.
    const tiles = members.flatMap((m) => {
        const hasScreen = (tracksByMember.get(m.memberId) ?? []).some((t) => t.source === "screenShare");
        return [
            { id: `cam-${m.memberId}`, member: m, screen: false },
            ...(hasScreen ? [{ id: `scr-${m.memberId}`, member: m, screen: true }] : []),
        ];
    });
    const screenTiles = tiles.filter((t) => t.screen);

    useEffect(() => {
        if (screenTiles.length === 0) setAutoPinOff(false);
    }, [screenTiles.length]);

    // Layout rules:
    //  - the user pinned a tile            → that tile is large, everyone else in a strip
    //  - exactly one shared screen         → it is pinned automatically (until the user unpins it)
    //  - otherwise (0 or 2+ screens)       → one grid with every tile at the same size
    let focusId: string | null = pinned && tiles.some((t) => t.id === pinned) ? pinned : null;
    if (!focusId && !autoPinOff && screenTiles.length === 1) focusId = screenTiles[0].id;
    if (tiles.length < 2) focusId = null;

    const pick = (id: string): void => {
        if (tiles.length < 2) return;
        if (focusId === id) {
            setPinned(null);
            setAutoPinOff(true);
        } else {
            setPinned(id);
        }
    };

    const openMenu: OpenMenu = (e, member, kind, tileId) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, member, kind, tile: e.currentTarget as HTMLElement, tileId });
    };

    const renderTile = (t: (typeof tiles)[number]): ReactNode =>
        t.screen ? (
            <ScreenTile key={t.id} member={t.member} onMenu={openMenu} onPick={pick} focused={focusId === t.id} />
        ) : (
            <ParticipantTile key={t.id} member={t.member} onMenu={openMenu} onPick={pick} focused={focusId === t.id} />
        );

    const focused = tiles.find((t) => t.id === focusId);
    const others = tiles.filter((t) => t.id !== focusId);

    return (
        <div className="mx_SetkaCall_stage">
            <div className="mx_SetkaCall_header">
                <span className="mx_SetkaCall_dot" data-live={state?.kind === "connected" || undefined} />
                <span className="mx_SetkaCall_room">{session.room.name}</span>
                <span className="mx_SetkaCall_count">{members.length}</span>
                {label && <span className="mx_SetkaCall_status">{label}</span>}
                {!label && alone && <span className="mx_SetkaCall_status">Ждём остальных…</span>}
                {onPopout && (
                    <button
                        type="button"
                        className="mx_SetkaCall_tileFs"
                        style={{ marginLeft: "auto", position: "static", opacity: 1 }}
                        title={popped ? "Вернуть звонок в окно" : "Открыть в отдельном окне"}
                        onClick={onPopout}
                    >
                        {popped ? "⮌ Вернуть" : "⧉ В окно"}
                    </button>
                )}
            </div>
            {focused ? (
                <div className="mx_SetkaCall_focus">
                    <FitArea count={1} className="mx_SetkaCall_focusMain">
                        {renderTile(focused)}
                    </FitArea>
                    <div className="mx_SetkaCall_strip">
                        {others.map(renderTile)}
                        {ringing.map((u) => (
                            <RingingTile key={u} session={session} userId={u} />
                        ))}
                    </div>
                </div>
            ) : (
                <FitArea count={Math.max(1, tiles.length + ringing.length)} className="mx_SetkaCall_grid">
                    {tiles.map(renderTile)}
                    {ringing.map((u) => (
                        <RingingTile key={u} session={session} userId={u} />
                    ))}
                </FitArea>
            )}
            <CallControls session={session} participation={participation} />
            {menu && (
                <MemberMenu
                    menu={menu}
                    everyone={remotes.map((m) => m.userId)}
                    pinned={focusId === menu.tileId}
                    onPick={pick}
                    onClose={() => setMenu(null)}
                />
            )}
        </div>
    );
};

/**
 * The Setka call stage for a room. It only renders the session held by SetkaCallStore;
 * leaving the room does not end the call.
 */
export const SetkaCallView: FC<{ roomId: string }> = ({ roomId }) => {
    const session = useSetkaCallSession();
    const [pop, setPop] = useState<{ win: Window; root: HTMLElement } | null>(null);
    const hasCall = !!session?.active;

    // the pop-out window dies with the call and with the main window
    useEffect(() => {
        if (!hasCall && pop) {
            pop.win.close();
            setPop(null);
        }
    }, [hasCall, pop]);
    useEffect(() => {
        if (!pop) return;
        const { win } = pop;
        const onGone = (): void => setPop(null);
        const closeWith = (): void => win.close();
        win.addEventListener("pagehide", onGone);
        window.addEventListener("beforeunload", closeWith);
        // keep theme / glass attributes of the popup in sync with the app
        const sync = (): void => {
            for (const a of Array.from(document.documentElement.attributes)) {
                if (a.name !== "style") win.document.documentElement.setAttribute(a.name, a.value);
            }
            win.document.documentElement.style.cssText = document.documentElement.style.cssText;
            win.document.body.className = document.body.className;
        };
        const mo = new MutationObserver(sync);
        mo.observe(document.documentElement, { attributes: true });
        mo.observe(document.body, { attributes: true });
        return () => {
            win.removeEventListener("pagehide", onGone);
            window.removeEventListener("beforeunload", closeWith);
            mo.disconnect();
        };
    }, [pop]);

    const togglePopout = (): void => {
        if (pop) {
            pop.win.close();
            setPop(null);
            return;
        }
        const win = window.open("", "setka-call", "popup=yes,width=1100,height=680");
        if (!win) return;
        const d = win.document;
        d.title = "Звонок — Сетка";
        d.head.replaceChildren();
        const meta = d.createElement("meta");
        meta.setAttribute("charset", "utf-8");
        d.head.appendChild(meta);
        document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
            const c = n.cloneNode(true) as HTMLElement;
            if (n instanceof HTMLStyleElement && !n.textContent) {
                try {
                    c.textContent = Array.from(n.sheet?.cssRules ?? [])
                        .map((r) => r.cssText)
                        .join("\n");
                } catch {
                    /* ignore */
                }
            }
            d.head.appendChild(c);
        });
        for (const a of Array.from(document.documentElement.attributes)) {
            d.documentElement.setAttribute(a.name, a.value);
        }
        d.documentElement.style.cssText = document.documentElement.style.cssText;
        d.body.className = document.body.className;
        d.body.setAttribute("style", "margin:0;height:100vh;overflow:hidden;background:#0b0d12");
        const root = d.createElement("div");
        root.className = "mx_SetkaCall mx_SetkaCall_popped";
        root.setAttribute("style", "height:100vh;width:100vw");
        d.body.replaceChildren(root);
        setPop({ win, root });
    };

    if (!session || session.room.roomId !== roomId) return <div className="mx_SetkaCall" />;
    if (session.error) return <div className="mx_SetkaCall mx_SetkaCall_error">{session.error}</div>;
    const participation = session.active;
    if (!participation) return <div className="mx_SetkaCall" />;
    if (pop) {
        return (
            <div className="mx_SetkaCall">
                <div className="mx_SetkaCall_stage" style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div className="mx_SetkaCall_room">Звонок идёт в отдельном окне</div>
                    <button type="button" className="mx_SetkaCall_tileFs" style={{ position: "static", opacity: 1 }} onClick={togglePopout}>
                        ⮌ Вернуть в это окно
                    </button>
                </div>
                {createPortal(
                    <Stage session={session} participation={participation} popped onPopout={togglePopout} />,
                    pop.root,
                )}
            </div>
        );
    }
    return (
        <div className="mx_SetkaCall">
            <Stage session={session} participation={participation} onPopout={togglePopout} />
        </div>
    );
};

// keep tree-shaking from dropping the shared store reference used by the dock
void SetkaCallAudio;
