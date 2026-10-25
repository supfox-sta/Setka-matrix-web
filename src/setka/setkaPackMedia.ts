/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { type SetkaPackKind, type SetkaPackSticker } from "./setkaStickerPacks";

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = (): void => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = (): void => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };
        image.src = url;
    });
}

export async function cropImageFileToSquare(file: File): Promise<{ blob: Blob; width: number; height: number }> {
    const image = await loadImageFromFile(file);
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = Math.floor((image.naturalWidth - size) / 2);
    const sy = Math.floor((image.naturalHeight - size) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);
    const mimeType = file.type.startsWith("image/") ? file.type : "image/png";
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (!result) reject(new Error("Failed to encode image"));
            else resolve(result);
        }, mimeType);
    });
    return { blob, width: size, height: size };
}

export async function uploadSetkaPackSticker(
    client: MatrixClient,
    file: File,
    kind: SetkaPackKind,
): Promise<SetkaPackSticker> {
    const { blob, width, height } = await cropImageFileToSquare(file);
    const mimeType = blob.type || "image/png";
    const extension = mimeType.includes("gif") ? "gif" : mimeType.includes("webp") ? "webp" : "png";
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "sticker";
    const { content_uri: mxcUrl } = await client.uploadContent(blob, {
        type: mimeType,
        name: `${baseName}.${extension}`,
    });
    const stickerSize = kind === "emoji" ? 50 : width;
    return {
        id: `sticker-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        name: kind === "emoji" ? `:${baseName.toLowerCase().replace(/\s+/g, "_")}:` : baseName,
        mxcUrl,
        mimeType,
        width: stickerSize,
        height: stickerSize,
        size: blob.size,
    };
}
