/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

/** In-call device picker: microphone, camera, speakers. Opens above the control bar. */

import React, { type FC, useCallback, useEffect, useRef, useState } from "react";

import { type SetkaCallSession } from "./SetkaCallSession";

interface Devices {
    audioinput: MediaDeviceInfo[];
    videoinput: MediaDeviceInfo[];
    audiooutput: MediaDeviceInfo[];
}

const KEYS = {
    audioinput: "setka_call_mic",
    videoinput: "setka_call_cam",
    audiooutput: "setka_call_out",
} as const;

function readPref(kind: keyof Devices): string {
    try {
        return localStorage.getItem(KEYS[kind]) ?? "";
    } catch {
        return "";
    }
}

function writePref(kind: keyof Devices, id: string): void {
    try {
        localStorage.setItem(KEYS[kind], id);
    } catch {
        // ignore
    }
}

async function listDevices(): Promise<Devices> {
    const out: Devices = { audioinput: [], videoinput: [], audiooutput: [] };
    try {
        const all = await navigator.mediaDevices.enumerateDevices();
        for (const d of all) {
            if (d.kind === "audioinput" || d.kind === "videoinput" || d.kind === "audiooutput") {
                out[d.kind].push(d);
            }
        }
    } catch {
        // no permission / unsupported: lists stay empty
    }
    return out;
}

const Row: FC<{
    label: string;
    kind: keyof Devices;
    list: MediaDeviceInfo[];
    value: string;
    onChange: (id: string) => void;
}> = ({ label, kind, list, value, onChange }) => (
    <label className="mx_SetkaCallDevices_row">
        <span>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={!list.length}>
            {!list.length && <option value="">Недоступно</option>}
            {list.map((d, i) => (
                <option key={d.deviceId + i} value={d.deviceId}>
                    {d.label || `${label} ${i + 1}`}
                </option>
            ))}
        </select>
        <i hidden>{kind}</i>
    </label>
);

export const CallDevicesPanel: FC<{ session: SetkaCallSession; onClose: () => void }> = ({ session, onClose }) => {
    const [devices, setDevices] = useState<Devices>({ audioinput: [], videoinput: [], audiooutput: [] });
    const [sel, setSel] = useState<Record<keyof Devices, string>>({
        audioinput: readPref("audioinput"),
        videoinput: readPref("videoinput"),
        audiooutput: readPref("audiooutput"),
    });
    const ref = useRef<HTMLDivElement>(null);

    const refresh = useCallback(() => void listDevices().then(setDevices), []);
    useEffect(() => {
        refresh();
        navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
        return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
    }, [refresh]);

    useEffect(() => {
        const onDown = (e: MouseEvent): void => {
            const t = e.target as HTMLElement | null;
            if (ref.current && t && !ref.current.contains(t) && !t.closest("[data-call-devices-btn]")) onClose();
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [onClose]);

    const choose = (kind: keyof Devices, id: string): void => {
        setSel((p) => ({ ...p, [kind]: id }));
        writePref(kind, id);
        if (kind === "audioinput") void session.setInputDevice("microphone", id);
        else if (kind === "videoinput") void session.setInputDevice("camera", id);
        else void session.setOutputDevice(id);
    };

    const current = (kind: keyof Devices): string => {
        const list = devices[kind];
        if (list.some((d) => d.deviceId === sel[kind])) return sel[kind];
        return list.find((d) => d.deviceId === "default")?.deviceId ?? list[0]?.deviceId ?? "";
    };

    return (
        <div className="mx_SetkaCallDevices" ref={ref} role="dialog" aria-label="Настройки звонка">
            <div className="mx_SetkaCallDevices_title">Настройки звонка</div>
            <Row
                label="Микрофон"
                kind="audioinput"
                list={devices.audioinput}
                value={current("audioinput")}
                onChange={(id) => choose("audioinput", id)}
            />
            <Row
                label="Камера"
                kind="videoinput"
                list={devices.videoinput}
                value={current("videoinput")}
                onChange={(id) => choose("videoinput", id)}
            />
            <Row
                label="Динамики"
                kind="audiooutput"
                list={devices.audiooutput}
                value={current("audiooutput")}
                onChange={(id) => choose("audiooutput", id)}
            />
        </div>
    );
};
