/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { useTheme } from "../hooks/useTheme";
import {
    getEffectiveSetkaWallpaper,
    getSetkaCustomWallpaperImageId,
    getSetkaRoomWallpaper,
    getSetkaDefaultWallpaper,
    subscribeSetkaWallpaper,
} from "./setkaWallpaperStore";
import { getSetkaWallpaperImageObjectUrl } from "./setkaWallpaperImageDb";
import { isSetkaHomeserver } from "./SetkaConfig";
import { applySetkaAppearanceToDocument, readSetkaAppearance } from "./setkaAppearanceStore";

interface Props {
    client: MatrixClient;
    currentRoomId: string | null;
}

function applyWallpaperStyles(wallpaper: { backgroundImage?: string; backgroundColor?: string } | null): void {
    const root = document.documentElement;
    const body = document.body;

    if (wallpaper?.backgroundImage) {
        const imageValue = `url("${wallpaper.backgroundImage}")`;
        root.style.setProperty("--setka-wallpaper-image", imageValue);
        root.style.backgroundImage = imageValue;
        root.style.backgroundSize = "cover";
        root.style.backgroundPosition = "center";
        root.style.backgroundAttachment = "scroll";
        root.style.backgroundRepeat = "no-repeat";
    } else {
        root.style.removeProperty("--setka-wallpaper-image");
        root.style.backgroundImage = "";
        root.style.backgroundSize = "";
        root.style.backgroundPosition = "";
        root.style.backgroundAttachment = "";
        root.style.backgroundRepeat = "";
    }

    if (wallpaper?.backgroundColor) {
        root.style.setProperty("--setka-wallpaper-color", wallpaper.backgroundColor);
        root.style.backgroundColor = wallpaper.backgroundColor;
    } else {
        root.style.removeProperty("--setka-wallpaper-color");
        root.style.backgroundColor = "";
    }

    root.dataset.setkaWallpaper = wallpaper?.backgroundImage || wallpaper?.backgroundColor ? "on" : "off";

    if (body) {
        body.style.backgroundColor = "transparent";
        body.style.backgroundImage = "none";
    }
}

const SetkaWallpaperHost: React.FC<Props> = ({ client, currentRoomId }) => {
    const themeState = useTheme();
    const enabled = isSetkaHomeserver(client);
    const isDarkTheme = themeState.theme.includes("dark");
    const [revision, setRevision] = useState(0);
    const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);

    useLayoutEffect(() => {
        document.documentElement.dataset.setkaClient = enabled ? "true" : "false";
        document.documentElement.dataset.setkaThemeTone = enabled ? (isDarkTheme ? "dark" : "light") : "";
        if (enabled) {
            applySetkaAppearanceToDocument(readSetkaAppearance());
        }
        return () => {
            delete document.documentElement.dataset.setkaClient;
            delete document.documentElement.dataset.setkaThemeTone;
        };
    }, [enabled, isDarkTheme]);

    useEffect(() => {
        if (!enabled) return;
        return subscribeSetkaWallpaper(() => setRevision((v) => v + 1));
    }, [enabled]);

    const activeStyle = useMemo(() => {
        if (!enabled) return null;
        const roomStyle = currentRoomId ? getSetkaRoomWallpaper(currentRoomId) : null;
        return roomStyle ?? getSetkaDefaultWallpaper();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, currentRoomId, revision]);

    const imageId = useMemo(() => getSetkaCustomWallpaperImageId(activeStyle), [activeStyle]);

    useEffect(() => {
        if (!enabled || !imageId) {
            setCustomImageUrl(null);
            return;
        }
        let cancelled = false;
        (async () => {
            const url = await getSetkaWallpaperImageObjectUrl(imageId);
            if (!cancelled) setCustomImageUrl(url);
        })();
        return () => {
            cancelled = true;
        };
    }, [enabled, imageId, revision]);

    const wallpaper = useMemo(() => {
        if (!enabled) return null;
        return getEffectiveSetkaWallpaper(currentRoomId, isDarkTheme, customImageUrl);
    }, [enabled, currentRoomId, isDarkTheme, customImageUrl]);

    useEffect(() => {
        if (!enabled) {
            applyWallpaperStyles(null);
            return;
        }
        applyWallpaperStyles(wallpaper);
        return () => applyWallpaperStyles(null);
    }, [enabled, wallpaper]);

    return null;
};

export default SetkaWallpaperHost;
