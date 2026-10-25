/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

// oxlint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { useSyncExternalStore } from "react";

export type AudioKind = "voice" | "screen";

export interface AudioPref {
    muted: boolean;
    /** 0..1 */
    volume: number;
}

const STORAGE_KEY = "setka_call_volumes";
const UPDATE = "update";

/**
 * Local (listener-side) audio preferences for a call: per-user volume / mute, per-screen-share volume / mute
 * and "deafen" (silence everyone). Volumes are remembered per user across calls; mutes and deafen are not.
 */
class SetkaCallAudioPrefs extends EventEmitter {
    private version = 0;
    private _deafened = false;
    private micMutedByDeafen = false;
    private readonly muted = new Set<string>();
    private volumes: Record<string, number> = {};

    public constructor() {
        super();
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) this.volumes = JSON.parse(raw) as Record<string, number>;
        } catch {
            // ignore
        }
    }

    private static key(userId: string, kind: AudioKind): string {
        return `${userId}|${kind}`;
    }

    private changed(): void {
        this.version++;
        this.emit(UPDATE);
    }

    public get deafened(): boolean {
        return this._deafened;
    }

    public get(userId: string, kind: AudioKind): AudioPref {
        const k = SetkaCallAudioPrefs.key(userId, kind);
        return { muted: this.muted.has(k), volume: this.volumes[k] ?? 1 };
    }

    /** What the <audio> element should actually do right now. */
    public effective(userId: string, kind: AudioKind): AudioPref {
        const p = this.get(userId, kind);
        return { muted: p.muted || this._deafened, volume: p.volume };
    }

    public setMuted(userId: string, kind: AudioKind, muted: boolean): void {
        const k = SetkaCallAudioPrefs.key(userId, kind);
        if (muted) this.muted.add(k);
        else this.muted.delete(k);
        this.changed();
    }

    public setVolume(userId: string, kind: AudioKind, volume: number): void {
        const k = SetkaCallAudioPrefs.key(userId, kind);
        this.volumes[k] = Math.max(0, Math.min(1, volume));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.volumes));
        } catch {
            // ignore
        }
        this.changed();
    }

    /** Mute (or unmute) every given user's voice and screen share. */
    public setAllMuted(userIds: string[], muted: boolean): void {
        for (const id of userIds) {
            for (const kind of ["voice", "screen"] as AudioKind[]) {
                const k = SetkaCallAudioPrefs.key(id, kind);
                if (muted) this.muted.add(k);
                else this.muted.delete(k);
            }
        }
        this.changed();
    }

    public areAllMuted(userIds: string[]): boolean {
        return userIds.length > 0 && userIds.every((id) => this.muted.has(SetkaCallAudioPrefs.key(id, "voice")));
    }

    public setDeafened(value: boolean): void {
        this._deafened = value;
        this.changed();
    }

    public get wasMicMutedByDeafen(): boolean {
        return this.micMutedByDeafen;
    }

    public set wasMicMutedByDeafen(v: boolean) {
        this.micMutedByDeafen = v;
    }

    /** Called when a call ends: mutes and deafen do not leak into the next call. */
    public resetSession(): void {
        this._deafened = false;
        this.micMutedByDeafen = false;
        this.muted.clear();
        this.changed();
    }

    public subscribe = (cb: () => void): (() => void) => {
        this.on(UPDATE, cb);
        return () => {
            this.off(UPDATE, cb);
        };
    };

    public getVersion = (): number => this.version;
}

export const SetkaCallAudio = new SetkaCallAudioPrefs();

/** Re-renders when any audio preference changes. */
export function useCallAudioPrefs(): SetkaCallAudioPrefs {
    useSyncExternalStore(SetkaCallAudio.subscribe, SetkaCallAudio.getVersion);
    return SetkaCallAudio;
}
