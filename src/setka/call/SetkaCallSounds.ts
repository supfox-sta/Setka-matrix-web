/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

/**
 * Short UI sounds for calls (join / leave / mute …), synthesised with WebAudio so no asset files are needed.
 */

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number };

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
    try {
        if (!ctx) {
            const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return null;
            ctx = new Ctor();
        }
        if (ctx.state === "suspended") void ctx.resume();
        return ctx;
    } catch {
        return null;
    }
}

function play(notes: Note[]): void {
    const c = audio();
    if (!c) return;
    const now = c.currentTime;
    for (const n of notes) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = n.type ?? "sine";
        osc.frequency.setValueAtTime(n.f, now + n.t);
        const peak = n.g ?? 0.12;
        gain.gain.setValueAtTime(0.0001, now + n.t);
        gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
        osc.connect(gain).connect(c.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.02);
    }
}

export type SetkaCallSound = "join" | "leave" | "peerJoin" | "peerLeave" | "mute" | "unmute" | "screen" | "error";

const SOUNDS: Record<SetkaCallSound, Note[]> = {
    // we joined: rising two-note
    join: [
        { f: 523.25, t: 0, d: 0.14 },
        { f: 783.99, t: 0.1, d: 0.22 },
    ],
    // we left: falling two-note
    leave: [
        { f: 659.25, t: 0, d: 0.14 },
        { f: 392, t: 0.1, d: 0.24 },
    ],
    // someone joined: soft up blip
    peerJoin: [
        { f: 587.33, t: 0, d: 0.1 },
        { f: 880, t: 0.08, d: 0.14 },
    ],
    // someone left: soft down blip
    peerLeave: [
        { f: 740, t: 0, d: 0.1 },
        { f: 440, t: 0.08, d: 0.16 },
    ],
    mute: [{ f: 330, t: 0, d: 0.12, type: "triangle" }],
    unmute: [{ f: 560, t: 0, d: 0.12, type: "triangle" }],
    screen: [
        { f: 440, t: 0, d: 0.1 },
        { f: 660, t: 0.09, d: 0.1 },
        { f: 880, t: 0.18, d: 0.16 },
    ],
    error: [
        { f: 220, t: 0, d: 0.2, type: "square", g: 0.05 },
        { f: 180, t: 0.16, d: 0.26, type: "square", g: 0.05 },
    ],
};

export function playCallSound(name: SetkaCallSound): void {
    play(SOUNDS[name]);
}
