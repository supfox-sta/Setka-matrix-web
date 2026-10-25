/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useMemo, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import {
    isSetkaMxcVideo,
    markSetkaMxcAsVideo,
    mxcToDownloadUrl,
    mxcToThumbnailUrl,
} from "./setkaMxcMediaUtils";

interface BackgroundProps {
    client: MatrixClient;
    mxc: string;
    className?: string;
    /** When true, render as looping video (from profile API or upload). */
    forceVideo?: boolean;
    width?: number;
    height?: number;
    method?: string;
}

/** Renders image or looping video for Setka profile/cover MXC URLs. */
export const SetkaMxcBackground: React.FC<BackgroundProps> = ({
    client,
    mxc,
    className,
    forceVideo = false,
}) => {
    const downloadUrl = useMemo(() => mxcToDownloadUrl(client, mxc), [client, mxc]);
    const [preferVideo, setPreferVideo] = useState(() => forceVideo || isSetkaMxcVideo(mxc));

    const onImageError = useCallback(() => {
        markSetkaMxcAsVideo(mxc);
        setPreferVideo(true);
    }, [mxc]);

    if (!downloadUrl) return null;

    if (preferVideo) {
        return (
            <video
                className={className}
                src={downloadUrl}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden
            />
        );
    }

    return <img className={className} src={downloadUrl} alt="" aria-hidden onError={onImageError} />;
};

interface AvatarProps {
    client: MatrixClient;
    mxc: string;
    className?: string;
    size?: number;
    forceVideo?: boolean;
}

/** Round video or image avatar for Setka Plus profiles. */
export const SetkaMxcAvatar: React.FC<AvatarProps> = ({
    client,
    mxc,
    className,
    size = 96,
    forceVideo = false,
}) => {
    const thumbnailUrl = useMemo(() => mxcToThumbnailUrl(client, mxc, size, size, "crop"), [client, mxc, size]);
    const downloadUrl = useMemo(() => mxcToDownloadUrl(client, mxc), [client, mxc]);
    const [preferVideo, setPreferVideo] = useState(() => forceVideo || isSetkaMxcVideo(mxc));

    const onImageError = useCallback(() => {
        markSetkaMxcAsVideo(mxc);
        setPreferVideo(true);
    }, [mxc]);

    if (!thumbnailUrl && !downloadUrl) return null;

    if (preferVideo) {
        if (!downloadUrl) return null;
        return (
            <video
                className={className}
                src={downloadUrl}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden
            />
        );
    }

    if (!thumbnailUrl) {
        if (!downloadUrl) return null;
        return (
            <video
                className={className}
                src={downloadUrl}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden
            />
        );
    }

    return <img className={className} src={thumbnailUrl} alt="" aria-hidden onError={onImageError} />;
};
