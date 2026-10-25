/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useContext, useEffect, useState } from "react";
import { UserProfileIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import BaseAvatar from "../components/views/avatars/BaseAvatar";
import MatrixClientContext from "../contexts/MatrixClientContext";
import dis from "../dispatcher/dispatcher";
import {
    SETKA_ABOUT_CARDS,
    SETKA_WEB_CLIENT_NAME,
    SETKA_WEB_CLIENT_VERSION,
    type SetkaAboutCard,
} from "./setkaAbout";

const SetkaAboutCardRow: React.FC<{ card: SetkaAboutCard }> = ({ card }) => {
    const client = useContext(MatrixClientContext);
    const title = _t(card.titleKey);
    const subtitle = card.subtitleKey ? _t(card.subtitleKey) : undefined;
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

    useEffect(() => {
        if (!card.matrixUserId || !client) return;
        let cancelled = false;
        client
            .getProfileInfo(card.matrixUserId)
            .then((profile) => {
                if (cancelled || !profile.avatar_url) return;
                setAvatarUrl(client.mxcUrlToHttp(profile.avatar_url, 80, 80, "crop") ?? undefined);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [card.matrixUserId, client]);

    const onOpen = useCallback(() => {
        if (card.url) {
            window.open(card.url, "_blank", "noopener,noreferrer");
            return;
        }
        if (card.matrixUserId) {
            dis.dispatch({
                action: "view_user_info",
                userId: card.matrixUserId,
            });
        }
    }, [card.matrixUserId, card.url]);

    return (
        <div className="mx_SetkaAboutSettings_card">
            <div className="mx_SetkaAboutSettings_cardIcon" aria-hidden>
                {card.kind === "matrix" && card.matrixUserId ? (
                    <BaseAvatar name={title} idName={card.matrixUserId} url={avatarUrl} size="40px" />
                ) : (
                    <span className="mx_SetkaAboutSettings_cardIcon_telegram">TG</span>
                )}
            </div>
            <div className="mx_SetkaAboutSettings_cardText">
                <span className="mx_SetkaAboutSettings_cardTitle">{title}</span>
                {subtitle && <span className="mx_SetkaAboutSettings_cardSubtitle">{subtitle}</span>}
                {card.matrixUserId && (
                    <span className="mx_SetkaAboutSettings_cardMeta">{card.matrixUserId}</span>
                )}
            </div>
            <AccessibleButton kind="primary_outline" onClick={onOpen}>
                {_t("setka|about|open")}
            </AccessibleButton>
        </div>
    );
};

const SetkaAboutSettings: React.FC = () => {
    return (
        <div className="mx_SetkaAboutSettings">
            <header className="mx_SetkaAboutSettings_header">
                <UserProfileIcon className="mx_SetkaAboutSettings_headerIcon" />
                <div>
                    <h2 className="mx_SetkaAboutSettings_appName">{SETKA_WEB_CLIENT_NAME}</h2>
                    <p className="mx_SetkaAboutSettings_version">
                        {_t("setka|about|version", { version: SETKA_WEB_CLIENT_VERSION })}
                    </p>
                </div>
            </header>

            <div className="mx_SetkaAboutSettings_cards">
                {SETKA_ABOUT_CARDS.map((card) => (
                    <SetkaAboutCardRow key={card.id} card={card} />
                ))}
            </div>
        </div>
    );
};

export default SetkaAboutSettings;
