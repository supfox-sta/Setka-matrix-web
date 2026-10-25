/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";
import PublicIcon from "@vector-im/compound-design-tokens/assets/web/icons/public";
import { ChatSolidIcon, ExploreIcon, GroupIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../languageHandler";
import SdkConfig from "../SdkConfig";
import AccessibleButton, { type ButtonEvent } from "../components/views/elements/AccessibleButton";
import dis from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import PosthogTrackers from "../PosthogTrackers";
import Modal from "../Modal";
import SetkaCreateChannelDialog from "../setka/SetkaCreateChannelDialog";

const onClickSendDm = (ev: ButtonEvent): void => {
    PosthogTrackers.trackInteraction("WebHomeCreateChatButton", ev);
    dis.dispatch({ action: Action.CreateChat });
};

const onClickExplore = (ev: ButtonEvent): void => {
    PosthogTrackers.trackInteraction("WebHomeExploreRoomsButton", ev);
    dis.fire(Action.ViewRoomDirectory);
};

const onClickNewRoom = (ev: ButtonEvent): void => {
    PosthogTrackers.trackInteraction("WebHomeCreateRoomButton", ev);
    dis.dispatch({ action: Action.CreateRoom });
};

const onClickCreateChannel = (ev: ButtonEvent): void => {
    PosthogTrackers.trackInteraction("WebHomeCreateChannelButton", ev);
    Modal.createDialog(SetkaCreateChannelDialog, {});
};

const SetkaHomeLanding: React.FC = () => {
    const branding = SdkConfig.getObject("branding");
    const logoUrl = branding?.get("auth_header_logo_url") ?? "themes/setka/img/setka-logo.svg";
    const brand = SdkConfig.get().brand;

    return (
        <div className="mx_HomePage_default_wrapper mx_SetkaHomeLanding">
            <div className="mx_SetkaHomeLanding_glow" aria-hidden />
            <div className="mx_SetkaHomeLanding_card">
                <img className="mx_SetkaHomeLanding_logo" src={logoUrl} alt={brand} />
                <div className="mx_SetkaHomeLanding_badge">{_t("setka|welcome|title")}</div>
                <h1 className="mx_SetkaHomeLanding_title">{_t("setka|welcome|tagline")}</h1>
                <p className="mx_SetkaHomeLanding_subtitle">{_t("setka|home|subtitle")}</p>
                <div className="mx_SetkaHomeLanding_buttons">
                    <AccessibleButton onClick={onClickSendDm} className="mx_SetkaHomeLanding_button">
                        <ChatSolidIcon width={24} height={24} />
                        <span>{_t("onboarding|send_dm")}</span>
                    </AccessibleButton>
                    <AccessibleButton onClick={onClickExplore} className="mx_SetkaHomeLanding_button">
                        <ExploreIcon width={24} height={24} />
                        <span>{_t("onboarding|explore_rooms")}</span>
                    </AccessibleButton>
                    <AccessibleButton onClick={onClickNewRoom} className="mx_SetkaHomeLanding_button">
                        <GroupIcon width={24} height={24} />
                        <span>{_t("onboarding|create_room")}</span>
                    </AccessibleButton>
                    <AccessibleButton onClick={onClickCreateChannel} className="mx_SetkaHomeLanding_button">
                        <PublicIcon width={24} height={24} />
                        <span>{_t("setka|channel|create_button")}</span>
                    </AccessibleButton>
                </div>
            </div>
        </div>
    );
};

export default SetkaHomeLanding;
