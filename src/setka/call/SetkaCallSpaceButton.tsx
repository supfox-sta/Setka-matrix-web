/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type FC, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { useSetkaCallSession } from "./SetkaCallStore";
import { CallControls, stateLabel, VideoSurface } from "./SetkaCallView";
import { useBehavior } from "./useBehavior";
import { HeadphonesIcon, ReturnIcon, ScreenIcon } from "./SetkaCallIcons";

/** Small preview of the first shared screen in the call (any participant). */
const ScreenPreview: FC<{ members: Array<{ tracks$: any; displayName$: any; local: boolean }> }> = ({ members }) => {
    // hooks cannot run in a loop, so each member renders its own optional preview
    return (
        <>
            {members.map((m, i) => (
                <MemberScreen key={i} member={m} />
            ))}
        </>
    );
};

const MemberScreen: FC<{ member: { tracks$: any; displayName$: any; local: boolean } }> = ({ member }) => {
    const tracks = (useBehavior(member.tracks$) ?? []) as Array<{ source: string }>;
    const name = useBehavior(member.displayName$) as string | undefined;
    const screen = tracks.find((t) => t.source === "screenShare");
    if (!screen) return null;
    return (
        <div className="mx_SetkaCallMini_screen">
            <VideoSurface track={screen as any} />
            <div className="mx_SetkaCallMini_screenName">
                <ScreenIcon width={12} height={12} /> {member.local ? "Ваш экран" : (name ?? "Демонстрация")}
            </div>
        </div>
    );
};

/**
 * Button for the space panel (replaces the quick-settings button for Setka): shows whether a call is
 * running and opens a small glass popover with the call controls and the shared screens.
 */
const SetkaCallSpaceButton: FC<{ isPanelCollapsed: boolean }> = ({ isPanelCollapsed }) => {
    const session = useSetkaCallSession();
    const participation = session?.active ?? null;
    const state = useBehavior(participation?.state$);
    const remotes = useBehavior(participation?.remoteMembers$) ?? [];
    const local = useBehavior(participation?.localMember$);
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ left: 0, bottom: 0 });

    useEffect(() => {
        if (!open) return;
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setPos({ left: r.right + 10, bottom: Math.max(8, window.innerHeight - r.bottom) });
        const close = (e: Event): void => {
            if (e instanceof KeyboardEvent && e.key !== "Escape") return;
            const t = e.target as Node | null;
            if (t && (popRef.current?.contains(t) || btnRef.current?.contains(t))) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", close, true);
        document.addEventListener("keydown", close, true);
        return () => {
            document.removeEventListener("mousedown", close, true);
            document.removeEventListener("keydown", close, true);
        };
    }, [open]);

    useEffect(() => {
        if (!participation) setOpen(false);
    }, [participation]);

    const inCall = Boolean(session && participation);
    const members = [...remotes, ...(local ? [local] : [])];
    const label = stateLabel(state);

    return (
        <div className={classNames("mx_SetkaCallSpaceButton", { collapsed: isPanelCollapsed })}>
            <button
                ref={btnRef}
                type="button"
                className="mx_SetkaCallSpaceButton_btn"
                data-live={inCall || undefined}
                title={inCall ? `Звонок: ${session!.room.name}` : "Нет активного звонка"}
                onClick={() => setOpen((v) => !v)}
            >
                <HeadphonesIcon width={20} height={20} />
                {inCall && <span className="mx_SetkaCallSpaceButton_dot" />}
                {!isPanelCollapsed && <span className="mx_SetkaCallSpaceButton_label">{inCall ? "Звонок" : "Звонки"}</span>}
            </button>
            {open &&
                createPortal(
                    <div ref={popRef} className="mx_SetkaCallMini" style={{ left: pos.left, bottom: pos.bottom }}>
                        {inCall && session && participation ? (
                            <>
                                <div className="mx_SetkaCallMini_head">
                                    <span className="mx_SetkaCall_dot" data-live={state?.kind === "connected" || undefined} />
                                    <div className="mx_SetkaCallMini_title">
                                        <b>{session.room.name}</b>
                                        <span>{label ?? `Участников: ${members.length}`}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="mx_SetkaCallMini_open"
                                        title="Открыть звонок"
                                        onClick={() => {
                                            setOpen(false);
                                            defaultDispatcher.dispatch<ViewRoomPayload>({
                                                action: Action.ViewRoom,
                                                room_id: session.room.roomId,
                                                view_call: true,
                                                metricsTrigger: undefined,
                                            });
                                        }}
                                    >
                                        <ReturnIcon width={16} height={16} /> Открыть
                                    </button>
                                </div>
                                <ScreenPreview members={members as any} />
                                <CallControls session={session} participation={participation} compact />
                            </>
                        ) : (
                            <div className="mx_SetkaCallMini_empty">
                                Сейчас вы не в звонке.
                                <span>Начать звонок можно кнопками в шапке комнаты.</span>
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
        </div>
    );
};

export default SetkaCallSpaceButton;
