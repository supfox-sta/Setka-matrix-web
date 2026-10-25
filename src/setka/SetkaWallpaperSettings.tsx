/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useRef, useState } from "react";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import {
    getSetkaDefaultWallpaper,
    importSetkaWallpaperImage,
    setSetkaDefaultWallpaper,
    SetkaWallpaperQuotaError,
    SETKA_WALLPAPER_AUTO,
    SETKA_WALLPAPER_DARK,
    SETKA_WALLPAPER_LIGHT,
} from "./setkaWallpaperStore";

const OPTIONS = [
    { id: SETKA_WALLPAPER_AUTO, labelKey: "setka|wallpaper|auto" as const },
    { id: SETKA_WALLPAPER_LIGHT, labelKey: "setka|wallpaper|light" as const },
    { id: SETKA_WALLPAPER_DARK, labelKey: "setka|wallpaper|dark" as const },
];

const SetkaWallpaperSettings: React.FC = () => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [style, setStyle] = useState(() => getSetkaDefaultWallpaper());
    const [error, setError] = useState<string | null>(null);

    const onSelect = useCallback((next: string) => {
        setSetkaDefaultWallpaper(next);
        setStyle(next);
        setError(null);
    }, []);

    const onCustomSelected = useCallback(async (ev: React.ChangeEvent<HTMLInputElement>) => {
        const file = ev.target.files?.[0];
        ev.target.value = "";
        if (!file) return;
        try {
            const customStyle = await importSetkaWallpaperImage(file);
            onSelect(customStyle);
        } catch (e) {
            setError(
                e instanceof SetkaWallpaperQuotaError ? _t("setka|wallpaper|quota_error") : _t("common|error"),
            );
        }
    }, [onSelect]);

    return (
        <div className="mx_SetkaWallpaperSettings">
            <p className="mx_SetkaWallpaperSettings_hint">{_t("setka|wallpaper|global_hint")}</p>
            {error && <p className="mx_SetkaWallpaperSettings_error">{error}</p>}
            <div className="mx_SetkaWallpaperSettings_options">
                {OPTIONS.map((option) => (
                    <AccessibleButton
                        key={option.id}
                        className={
                            "mx_SetkaWallpaperSettings_option" +
                            (style === option.id ? " mx_SetkaWallpaperSettings_option_active" : "")
                        }
                        onClick={() => onSelect(option.id)}
                    >
                        {_t(option.labelKey)}
                    </AccessibleButton>
                ))}
                <AccessibleButton
                    className="mx_SetkaWallpaperSettings_option"
                    onClick={() => fileRef.current?.click()}
                >
                    {_t("setka|wallpaper|custom")}
                </AccessibleButton>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="mx_SetkaProfilePage_hiddenInput"
                onChange={onCustomSelected}
            />
        </div>
    );
};

export default SetkaWallpaperSettings;
