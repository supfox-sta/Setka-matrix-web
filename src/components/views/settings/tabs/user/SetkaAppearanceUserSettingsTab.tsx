/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";

import { _t } from "../../../../../languageHandler";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { SettingsSubsection } from "../../shared/SettingsSubsection";
import SetkaWallpaperSettings from "../../../../../setka/SetkaWallpaperSettings";
import SetkaAppearanceSettings from "../../../../../setka/SetkaAppearanceSettings";
import AppearanceUserSettingsTab from "./AppearanceUserSettingsTab";

/** One "Оформление" screen: Setka look (glass, blur, accent), wallpaper, then the generic layout/font options. */
const SetkaAppearanceUserSettingsTab: React.FC = () => (
    <SettingsTab data-testid="mx_SetkaAppearanceUserSettingsTab">
        <SettingsSection>
            <SettingsSubsection heading={_t("setka|appearance|settings_title")}>
                <SetkaAppearanceSettings />
            </SettingsSubsection>
        </SettingsSection>
        <SettingsSection>
            <SettingsSubsection heading={_t("setka|wallpaper|settings_title")}>
                <SetkaWallpaperSettings />
            </SettingsSubsection>
        </SettingsSection>
        <div className="mx_SetkaAppearanceTab_more">
            <AppearanceUserSettingsTab />
        </div>
    </SettingsTab>
);

export default SetkaAppearanceUserSettingsTab;
