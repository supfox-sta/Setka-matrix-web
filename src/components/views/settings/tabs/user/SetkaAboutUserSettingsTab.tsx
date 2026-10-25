/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";

import { _t } from "../../../../../languageHandler";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import SetkaAboutSettings from "../../../../../setka/SetkaAboutSettings";

const SetkaAboutUserSettingsTab: React.FC = () => {
    return (
        <SettingsTab data-testid="mx_SetkaAboutUserSettingsTab">
            <SettingsSection heading={_t("setka|about|settings_title")}>
                <SetkaAboutSettings />
            </SettingsSection>
        </SettingsTab>
    );
};

export default SetkaAboutUserSettingsTab;
