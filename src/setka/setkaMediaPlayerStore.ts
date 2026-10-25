/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

// oxlint-disable-next-line no-restricted-imports
import EventEmitter from "events";
import { type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";

import { type Playback, PlaybackState } from "../audio/Playback";
import { PlaybackManager } from "../audio/PlaybackManager";
import { UPDATE_EVENT } from "../stores/AsyncStore";
import { isVoiceMessage } from "../utils/EventUtils";
import { isSetkaVideoNote } from "./setkaVideoNote";
import dis from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";

export type SetkaMediaKind = "voice" | "music" | "video_note";

export interface SetkaMediaSession {
    kind: SetkaMediaKind;
    roomId: string;
    eventId: string;
    title: string;
    playing: boolean;
    playback?: Playback;
    videoElement?: HTMLVideoElement;
    tileVisible: boolean;
}

export enum SetkaMediaPlayerStoreEvent {
    Update = "update",
}

class SetkaMediaPlayerStore extends EventEmitter {
    private session: SetkaMediaSession | null = null;
    private playbackByEventId = new Map<string, Playback>();
    private playbackListeners = new Map<string, () => void>();
    private videoNotePlayByEventId = new Map<string, () => void>();
    private userDismissed = false;
    private volume = 1;

    public getSession(): SetkaMediaSession | null {
        return this.session;
    }

    public registerPlayback(eventId: string, playback: Playback): void {
        this.playbackByEventId.set(eventId, playback);
    }

    public unregisterPlayback(eventId: string): void {
        const playback = this.playbackByEventId.get(eventId);
        // The tile unmounts when the user opens another room. Audio that is still playing/paused
        // keeps its session so the PiP player in the left panel can carry on.
        const alive =
            this.session?.eventId === eventId &&
            playback &&
            (playback.currentState === PlaybackState.Playing || playback.currentState === PlaybackState.Paused);
        if (alive) {
            this.playbackByEventId.delete(eventId);
            return;
        }
        if (this.session?.eventId === eventId) {
            this.session = null;
            this.emit(SetkaMediaPlayerStoreEvent.Update);
        }
        const listener = this.playbackListeners.get(eventId);
        if (playback && listener) {
            playback.off(UPDATE_EVENT, listener);
        }
        this.playbackByEventId.delete(eventId);
        this.playbackListeners.delete(eventId);
    }

    private retained: Playback | null = null;

    private releaseRetained(except?: Playback): void {
        if (this.retained && this.retained !== except) {
            this.retained.destroy();
            this.retained = null;
        }
    }

    /** True if the tile's playback is still playing/paused as the active session: do not destroy it. */
    public retainIfActive(eventId: string, playback?: Playback): boolean {
        if (
            playback &&
            this.session?.eventId === eventId &&
            this.session.playback === playback &&
            (playback.currentState === PlaybackState.Playing || playback.currentState === PlaybackState.Paused)
        ) {
            this.retained = playback;
            return true;
        }
        return false;
    }

    /** Voice messages / video notes of the session's room, for the PiP playlist. */
    public getPlaylist(room: Room): MatrixEvent[] {
        return room
            .getLiveTimeline()
            .getEvents()
            .filter((ev) => isVoiceMessage(ev) || isSetkaVideoNote(ev));
    }

    /** Audio files (mp3, wav, ...) of a room: not voice messages, not video notes. */
    public getMusicPlaylist(room: Room): MatrixEvent[] {
        return room
            .getLiveTimeline()
            .getEvents()
            .filter((ev) => ev.getContent()?.msgtype === "m.audio" && !isVoiceMessage(ev) && !ev.isRedacted());
    }

    public static fileName(ev: MatrixEvent): string {
        return String(ev.getContent()?.filename ?? ev.getContent()?.body ?? "");
    }

    /** Plays an item of the playlist; if its tile is not mounted (other room) jumps to it. */
    public playEvent(room: Room, mxEvent: MatrixEvent): void {
        if (this.session?.eventId === mxEvent.getId()) {
            this.togglePlay();
            return;
        }
        void this.playMediaAtEvent(mxEvent);
    }

    public registerVideoNotePlay(eventId: string, playFn: () => void): void {
        this.videoNotePlayByEventId.set(eventId, playFn);
    }

    public unregisterVideoNotePlay(eventId: string): void {
        this.videoNotePlayByEventId.delete(eventId);
    }

    public clear(): void {
        this.userDismissed = true;
        const eventId = this.session?.eventId;
        const playback = eventId ? this.playbackByEventId.get(eventId) : undefined;
        const listener = eventId ? this.playbackListeners.get(eventId) : undefined;
        if (playback && listener) {
            playback.off(UPDATE_EVENT, listener);
        }
        if (this.session?.playback) {
            void this.session.playback.stop();
        }
        this.session?.videoElement?.pause();
        this.session = null;
        this.releaseRetained();
        this.emit(SetkaMediaPlayerStoreEvent.Update);
    }

    public seekTo(fraction: number): void {
        const clamped = Math.min(1, Math.max(0, fraction));
        if (this.session?.kind === "video_note" && this.session.videoElement) {
            const video = this.session.videoElement;
            if (!Number.isFinite(video.duration)) return;
            video.currentTime = clamped * video.duration;
            this.emit(SetkaMediaPlayerStoreEvent.Update);
            return;
        }
        const playback = this.session?.playback;
        if (!playback || !Number.isFinite(playback.durationSeconds)) return;
        void playback.skipTo(clamped * playback.durationSeconds);
    }

    public setVolume(volume: number): void {
        const clamped = Math.min(1, Math.max(0, volume));
        this.volume = clamped;
        if (this.session?.videoElement) {
            this.session.videoElement.muted = clamped === 0;
            this.session.videoElement.volume = clamped;
        }
        this.session?.playback?.setVolume(clamped);
    }

    public getVolume(): number {
        return this.volume;
    }

    public setTileVisible(eventId: string, visible: boolean): void {
        if (!this.session || this.session.eventId !== eventId) return;
        if (this.session.tileVisible === visible) return;
        this.session = { ...this.session, tileVisible: visible };
        this.emit(SetkaMediaPlayerStoreEvent.Update);
    }

    public attachAudioPlayback(
        playback: Playback,
        roomId: string,
        mxEvent: MatrixEvent,
        title: string,
    ): void {
        const kind: SetkaMediaKind = isVoiceMessage(mxEvent) ? "voice" : "music";
        const eventId = mxEvent.getId()!;

        this.registerPlayback(eventId, playback);
        if (this.playbackListeners.has(eventId)) return;

        let hasBeenPlayingOrPaused = false;

        const listener = (): void => {
            if (this.userDismissed && playback.currentState !== PlaybackState.Playing) {
                return;
            }
            const playing = playback.currentState === PlaybackState.Playing;
            if (playback.currentState === PlaybackState.Playing) {
                this.userDismissed = false;
            }
            if (
                playback.currentState === PlaybackState.Playing ||
                playback.currentState === PlaybackState.Paused
            ) {
                hasBeenPlayingOrPaused = true;
            }
            if (playback.currentState === PlaybackState.Stopped) {
                if (this.session?.eventId === eventId && hasBeenPlayingOrPaused) {
                    this.clear();
                }
                return;
            }
            if (
                playback.currentState !== PlaybackState.Playing &&
                playback.currentState !== PlaybackState.Paused
            ) {
                return;
            }
            if (!this.session || this.session.eventId !== eventId) {
                this.releaseRetained(playback);
                this.session = {
                    kind,
                    roomId,
                    eventId,
                    title,
                    playing,
                    playback,
                    tileVisible: true,
                };
                playback.setVolume(this.volume);
            } else {
                this.session = { ...this.session, playing };
            }
            this.emit(SetkaMediaPlayerStoreEvent.Update);
        };
        this.playbackListeners.set(eventId, listener);
        playback.on(UPDATE_EVENT, listener);
    }

    public attachVideoNote(
        roomId: string,
        mxEvent: MatrixEvent,
        title: string,
        videoElement: HTMLVideoElement,
        playing: boolean,
    ): void {
        this.userDismissed = false;
        videoElement.muted = this.volume === 0;
        videoElement.volume = this.volume;
        this.session = {
            kind: "video_note",
            roomId,
            eventId: mxEvent.getId()!,
            title,
            playing,
            videoElement,
            tileVisible: true,
        };
        this.emit(SetkaMediaPlayerStoreEvent.Update);
    }

    public updateVideoPlaying(playing: boolean): void {
        if (!this.session || this.session.kind !== "video_note") return;
        this.session = { ...this.session, playing };
        this.emit(SetkaMediaPlayerStoreEvent.Update);
    }

    public togglePlay(): void {
        if (!this.session) return;

        if (this.session.kind === "video_note" && this.session.videoElement) {
            const video = this.session.videoElement;
            if (video.paused) {
                void video.play();
            } else {
                video.pause();
            }
            return;
        }

        const playback = this.session.playback;
        if (!playback) return;
        if (playback.currentState === PlaybackState.Playing) {
            playback.pause();
        } else {
            this.userDismissed = false;
            void playback.play();
        }
    }

    public playNext(room: Room): void {
        if (!this.session) return;
        const target = this.findAdjacentMedia(room, 1);
        if (target) void this.playMediaAtEvent(target);
    }

    public playPrevious(room: Room): void {
        if (!this.session) return;
        const target = this.findAdjacentMedia(room, -1);
        if (target) void this.playMediaAtEvent(target);
    }

    public dismissVideoNote(): void {
        if (!this.session || this.session.kind !== "video_note") return;
        this.session.videoElement?.pause();
        this.clear();
    }

    private findAdjacentMedia(room: Room, direction: 1 | -1): MatrixEvent | null {
        if (!this.session) return null;
        const events =
            this.session.kind === "music"
                ? this.getMusicPlaylist(room)
                : room
                      .getLiveTimeline()
                      .getEvents()
                      .filter((ev) => isVoiceMessage(ev) || isSetkaVideoNote(ev));
        const index = events.findIndex((ev) => ev.getId() === this.session!.eventId);
        if (index < 0) return null;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= events.length) return null;
        return events[nextIndex];
    }

    /** A voice message that is still being downloaded / decoded cannot play yet: wait for it instead of failing. */
    private async playWhenReady(playback: Playback): Promise<void> {
        if (playback.currentState === PlaybackState.Decoding) {
            await new Promise<void>((resolve) => {
                const done = (): void => {
                    playback.off(UPDATE_EVENT, onUpdate);
                    window.clearTimeout(timer);
                    resolve();
                };
                const onUpdate = (): void => {
                    if (playback.currentState !== PlaybackState.Decoding) done();
                };
                const timer = window.setTimeout(done, 20000);
                playback.on(UPDATE_EVENT, onUpdate);
            });
        }
        try {
            await playback.play();
        } catch {
            /* a failed decode must not leave the player stuck */
        }
    }

    private async playMediaAtEvent(mxEvent: MatrixEvent): Promise<void> {
        const eventId = mxEvent.getId()!;
        this.userDismissed = false;

        if (this.session?.playback) {
            this.session.playback.pause();
        }
        this.session?.videoElement?.pause();

        const playback = this.playbackByEventId.get(eventId);
        if (playback) {
            PlaybackManager.instance.pauseAllExcept(playback);
            await this.playWhenReady(playback);
            return;
        }

        const playVideoNote = this.videoNotePlayByEventId.get(eventId);
        if (playVideoNote) {
            playVideoNote();
            return;
        }

        const tile = document.querySelector(`[data-event-id="${eventId}"]`);
        if (!tile) {
            // Not mounted (another room is open): jump to the message in its room.
            dis.dispatch({
                action: Action.ViewRoom,
                room_id: mxEvent.getRoomId(),
                event_id: eventId,
                highlighted: true,
                metricsTrigger: undefined,
            });
            return;
        }
        tile.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
            const playButton = tile?.querySelector<HTMLElement>(
                '[class*="PlayPauseButton"], .mx_SetkaVideoNote_playHit',
            );
            playButton?.click();
        }, 320);
    }
}

export const setkaMediaPlayerStore = new SetkaMediaPlayerStore();
