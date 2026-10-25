/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const STORAGE_KEY = "setka.mxcVideoUris";

function readSet(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((item): item is string => typeof item === "string"));
    } catch {
        return new Set();
    }
}

function writeSet(set: Set<string>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/** Remember MXC URIs uploaded as video (Matrix IDs have no file extension). */
export function markSetkaMxcAsVideo(mxc: string): void {
    if (!mxc) return;
    const set = readSet();
    set.add(mxc);
    writeSet(set);
}

export function isSetkaMxcMarkedVideo(mxc?: string | null): boolean {
    if (!mxc) return false;
    return readSet().has(mxc);
}

export function unmarkSetkaMxcAsVideo(mxc: string): void {
    if (!mxc) return;
    const set = readSet();
    if (!set.delete(mxc)) return;
    writeSet(set);
}
