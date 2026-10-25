/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useState } from "react";

import { _t, getCurrentLanguage } from "../../../../../languageHandler";
import SettingsStore from "../../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import PlatformPeg from "../../../../../PlatformPeg";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { SettingsSubsection } from "../../shared/SettingsSubsection";
import LanguageDropdown from "../../../elements/LanguageDropdown";

/** "Язык": only the language. Look & wallpaper live in the "Оформление" tab. */
const SetkaPreferencesUserSettingsTab: React.FC = () => {
    const [language, setLanguage] = useState(getCurrentLanguage());

    const onLanguageChange = useCallback(
        (newLanguage: string) => {
            if (language === newLanguage) return;
            SettingsStore.setValue("language", null, SettingLevel.DEVICE, newLanguage);
            setLanguage(newLanguage);
            PlatformPeg.get()?.setLanguage([newLanguage]);
            PlatformPeg.get()?.reload();
        },
        [language],
    );

    return (
        <SettingsTab data-testid="mx_SetkaPreferencesUserSettingsTab">
            <SettingsSection>
                <SettingsSubsection heading={_t("settings|general|language_section")} formWrap>
                    <div className="mx_SettingsSubsection_dropdown">
                        {_t("settings|general|application_language")}
                        <LanguageDropdown onOptionChange={onLanguageChange} value={language} />
                        <div className="mx_PreferencesUserSettingsTab_section_hint">
                            {_t("settings|general|application_language_reload_hint")}
                        </div>
                    </div>
                </SettingsSubsection>
            </SettingsSection>
        </SettingsTab>
    );
};

export default SetkaPreferencesUserSettingsTab;
