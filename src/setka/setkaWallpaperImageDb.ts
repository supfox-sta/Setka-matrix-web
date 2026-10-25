/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const DB_NAME = "setka-wallpaper-images";
const DB_VERSION = 1;
const STORE = "blobs";

const objectUrlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function putBlob(imageId: string, blob: Blob): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(blob, imageId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

async function getBlob(imageId: string): Promise<Blob | null> {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(imageId);
        req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
}

export async function compressWallpaperFile(file: File, maxDim = 1600, quality = 0.8): Promise<Blob> {
    if (!file.type.startsWith("image/")) {
        throw new Error("Unsupported file type");
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        bitmap.close();
        throw new Error("Canvas unavailable");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error("Compression failed"))),
            "image/jpeg",
            quality,
        );
    });
    return blob;
}

export async function storeSetkaWallpaperImageBlob(imageId: string, blob: Blob): Promise<void> {
    const cachedUrl = objectUrlCache.get(imageId);
    if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        objectUrlCache.delete(imageId);
    }
    await putBlob(imageId, blob);
}

export async function getSetkaWallpaperImageObjectUrl(imageId: string): Promise<string | null> {
    const cached = objectUrlCache.get(imageId);
    if (cached) return cached;

    const legacy = localStorage.getItem(`setka.wallpaper.image.${imageId}`);
    if (legacy) {
        try {
            const res = await fetch(legacy);
            const blob = await res.blob();
            await putBlob(imageId, blob);
            localStorage.removeItem(`setka.wallpaper.image.${imageId}`);
        } catch {
            return legacy;
        }
    }

    const blob = await getBlob(imageId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(imageId, url);
    return url;
}

export function revokeSetkaWallpaperImageObjectUrl(imageId: string): void {
    const cached = objectUrlCache.get(imageId);
    if (cached) {
        URL.revokeObjectURL(cached);
        objectUrlCache.delete(imageId);
    }
}
