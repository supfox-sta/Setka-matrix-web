/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";

import { _t } from "../../../../../languageHandler";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import SetkaBotCreatorSettings from "../../../../../setka/SetkaBotCreatorSettings";

const SetkaBotCreatorUserSettingsTab: React.FC = () => {
    return (
        <SettingsTab data-testid="mx_SetkaBotCreatorUserSettingsTab">
            <SettingsSection heading={_t("setka|bot_creator|settings_title")}>
                <SetkaBotCreatorSettings />
            </SettingsSection>
        </SettingsTab>
    );
};

export default SetkaBotCreatorUserSettingsTab;
