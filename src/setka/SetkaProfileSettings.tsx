/*

Copyright 2026 Setka Matrix



SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ErrorMessage } from "@vector-im/compound-web";

import { Flex } from "@element-hq/web-shared-components";

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { logger } from "matrix-js-sdk/src/logger";



import { _t } from "../languageHandler";

import AccessibleButton from "../components/views/elements/AccessibleButton";

import Field from "../components/views/elements/Field";

import InlineSpinner from "../components/views/elements/InlineSpinner";

import { SettingsSection } from "../components/views/settings/shared/SettingsSection";

import { fetchSetkaProfile, saveSetkaProfile, type SetkaProfile } from "./SetkaProfileApi";

import { OwnProfileStore } from "../stores/OwnProfileStore";



const COLOR_PRESETS = ["#7B61FF", "#5A8CFF", "#0F9D8A", "#F26B5B", "#F3B53F", "#F08AC3", "#5B6475", "#111827"];



interface Props {

    client: MatrixClient;

}



const SetkaProfileSettings: React.FC<Props> = ({ client }) => {

    const userId = client.getUserId()!;

    const displayName = OwnProfileStore.instance.displayName ?? userId;

    const [profile, setProfile] = useState<SetkaProfile>({});

    const [bio, setBio] = useState("");

    const [color, setColor] = useState("");

    const [statusEmojiMxc, setStatusEmojiMxc] = useState("");

    const [badgeEmojiMxc, setBadgeEmojiMxc] = useState("");

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [saveError, setSaveError] = useState(false);

    const [saved, setSaved] = useState(false);



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

                setStatusEmojiMxc(data.status_emoji_mxc ?? "");

                setBadgeEmojiMxc(data.badge_emoji_mxc ?? "");

            } catch (e) {

                logger.warn("Failed to load Setka profile", e);

                if (!cancelled) {

                    setColor(COLOR_PRESETS[0]);

                }

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

            statusEmojiMxc !== (profile.status_emoji_mxc ?? "") ||

            badgeEmojiMxc !== (profile.badge_emoji_mxc ?? "")

        );

    }, [bio, badgeEmojiMxc, color, profile, statusEmojiMxc]);



    const onSave = useCallback(async () => {

        setSaving(true);

        setSaveError(false);

        setSaved(false);

        try {

            const updated = await saveSetkaProfile(client, userId, {

                bio,

                color: color || null,

                status_emoji_mxc: statusEmojiMxc || null,

                badge_emoji_mxc: badgeEmojiMxc || null,

            });

            setProfile(updated);

            setBio(updated.bio ?? "");

            setColor(updated.color ?? color);

            setStatusEmojiMxc(updated.status_emoji_mxc ?? "");

            setBadgeEmojiMxc(updated.badge_emoji_mxc ?? "");

            setSaved(true);

        } catch (e) {

            logger.warn("Failed to save Setka profile", e);

            setSaveError(true);

        } finally {

            setSaving(false);

        }

    }, [badgeEmojiMxc, bio, client, color, statusEmojiMxc, userId]);



    const accent = color || COLOR_PRESETS[0];

    const statusPreviewUrl = statusEmojiMxc ? client.mxcUrlToHttp(statusEmojiMxc, 48, 48, "crop") : null;

    const badgePreviewUrl = badgeEmojiMxc ? client.mxcUrlToHttp(badgeEmojiMxc, 48, 48, "crop") : null;



    return (

        <SettingsSection heading={_t("setka|profile|title")}>

            <div className="mx_SetkaProfileSettings">

                <div className="mx_SetkaProfileSettings_card">

                    <div className="mx_SetkaProfileSettings_preview" style={{ backgroundColor: accent }}>

                        <div className="mx_SetkaProfileSettings_previewBody">

                            <div className="mx_SetkaProfileSettings_previewName">{displayName}</div>

                            <div className="mx_SetkaProfileSettings_previewBio">

                                {bio || _t("setka|profile|bio_placeholder")}

                            </div>

                            <div className="mx_SetkaProfileSettings_previewEmojis">

                                {statusPreviewUrl && (

                                    <img src={statusPreviewUrl} alt="" className="mx_SetkaProfileSettings_emojiPreview" />

                                )}

                                {badgePreviewUrl && (

                                    <img src={badgePreviewUrl} alt="" className="mx_SetkaProfileSettings_emojiPreview" />

                                )}

                            </div>

                        </div>

                    </div>



                    {loading ? (

                        <Flex align="center" gap="var(--cpd-space-2x)" className="mx_SetkaProfileSettings_loading">

                            <InlineSpinner />

                            {_t("common|loading")}

                        </Flex>

                    ) : (

                        <div className="mx_SetkaProfileSettings_form">

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



                            <div className="mx_SetkaProfileSettings_colorBlock">

                                <div className="mx_SetkaProfileSettings_label">{_t("setka|profile|color_label")}</div>

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

                                </div>

                            </div>



                            <div className="mx_SetkaProfileSettings_emojiRow">

                                <Field

                                    label={_t("setka|profile|status_emoji_label")}

                                    value={statusEmojiMxc}

                                    onChange={(ev: ChangeEvent<HTMLInputElement>) => {

                                        setStatusEmojiMxc(ev.target.value);

                                        setSaved(false);

                                    }}

                                    autoComplete="off"

                                />

                                <Field

                                    label={_t("setka|profile|badge_emoji_label")}

                                    value={badgeEmojiMxc}

                                    onChange={(ev: ChangeEvent<HTMLInputElement>) => {

                                        setBadgeEmojiMxc(ev.target.value);

                                        setSaved(false);

                                    }}

                                    autoComplete="off"

                                />

                            </div>



                            <Flex gap="var(--cpd-space-3x)" className="mx_SetkaProfileSettings_actions">

                                <AccessibleButton kind="primary" disabled={!isDirty || saving} onClick={onSave}>

                                    {saving ? _t("common|updating") : _t("action|save")}

                                </AccessibleButton>

                                {saved && !isDirty && (

                                    <span className="mx_SetkaProfileSettings_saved">{_t("common|saved")}</span>

                                )}

                            </Flex>



                            {saveError && <ErrorMessage>{_t("setka|profile|save_error")}</ErrorMessage>}

                        </div>

                    )}

                </div>

            </div>

        </SettingsSection>

    );

};



export default SetkaProfileSettings;

