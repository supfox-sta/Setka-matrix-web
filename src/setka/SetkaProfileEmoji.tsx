/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { fetchSetkaProfile, type SetkaProfile } from "./SetkaProfileApi";
import { mediaFromMxc } from "../customisations/Media";

interface Props {
    client: MatrixClient;
    userId: string;
    className?: string;
    size?: number;
}

/** Renders Setka status emoji badge next to usernames. */
const SetkaProfileEmoji: React.FC<Props> = ({ client, userId, className, size = 18 }) => {
    const [profile, setProfile] = useState<SetkaProfile | null>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const data = await fetchSetkaProfile(client, userId);
                if (!cancelled) setProfile(data);
            } catch {
                if (!cancelled) setProfile(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client, userId]);

    const mxc = profile?.statusEmojiMxc;
    if (!mxc) return null;

    const url = mediaFromMxc(mxc, client).getSquareThumbnailHttp(size);
    if (!url) return null;

    return <img className={className ?? "mx_SetkaProfileEmoji"} src={url} alt="" width={size} height={size} />;
};

export default SetkaProfileEmoji;
