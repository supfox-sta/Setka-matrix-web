/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useRef, useState } from "react";
import { MenuItem } from "@vector-im/compound-web";
import ImageIcon from "@vector-im/compound-design-tokens/assets/web/icons/image";

import { _t } from "../languageHandler";
import {
    getSetkaRoomWallpaper,
    importSetkaWallpaperImage,
    setSetkaRoomWallpaper,
    SetkaWallpaperQuotaError,
    SETKA_WALLPAPER_AUTO,
    SETKA_WALLPAPER_DARK,
    SETKA_WALLPAPER_LIGHT,
} from "./setkaWallpaperStore";
import Modal from "../Modal";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import AccessibleButton from "../components/views/elements/AccessibleButton";

interface WallpaperDialogProps {
    roomId: string;
    onFinished: () => void;
}

const SetkaRoomWallpaperDialog: React.FC<WallpaperDialogProps> = ({ roomId, onFinished }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [style, setStyle] = useState(() => getSetkaRoomWallpaper(roomId) ?? SETKA_WALLPAPER_AUTO);
    const [error, setError] = useState<string | null>(null);

    const onSelect = useCallback(
        (next: string) => {
            if (next === SETKA_WALLPAPER_AUTO) {
                setSetkaRoomWallpaper(roomId, null);
            } else {
                setSetkaRoomWallpaper(roomId, next);
            }
            setStyle(next);
            onFinished();
        },
        [onFinished, roomId],
    );

    const onCustomSelected = useCallback(
        async (ev: React.ChangeEvent<HTMLInputElement>) => {
            const file = ev.target.files?.[0];
            ev.target.value = "";
            if (!file) return;
            try {
                const customStyle = await importSetkaWallpaperImage(file);
                setSetkaRoomWallpaper(roomId, customStyle);
                onFinished();
            } catch (e) {
                setError(
                    e instanceof SetkaWallpaperQuotaError ? _t("setka|wallpaper|quota_error") : _t("common|error"),
                );
            }
        },
        [onFinished, roomId],
    );

    const options = [
        { id: SETKA_WALLPAPER_AUTO, label: _t("setka|wallpaper|auto") },
        { id: SETKA_WALLPAPER_LIGHT, label: _t("setka|wallpaper|light") },
        { id: SETKA_WALLPAPER_DARK, label: _t("setka|wallpaper|dark") },
    ];

    return (
        <BaseDialog
            className="mx_SetkaWallpaperDialog"
            onFinished={onFinished}
            title={_t("setka|wallpaper|room_title")}
            contentId="mx_SetkaWallpaperDialog_content"
        >
            <div className="mx_Dialog_content" id="mx_SetkaWallpaperDialog_content">
                {error && <p className="mx_SetkaWallpaperSettings_error">{error}</p>}
                <div className="mx_SetkaWallpaperSettings_options">
                    {options.map((option) => (
                        <AccessibleButton
                            key={option.id}
                            className={
                                "mx_SetkaWallpaperSettings_option" +
                                (style === option.id ? " mx_SetkaWallpaperSettings_option_active" : "")
                            }
                            onClick={() => onSelect(option.id)}
                        >
                            {option.label}
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
        </BaseDialog>
    );
};

interface Props {
    roomId: string;
}

export const openSetkaRoomWallpaperDialog = (roomId: string): void => {
    Modal.createDialog(SetkaRoomWallpaperDialog, { roomId }, "mx_SetkaWallpaperDialog");
};

const SetkaWallpaperMenuItem: React.FC<Props> = ({ roomId }) => {
    const onSelect = useCallback(() => openSetkaRoomWallpaperDialog(roomId), [roomId]);

    return <MenuItem Icon={ImageIcon} label={_t("setka|wallpaper|room_title")} onSelect={onSelect} />;
};

export default SetkaWallpaperMenuItem;
