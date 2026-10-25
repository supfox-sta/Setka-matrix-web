/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

// oxlint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { useSyncExternalStore } from "react";
import type { MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import type { Call } from "../../models/Call";
import { SetkaCallSession, type SetkaCallOptions } from "./SetkaCallSession";
import { playCallSound } from "./SetkaCallSounds";
import { SetkaCallAudio } from "./SetkaCallAudio";

const UPDATE = "update";

/**
 * Owns the one active native call. It lives outside React so the call survives navigation:
 * the stage (SetkaCallView) and the dock (SetkaCallDock: audio + mini bar) only render it.
 */
export class SetkaCallStore extends EventEmitter {
    public static readonly instance = new SetkaCallStore();

    private _session: SetkaCallSession | null = null;
    private _call: Call | null = null;
    private stateSub: { unsubscribe(): void } | null = null;

    public get session(): SetkaCallSession | null {
        return this._session;
    }

    public get roomId(): string | null {
        return this._session?.room.roomId ?? null;
    }

    /** Starts (or returns) the call for a room. Any call in another room is ended first. */
    public start(client: MatrixClient, room: Room, options: SetkaCallOptions, call: Call): SetkaCallSession {
        if (this._session && this._session.room.roomId === room.roomId) {
            this.bindCall(call);
            return this._session;
        }
        this.end();

        const session = new SetkaCallSession(client, room, options);
        this._session = session;
        this.bindCall(call);

        try {
            const participation = session.join();
            let wasConnected = false;
            this.stateSub = participation.state$.subscribe((state) => {
                if (this._session !== session) return;
                if (state.kind === "connected" && !wasConnected) {
                    wasConnected = true;
                    playCallSound("join");
                    this._call?.setConnected();
                } else if (state.kind === "failed") {
                    playCallSound("error");
                } else if (state.kind === "left") {
                    this.end();
                }
                this.emit(UPDATE);
            });
        } catch (e) {
            // Keep the session object so the stage can show the error; the user can close it.
            session.error = e instanceof Error ? e.message : String(e);
        }
        this.emit(UPDATE);
        return session;
    }

    private bindCall(call: Call): void {
        if (this._call && this._call !== call) delete (this._call as { nativeDisconnect?: () => void }).nativeDisconnect;
        this._call = call;
        (call as { nativeDisconnect?: () => void }).nativeDisconnect = () => this.end();
    }

    /** Leaves the call and tells the Call model, so the rest of the client (header, PiP, tiles) updates. */
    public end(): void {
        const session = this._session;
        const call = this._call;
        this.stateSub?.unsubscribe();
        this.stateSub = null;
        this._session = null;
        this._call = null;
        if (session) {
            session.leave();
            SetkaCallAudio.resetSession();
            playCallSound("leave");
        }
        if (call) {
            delete (call as { nativeDisconnect?: () => void }).nativeDisconnect;
            if (call.connected) call.setDisconnected();
            call.close();
        }
        this.emit(UPDATE);
    }

    public subscribe = (listener: () => void): (() => void) => {
        this.on(UPDATE, listener);
        return () => {
            this.off(UPDATE, listener);
        };
    };
}

/** The active native call session (re-renders when it starts or ends). */
export function useSetkaCallSession(): SetkaCallSession | null {
    return useSyncExternalStore(SetkaCallStore.instance.subscribe, () => SetkaCallStore.instance.session);
}
