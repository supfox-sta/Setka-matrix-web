/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type JSX } from "react";
import { Avatar, Menu, MenuItem, Separator, Text } from "@vector-im/compound-web";
import UserProfileIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";
import FavouriteIcon from "@vector-im/compound-design-tokens/assets/web/icons/favourite";
import SettingsIcon from "@vector-im/compound-design-tokens/assets/web/icons/settings";
import SignOutIcon from "@vector-im/compound-design-tokens/assets/web/icons/sign-out";
import LinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";
import classNames from "classnames";

import { _t } from "../languageHandler";
import { useViewModel, type ViewModel } from "@element-hq/web-shared-components";
import { type SetkaUserMenuSnapshot, type SetkaUserMenuViewModel } from "./SetkaUserMenuViewModel";

type Props = {
    vm: ViewModel<SetkaUserMenuSnapshot, SetkaUserMenuViewModel>;
    className?: string;
};

export function SetkaUserMenu({ vm, className }: Props): JSX.Element {
    const { userId, displayName, avatarUrl, expanded, open } = useViewModel(vm);

    const trigger = (
        <button className="mx_SetkaUserMenu_trigger" aria-label={_t("menus|user_menu|title")} type="button">
            <Avatar id={userId} name={displayName} type="round" size="36px" src={avatarUrl} />
        </button>
    );

    return (
        <div className={classNames("mx_SetkaUserMenu", className)}>
            <Menu
                open={open}
                showTitle={false}
                title={_t("menus|user_menu|title")}
                trigger={trigger}
                onOpenChange={vm.setOpen}
                align="start"
                side="right"
                className="mx_SetkaUserMenu_container"
            >
                <section className="mx_SetkaUserMenu_profile">
                    <Avatar id={userId} name={displayName} type="round" size="64px" src={avatarUrl} />
                    <Text className="mx_SetkaUserMenu_displayName" type="body" size="lg" weight="semibold" as="span">
                        {displayName}
                    </Text>
                    <Text className="mx_SetkaUserMenu_userId" size="md" as="span" type="body">
                        {userId}
                    </Text>
                </section>
                <Separator />
                <section className="mx_SetkaUserMenu_actions">
                    <MenuItem
                        Icon={UserProfileIcon}
                        label={_t("setka|menu|my_profile")}
                        onSelect={vm.openMyProfile}
                    />
                    <MenuItem Icon={FavouriteIcon} label={_t("setka|plus|title")} onSelect={vm.openSetkaPlus} />
                    <MenuItem Icon={LinkIcon} label={_t("setka|menu|invite")} onSelect={() => void vm.copyInviteLink()} />
                    <span className="mx_SetkaUserMenu_subHeader">{_t("setka|menu|download")}</span>
                    <MenuItem
                        className="mx_SetkaUserMenu_subItem"
                        label={_t("setka|menu|download_android")}
                        onSelect={vm.openAndroidDownload}
                    />
                    <MenuItem Icon={SettingsIcon} label={_t("setka|menu|settings")} onSelect={vm.openSettings} />
                    <MenuItem
                        Icon={SignOutIcon}
                        label={_t("setka|menu|logout")}
                        onSelect={() => void vm.logout()}
                        className="mx_SetkaUserMenu_logoutItem"
                    />
                </section>
            </Menu>
            {expanded && (
                <Text type="heading" size="sm" as="span" weight="semibold" className="mx_SetkaUserMenu_sideName">
                    {displayName}
                </Text>
            )}
        </div>
    );
}

export default SetkaUserMenu;
