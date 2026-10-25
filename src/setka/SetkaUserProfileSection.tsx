/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../languageHandler";
import CopyableText from "../components/views/elements/CopyableText";
import BaseAvatar from "../components/views/avatars/BaseAvatar";
import { mediaFromMxc } from "../customisations/Media";
import { fetchSetkaProfile, type SetkaProfile } from "./SetkaProfileApi";
import { getSetkaHeroTheme } from "./setkaColorUtils";
import UserIdentifierCustomisations from "../customisations/UserIdentifier";
import { SetkaMxcBackground, SetkaMxcAvatar } from "./SetkaMxcMedia";
import { isSetkaMxcVideo } from "./setkaMxcMediaUtils";

interface Props {
    client: MatrixClient;
    userId: string;
    displayName: string;
    avatarMxcUrl?: string | null;
}

const SetkaUserProfileSection: React.FC<Props> = ({ client, userId, displayName, avatarMxcUrl }) => {
    const [profile, setProfile] = useState<SetkaProfile>({});
    const [loading, setLoading] = useState(true);
    const avatarIsVideo = isSetkaMxcVideo(avatarMxcUrl);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await fetchSetkaProfile(client, userId);
                if (!cancelled) setProfile(data);
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

    const accent = profile.color ?? "#7B61FF";
    const heroTheme = getSetkaHeroTheme(accent, Boolean(profile.background_mxc));
    const avatarUrl = !avatarIsVideo && avatarMxcUrl ? client.mxcUrlToHttp(avatarMxcUrl, 120, 120, "crop") : undefined;
    const statusUrl = profile.status_emoji_mxc
        ? mediaFromMxc(profile.status_emoji_mxc).getSquareThumbnailHttp(24)
        : undefined;
    const badgeUrl = profile.badge_emoji_mxc
        ? mediaFromMxc(profile.badge_emoji_mxc).getSquareThumbnailHttp(24)
        : undefined;
    const userIdentifier = UserIdentifierCustomisations.getDisplayUserIdentifier(userId, {
        withDisplayName: false,
    });

    return (
        <header className="mx_SetkaDmProfileSection mx_SetkaUserProfileSection">
            <div
                className={
                    "mx_SetkaDmProfileSection_hero mx_SetkaProfilePage_hero_theme" +
                    (heroTheme === "dark" ? "Dark" : "Light") +
                    (loading ? " mx_SetkaProfilePage_hero_loading" : "")
                }
                style={{ backgroundColor: accent }}
            >
                {profile.background_mxc && (
                    <SetkaMxcBackground
                        client={client}
                        mxc={profile.background_mxc}
                        className="mx_SetkaProfilePage_heroBg"
                        forceVideo={Boolean(profile.background_is_video) || isSetkaMxcVideo(profile.background_mxc)}
                    />
                )}
                <div className="mx_SetkaProfilePage_heroOverlay" />
                <div className="mx_SetkaDmProfileSection_heroContent">
                    <div className="mx_SetkaMxcAvatarWrap">
                        {avatarIsVideo && avatarMxcUrl ? (
                            <SetkaMxcAvatar
                                client={client}
                                mxc={avatarMxcUrl}
                                className="mx_SetkaMxcAvatarWrap_video"
                                size={96}
                                forceVideo
                            />
                        ) : (
                            <BaseAvatar url={avatarUrl} name={displayName} idName={userId} size="96px" type="round" />
                        )}
                    </div>
                    <div className="mx_SetkaDmProfileSection_heroText">
                        <div className="mx_SetkaDmProfileSection_nameRow">
                            <h1 className="mx_SetkaDmProfileSection_name">{displayName}</h1>
                            {badgeUrl && <img className="mx_SetkaDmProfileSection_badge" src={badgeUrl} alt="" />}
                        </div>
                        {statusUrl && <img className="mx_SetkaDmProfileSection_status" src={statusUrl} alt="" />}
                        {profile.bio && <p className="mx_SetkaDmProfileSection_bio">{profile.bio}</p>}
                    </div>
                </div>
            </div>
            <div className="mx_SetkaDmProfileSection_info">
                <div className="mx_SetkaDmProfileSection_infoRow">
                    <span className="mx_SetkaDmProfileSection_infoLabel">{_t("settings|general|username")}</span>
                    <CopyableText getTextToCopy={() => userIdentifier}>{userIdentifier}</CopyableText>
                </div>
            </div>
        </header>
    );
};

export default SetkaUserProfileSection;
