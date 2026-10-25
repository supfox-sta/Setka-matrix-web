/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { isSetkaMxcMarkedVideo, markSetkaMxcAsVideo } from "./setkaMxcVideoRegistry";

const VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i;

export function mxcPathLooksLikeVideo(mxc?: string | null): boolean {
    if (!mxc) return false;
    const path = mxc.split("/").pop() ?? "";
    return VIDEO_EXT_PATTERN.test(path) || path.includes("video");
}

export function isSetkaMxcVideo(mxc?: string | null): boolean {
    return mxcPathLooksLikeVideo(mxc) || isSetkaMxcMarkedVideo(mxc);
}

export { markSetkaMxcAsVideo };

/** Full media download URL — required for video (thumbnail API returns 400). */
export function mxcToDownloadUrl(client: MatrixClient, mxc: string): string | null {
    return client.mxcUrlToHttp(mxc) ?? null;
}

/** Thumbnail URL for images only. */
export function mxcToThumbnailUrl(
    client: MatrixClient,
    mxc: string,
    width?: number,
    height?: number,
    method?: string,
): string | null {
    return client.mxcUrlToHttp(mxc, width, height, method) ?? null;
}

/** @deprecated Use mxcToThumbnailUrl or mxcToDownloadUrl explicitly. */
export function mxcToHttpUrl(
    client: MatrixClient,
    mxc: string,
    width?: number,
    height?: number,
    method?: string,
): string | null {
    if (width === undefined && height === undefined) {
        return mxcToDownloadUrl(client, mxc);
    }
    return mxcToThumbnailUrl(client, mxc, width, height, method);
}
