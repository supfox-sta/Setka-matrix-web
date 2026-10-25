/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, EditInPlace, ErrorMessage } from "@vector-im/compound-web";
import { Flex } from "@element-hq/web-shared-components";
import ImageIcon from "@vector-im/compound-design-tokens/assets/web/icons/image";
import UserProfileIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";
import FavouriteIcon from "@vector-im/compound-design-tokens/assets/web/icons/favourite";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import Field from "../components/views/elements/Field";
import AvatarSetting from "../components/views/settings/AvatarSetting";
import { fetchSetkaProfile, saveSetkaProfile, type SetkaProfile } from "./SetkaProfileApi";
import { getSetkaHeroTheme } from "./setkaColorUtils";
import CopyableText from "../components/views/elements/CopyableText";
import UserIdentifierCustomisations from "../customisations/UserIdentifier";
import SetkaEmojiPickerField from "./SetkaEmojiPickerField";
import { SetkaMxcBackground, SetkaMxcAvatar } from "./SetkaMxcMedia";
import { fetchSetkaPlusSubscription } from "./SetkaPlusApi";
import { isSetkaMxcVideo, markSetkaMxcAsVideo } from "./setkaMxcMediaUtils";

const COLOR_PRESETS = ["#7B61FF", "#5A8CFF", "#0F9D8A", "#F26B5B", "#F3B53F", "#F08AC3", "#5B6475", "#111827"];

interface Props {
    client: MatrixClient;
    canSetDisplayName: boolean;
    canSetAvatar: boolean;
    onAvatarChange: (file: File) => Promise<void>;
    onAvatarRemove?: () => Promise<void>;
    avatarUrl?: string;
    avatarError?: boolean;
    displayName: string;
    displayNameError?: boolean;
    onDisplayNameChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onDisplayNameCancel: () => void;
    onDisplayNameSave: () => Promise<void>;
    footer?: React.ReactNode;
}

const SetkaProfilePage: React.FC<Props> = ({
    client,
    canSetDisplayName,
    canSetAvatar,
    onAvatarChange,
    onAvatarRemove,
    avatarUrl,
    avatarError,
    displayName,
    displayNameError,
    onDisplayNameChange,
    onDisplayNameCancel,
    onDisplayNameSave,
    footer,
}) => {
    const userId = client.getUserId()!;
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<SetkaProfile>({});
    const [bio, setBio] = useState("");
    const [color, setColor] = useState(COLOR_PRESETS[0]);
    const [backgroundMxc, setBackgroundMxc] = useState("");
    const [backgroundIsVideo, setBackgroundIsVideo] = useState(false);
    const [statusEmojiMxc, setStatusEmojiMxc] = useState("");
    const [badgeEmojiMxc, setBadgeEmojiMxc] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [saved, setSaved] = useState(false);
    const [backgroundUploading, setBackgroundUploading] = useState(false);
    const [backgroundUploadError, setBackgroundUploadError] = useState(false);
    const [isPlusActive, setIsPlusActive] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void fetchSetkaPlusSubscription(client, userId)
            .then((sub) => {
                if (!cancelled) setIsPlusActive(Boolean(sub.is_active));
            })
            .catch(() => {
                if (!cancelled) setIsPlusActive(false);
            });
        return () => {
            cancelled = true;
        };
    }, [client, userId]);

    const avatarIsVideo = isSetkaMxcVideo(avatarUrl);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await fetchSetkaProfile(client, userId);
                if (cancelled) return;
                setProfile(data);
                setBio(data.bio ?? "");
                setColor(data.color ?? COLOR_PRESETS[0]);
                setBackgroundMxc(data.background_mxc ?? "");
                setBackgroundIsVideo(
                    Boolean(data.background_is_video) || isSetkaMxcVideo(data.background_mxc),
                );
                setStatusEmojiMxc(data.status_emoji_mxc ?? "");
                setBadgeEmojiMxc(data.badge_emoji_mxc ?? "");
            } catch (e) {
                logger.warn("Failed to load Setka profile", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client, userId]);

    const isDirty = useMemo(() => {
        return (
            bio !== (profile.bio ?? "") ||
            color !== (profile.color ?? "") ||
            backgroundMxc !== (profile.background_mxc ?? "") ||
            backgroundIsVideo !== Boolean(profile.background_is_video) ||
            statusEmojiMxc !== (profile.status_emoji_mxc ?? "") ||
            badgeEmojiMxc !== (profile.badge_emoji_mxc ?? "")
        );
    }, [backgroundIsVideo, backgroundMxc, badgeEmojiMxc, bio, color, profile, statusEmojiMxc]);

    const onSaveSetka = useCallback(async () => {
        setSaving(true);
        setSaveError(false);
        setSaved(false);
        try {
            const updated = await saveSetkaProfile(client, userId, {
                bio,
                color: color || null,
                background_mxc: backgroundMxc || null,
                background_is_video: backgroundMxc ? backgroundIsVideo : null,
                status_emoji_mxc: statusEmojiMxc || null,
                badge_emoji_mxc: badgeEmojiMxc || null,
            });
            setProfile(updated);
            setSaved(true);
        } catch (e) {
            logger.warn("Failed to save Setka profile", e);
            setSaveError(true);
        } finally {
            setSaving(false);
        }
    }, [backgroundIsVideo, badgeEmojiMxc, bio, backgroundMxc, client, color, statusEmojiMxc, userId]);

    const onBackgroundSelected = useCallback(
        async (ev: ChangeEvent<HTMLInputElement>) => {
            const file = ev.target.files?.[0];
            ev.target.value = "";
            if (!file) return;
            setBackgroundUploading(true);
            setBackgroundUploadError(false);
            try {
                const isVideo = file.type.startsWith("video/");
                const { content_uri: uri } = await client.uploadContent(file);
                if (isVideo) {
                    markSetkaMxcAsVideo(uri);
                }
                setBackgroundMxc(uri);
                setBackgroundIsVideo(isVideo);
                setSaved(false);
                const updated = await saveSetkaProfile(client, userId, {
                    background_mxc: uri,
                    background_is_video: isVideo,
                });
                setProfile(updated);
                setBackgroundMxc(updated.background_mxc ?? uri);
                setBackgroundIsVideo(Boolean(updated.background_is_video) || isVideo);
                setSaved(true);
            } catch (e) {
                logger.warn("Failed to upload profile background", e);
                setBackgroundUploadError(true);
            } finally {
                setBackgroundUploading(false);
            }
        },
        [client, userId],
    );

    const onAvatarFileSelected = useCallback(
        async (ev: ChangeEvent<HTMLInputElement>) => {
            const file = ev.target.files?.[0];
            ev.target.value = "";
            if (!file) return;
            await onAvatarChange(file);
        },
        [onAvatarChange],
    );

    const accent = color || COLOR_PRESETS[0];
    const heroTheme = getSetkaHeroTheme(accent, Boolean(backgroundMxc));
    const userIdentifier = UserIdentifierCustomisations.getDisplayUserIdentifier(userId, { withDisplayName: false });

    return (
        <div className="mx_SetkaProfilePage">
            <p className="mx_SetkaProfilePage_subtitle mx_SetkaProfilePage_subtitle_aboveHero">
                {_t("setka|profile|subtitle")}
            </p>
            <div
                className={
                    "mx_SetkaProfilePage_hero mx_SetkaProfilePage_hero_theme" +
                    (heroTheme === "dark" ? "Dark" : "Light") +
                    (loading || backgroundUploading ? " mx_SetkaProfilePage_hero_loading" : "")
                }
                style={{ backgroundColor: accent }}
            >
                {backgroundUploading && (
                    <div className="mx_SetkaProfilePage_heroUploading" aria-live="polite">
                        {_t("setka|profile|background_uploading")}
                    </div>
                )}
                {backgroundMxc && (
                    <SetkaMxcBackground
                        client={client}
                        mxc={backgroundMxc}
                        className="mx_SetkaProfilePage_heroBg"
                        forceVideo={backgroundIsVideo}
                    />
                )}
                <div className="mx_SetkaProfilePage_heroOverlay" />
                <div className="mx_SetkaProfilePage_heroActions">
                    <AccessibleButton
                        kind="secondary"
                        onClick={() => backgroundInputRef.current?.click()}
                        disabled={backgroundUploading}
                    >
                        <ImageIcon width={16} height={16} />
                        {backgroundUploading
                            ? _t("setka|profile|background_uploading")
                            : _t("setka|profile|background_change")}
                    </AccessibleButton>
                    {backgroundMxc && (
                        <AccessibleButton
                            kind="secondary"
                            onClick={() => {
                                setBackgroundMxc("");
                                setBackgroundIsVideo(false);
                                setSaved(false);
                            }}
                        >
                            {_t("action|remove")}
                        </AccessibleButton>
                    )}
                </div>
                <input
                    ref={backgroundInputRef}
                    type="file"
                    accept={isPlusActive ? "image/*,video/*" : "image/*"}
                    className="mx_SetkaProfilePage_hiddenInput"
                    onChange={onBackgroundSelected}
                />
                <div className="mx_SetkaProfilePage_heroContent">
                    {loading ? (
                        <div className="mx_SetkaProfilePage_skeletonHero" aria-hidden>
                            <div className="mx_SetkaProfilePage_skeletonLine mx_SetkaProfilePage_skeletonLine_short" />
                            <div className="mx_SetkaProfilePage_skeletonAvatar" />
                            <div className="mx_SetkaProfilePage_skeletonLine mx_SetkaProfilePage_skeletonLine_long" />
                        </div>
                    ) : (
                        <>
                            {avatarIsVideo && avatarUrl ? (
                                <div className="mx_SetkaMxcAvatarWrap mx_SetkaMxcAvatarWrap_editable">
                                    <SetkaMxcAvatar
                                        client={client}
                                        mxc={avatarUrl}
                                        className="mx_SetkaMxcAvatarWrap_video"
                                        size={120}
                                        forceVideo
                                    />
                                    {canSetAvatar && (
                                        <AccessibleButton
                                            kind="icon"
                                            className="mx_SetkaMxcAvatarWrap_editBtn"
                                            title={_t("action|set_avatar")}
                                            onClick={() => avatarInputRef.current?.click()}
                                        >
                                            <ImageIcon width={16} height={16} />
                                        </AccessibleButton>
                                    )}
                                </div>
                            ) : (
                                <AvatarSetting
                                    avatar={avatarUrl}
                                    avatarAccessibleName={_t("common|user_avatar")}
                                    onChange={onAvatarChange}
                                    removeAvatar={onAvatarRemove}
                                    placeholderName={displayName}
                                    placeholderId={userId}
                                    disabled={!canSetAvatar}
                                    accept={isPlusActive ? "image/*,video/*" : "image/*"}
                                    allowVideo={isPlusActive}
                                />
                            )}
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept={isPlusActive ? "image/*,video/*" : "image/*"}
                                className="mx_SetkaProfilePage_hiddenInput"
                                onChange={onAvatarFileSelected}
                            />
                            <EditInPlace
                                className="mx_SetkaProfilePage_displayName"
                                label={_t("settings|general|display_name")}
                                value={displayName}
                                saveButtonLabel={_t("common|save")}
                                cancelButtonLabel={_t("common|cancel")}
                                savedLabel={_t("common|saved")}
                                savingLabel={_t("common|updating")}
                                onChange={onDisplayNameChange}
                                onCancel={onDisplayNameCancel}
                                onSave={onDisplayNameSave}
                                disabled={!canSetDisplayName}
                            >
                                {displayNameError && (
                                    <ErrorMessage>{_t("settings|general|display_name_error")}</ErrorMessage>
                                )}
                            </EditInPlace>
                        </>
                    )}
                </div>
            </div>

            {avatarError && (
                <Alert type="critical" title={_t("settings|general|avatar_upload_error_title")} />
            )}
            {backgroundUploadError && (
                <Alert type="critical" title={_t("setka|profile|save_error")} />
            )}

            <div className="mx_SetkaProfilePage_body">
                <div className="mx_SetkaProfilePage_card">
                    <div className="mx_SetkaProfilePage_cardTitle">
                        <UserProfileIcon width={18} height={18} />
                        {_t("setka|profile|info_title")}
                    </div>
                    {userIdentifier && (
                        <div className="mx_SetkaProfilePage_infoRow">
                            <span>{_t("settings|general|username")}</span>
                            <CopyableText getTextToCopy={() => userIdentifier}>{userIdentifier}</CopyableText>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="mx_SetkaProfilePage_card mx_SetkaProfilePage_card_skeleton" aria-hidden>
                        <div className="mx_SetkaProfilePage_skeletonLine" />
                        <div className="mx_SetkaProfilePage_skeletonLine mx_SetkaProfilePage_skeletonLine_long" />
                        <div className="mx_SetkaProfilePage_skeletonLine" />
                    </div>
                ) : (
                    <div className="mx_SetkaProfilePage_card">
                        <div className="mx_SetkaProfilePage_cardTitle">
                            <FavouriteIcon width={18} height={18} />
                            {_t("setka|profile|customization_title")}
                        </div>
                        <div className="mx_SetkaProfilePage_group">
                            <div className="mx_SetkaProfilePage_groupTitle">О себе</div>
                            <div className="mx_SetkaProfilePage_groupHint">Короткое описание — его видят другие в вашем профиле.</div>
                        <Field
                            label={_t("setka|profile|bio_label")}
                            value={bio}
                            onChange={(ev: ChangeEvent<HTMLTextAreaElement>) => {
                                setBio(ev.target.value);
                                setSaved(false);
                            }}
                            element="textarea"
                            autoComplete="off"
                        />
                        </div>
                        <div className="mx_SetkaProfilePage_group mx_SetkaProfileSettings_colorBlock">
                            <div className="mx_SetkaProfilePage_groupTitle">{_t("setka|profile|color_label")}</div>
                            <div className="mx_SetkaProfilePage_groupHint">Цвет шапки профиля и акцентов вокруг вас.</div>
                            <div className="mx_SetkaProfileSettings_colorPresets">
                                {COLOR_PRESETS.map((preset) => (
                                    <AccessibleButton
                                        key={preset}
                                        className={
                                            "mx_SetkaProfileSettings_colorSwatch" +
                                            (color.toLowerCase() === preset.toLowerCase()
                                                ? " mx_SetkaProfileSettings_colorSwatch_selected"
                                                : "")
                                        }
                                        style={{ backgroundColor: preset }}
                                        onClick={() => {
                                            setColor(preset);
                                            setSaved(false);
                                        }}
                                        aria-label={preset}
                                    />
                                ))}
                                <label className="mx_SetkaProfilePage_customColor" title="Свой цвет">
                                    <input
                                        type="color"
                                        value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#7b61ff"}
                                        onChange={(ev) => {
                                            setColor(ev.target.value);
                                            setSaved(false);
                                        }}
                                    />
                                    <span>Свой</span>
                                </label>
                            </div>
                        </div>
                        <div className="mx_SetkaProfilePage_group">
                            <div className="mx_SetkaProfilePage_groupTitle">Статус и значок</div>
                            <div className="mx_SetkaProfilePage_groupHint">Эмодзи рядом с именем: статус и значок профиля.</div>
                        <div className="mx_SetkaProfilePage_emojiRow">
                            <SetkaEmojiPickerField
                                client={client}
                                label={_t("setka|profile|status_emoji_label")}
                                value={statusEmojiMxc}
                                onChange={(mxc) => {
                                    setStatusEmojiMxc(mxc);
                                    setSaved(false);
                                }}
                            />
                            <SetkaEmojiPickerField
                                client={client}
                                label={_t("setka|profile|badge_emoji_label")}
                                value={badgeEmojiMxc}
                                onChange={(mxc) => {
                                    setBadgeEmojiMxc(mxc);
                                    setSaved(false);
                                }}
                            />
                        </div>
                        </div>
                        <Flex gap="var(--cpd-space-3x)" className="mx_SetkaProfileSettings_actions mx_SetkaProfilePage_saveBar">
                            <AccessibleButton kind="primary" disabled={!isDirty || saving} onClick={onSaveSetka}>
                                {saving ? _t("common|updating") : _t("action|save")}
                            </AccessibleButton>
                            {saved && !isDirty && (
                                <span className="mx_SetkaProfileSettings_saved">{_t("common|saved")}</span>
                            )}
                        </Flex>
                        {saveError && <ErrorMessage>{_t("setka|profile|save_error")}</ErrorMessage>}
                    </div>
                )}

                {footer && (
                    <div className="mx_SetkaProfilePage_card">
                        <div className="mx_SetkaProfilePage_cardTitle">Аккаунт</div>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SetkaProfilePage;
