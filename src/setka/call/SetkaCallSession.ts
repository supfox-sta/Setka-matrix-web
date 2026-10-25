/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

/**
 * Native Setka call: MatrixRTC + LiveKit through Element Call's headless SDK
 * (`@element-hq/matrixrtc-sdk`). No Element Call UI, no iframe, no widget API:
 * this class owns the session, the UI (SetkaCallView) only renders its observables.
 */

import {
    createRTCSlot,
    defaultSessionTimings,
    E2eeType,
    MatrixRTCMode,
    ObservableScope,
    type AudioMediaTrack,
    type EncryptionSystem,
    type LocalAudioMediaTrack,
    type LocalRTCMember,
    type LocalVideoMediaTrack,
    type MediaSource,
    type ParticipationState,
    type PublishRequest,
    type RTCParticipation,
    type RTCSlot,
} from "@element-hq/matrixrtc-sdk";
import { BehaviorSubject } from "rxjs";
import { ClientEvent, type MatrixClient, type MatrixEvent, type Room } from "matrix-js-sdk/src/matrix";
import { MatrixRTCSessionEvent } from "matrix-js-sdk/src/matrixrtc";
import { decodeBase64 } from "matrix-js-sdk/src/base64";

import { playCallSound } from "./SetkaCallSounds";

export type SetkaCallIntent = "audio" | "video";

export interface SetkaCallOptions {
    /** audio: start with the microphone only; video: microphone + camera. */
    intent: SetkaCallIntent;
    /** Ring the other side (DM) or just notify the room (group) when we are the first to join. */
    notify?: "ring" | "notification";
}

/** Livekit JWT service used when the homeserver does not advertise MSC4143 transports. */
const FALLBACK_LIVEKIT_SERVICE_URL = "https://call.setka-matrix.ru/livekit/jwt";

function livekitFallbackUrl(): string {
    return FALLBACK_LIVEKIT_SERVICE_URL;
}

export class SetkaCallSession {
    private readonly scope = new ObservableScope();
    private slot: RTCSlot | null = null;
    private participation: RTCParticipation | null = null;
    private readonly participation$ = new BehaviorSubject<RTCParticipation | null>(null);

    /** Emits the live participation, or null before join()/after leave(). */
    public readonly current$ = this.participation$.asObservable();
    public get state(): ParticipationState | undefined {
        return this.participation?.state$.value;
    }

    public constructor(
        public readonly client: MatrixClient,
        public readonly room: Room,
        public readonly options: SetkaCallOptions,
    ) {}

    /** Set when joining failed synchronously; shown on the stage. */
    public error: string | null = null;

    public get active(): RTCParticipation | null {
        return this.participation;
    }

    public join(): RTCParticipation {
        if (this.participation) return this.participation;

        const encryptionSystem: EncryptionSystem = this.client.isRoomEncrypted(this.room.roomId)
            ? { kind: E2eeType.PER_PARTICIPANT }
            : { kind: E2eeType.NONE };

        this.slot = createRTCSlot(this.scope, this.client, this.room, {
            encryptionSystem,
            matrixRTCMode: MatrixRTCMode.Compatibility,
        });

        const publish: PublishRequest[] = [{ source: "microphone" }];
        if (this.options.intent === "video") publish.push({ source: "camera" });

        const participation = this.slot.join({
            publish,
            sendNotificationType: this.options.notify,
            applicationData: { "m.call.intent": this.options.intent },
            timings: {
                ...defaultSessionTimings,
                delayedLeave: { delay_ms: 18_000, restart_ms: 4_000 },
            },
            // Lighter than the defaults (1080p30 / 5 Mbit screen share): far less load on the network and CPU.
            mediaQuality: {
                video: { max_resolution: 720, max_bitrate: 1_200_000, max_framerate: 24 },
                screen_share: {
                    max_resolution: 900,
                    max_bitrate: 2_000_000,
                    max_framerate: 15,
                    simulcast_layers: [
                        { height: 360, bitrate: 300_000, framerate: 8 },
                        { height: 540, bitrate: 800_000, framerate: 12 },
                    ],
                },
            },
            fallbackTransport: { type: "livekit", livekit_service_url: livekitFallbackUrl() },
        });
        this.participation = participation;
        this.participation$.next(participation);
        if (encryptionSystem.kind !== E2eeType.NONE) this.startKeyBridge(participation);
        return participation;
    }

    private stopKeyBridge: (() => void) | null = null;

    /**
     * Safety net for end-to-end encrypted calls. The SDK only accepts a media key when the sender's
     * (user, device, member id) triple matches a membership event exactly; when a peer's client labels its
     * member id differently the key is parked forever and the peer is silent (MissingKey).
     * Here we read the same to-device key events ourselves and hand the key to the media layer for the
     * remote member that matches by user + device. Setting the same key twice is harmless.
     */
    private startKeyBridge(participation: RTCParticipation): void {
        const roomId = this.room.roomId;
        const rtcSession = this.client.matrixRTC.getRoomSession(this.room);
        const pending: Array<{ sender: string; device?: string; index: number; key: Uint8Array<ArrayBuffer> }> = [];

        const deliver = (): void => {
            const remotes = participation.remoteMembers$.value ?? [];
            for (let i = pending.length - 1; i >= 0; i--) {
                const k = pending[i];
                const byDevice = remotes.filter(
                    (m) => m.userId === k.sender && (!k.device || m.deviceId === k.device),
                );
                const candidates = byDevice.length ? byDevice : remotes.filter((m) => m.userId === k.sender);
                if (!candidates.length) continue;
                for (const m of candidates) {
                    for (const identity of m.backendIdentities) {
                        (rtcSession as any).emit(
                            MatrixRTCSessionEvent.EncryptionKeyChanged,
                            k.key,
                            k.index,
                            { userId: m.userId, deviceId: m.deviceId, memberId: m.memberId },
                            identity,
                        );
                    }
                }
                pending.splice(i, 1);
            }
        };

        const onToDevice = (ev: MatrixEvent): void => {
            try {
                if (ev.getType() !== "io.element.call.encryption_keys") return;
                const c = ev.getContent<any>();
                if (c?.room_id !== roomId) return;
                const mk = c.media_key ?? c.keys;
                const sender = ev.getSender();
                if (!mk || typeof mk.key !== "string" || typeof mk.index !== "number" || !sender) return;
                if (sender === this.client.getUserId() && c.member?.claimed_device_id === this.client.getDeviceId()) return;
                pending.push({
                    sender,
                    device: c.member?.claimed_device_id,
                    index: mk.index,
                    key: decodeBase64(mk.key),
                });
                deliver();
            } catch {
                // never break the call because of the safety net
            }
        };

        this.client.on(ClientEvent.ToDeviceEvent, onToDevice);
        const sub = participation.remoteMembers$.subscribe(() => deliver());
        this.stopKeyBridge = () => {
            this.client.off(ClientEvent.ToDeviceEvent, onToDevice);
            sub.unsubscribe();
        };
    }

    public leave(): void {
        this.stopKeyBridge?.();
        this.stopKeyBridge = null;
        const p = this.participation;
        this.participation = null;
        this.participation$.next(null);
        try {
            p?.leave();
        } finally {
            this.scope.end();
        }
    }

    private localTrack(source: MediaSource): LocalAudioMediaTrack | LocalVideoMediaTrack | undefined {
        const local: LocalRTCMember | null | undefined = this.participation?.localMember$.value;
        return local?.tracks$.value?.find((t) => t.source === source);
    }

    public isMuted(source: "microphone" | "camera"): boolean {
        const track = this.localTrack(source);
        return !track || track.muted$.value;
    }

    /** Toggles a device. Publishes the source first when it was never published (e.g. camera in an audio call). */
    public async toggle(source: "microphone" | "camera"): Promise<boolean> {
        const p = this.participation;
        if (!p) return false;
        const track = this.localTrack(source);
        if (!track) {
            await p.publish({ source });
            playCallSound("unmute");
            return true;
        }
        const result = await track.setEnabled(track.muted$.value);
        playCallSound(this.isMuted(source) ? "mute" : "unmute");
        return result;
    }

    /** Switches the microphone / camera to another device (publishes it first when it was off). */
    public async setInputDevice(source: "microphone" | "camera", deviceId: string): Promise<void> {
        const p = this.participation;
        if (!p || !deviceId) return;
        try {
            const track = this.localTrack(source) as any;
            if (track?.setDevice) await track.setDevice(deviceId);
            else if (source === "microphone") await p.publish({ source, deviceId } as any);
        } catch (e) {
            this.error = `Не удалось сменить устройство: ${(e as Error)?.message ?? e}`;
        }
    }

    public async setOutputDevice(deviceId: string): Promise<void> {
        if (!deviceId) return;
        try {
            await (this.participation as any)?.setAudioOutputDeviceId?.(deviceId);
        } catch {
            // ignore: fall back to element sinks below
        }
        document.querySelectorAll("audio").forEach((a) => (a as any).setSinkId?.(deviceId)?.catch?.(() => {}));
    }

    public async toggleScreenShare(): Promise<boolean> {
        const p = this.participation;
        if (!p) return false;
        const sharing = Boolean(this.localTrack("screenShare"));
        if (sharing) {
            await p.unpublish("screenShare");
            return false;
        }
        await p.publish({ source: "screenShare" });
        playCallSound("screen");
        return true;
    }

    /** True if the track is the audio level source of a speaking member (kept for UI helpers). */
    public static isAudio(track: { kind: string }): track is AudioMediaTrack {
        return track.kind === "audio";
    }
}
