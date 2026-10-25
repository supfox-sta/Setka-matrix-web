/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState } from "react";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import { setkaLeftPanelTabStore, SETKA_LEFT_PANEL_TAB_CHANGED } from "./setkaLeftPanelTabStore";

export type SetkaLeftPanelTab = "chats" | "contacts" | "feed";

const STORAGE_KEY = "setka.leftPanelTab";

interface Props {
    value: SetkaLeftPanelTab;
    onChange: (tab: SetkaLeftPanelTab) => void;
}

export function readSetkaLeftPanelTab(): SetkaLeftPanelTab {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "contacts") return "contacts";
    if (stored === "feed") return "feed";
    return "chats";
}

export function writeSetkaLeftPanelTab(tab: SetkaLeftPanelTab): void {
    localStorage.setItem(STORAGE_KEY, tab);
}

const SetkaLeftPanelTabs: React.FC<Props> = ({ value, onChange }) => {
    const onChats = useCallback(() => onChange("chats"), [onChange]);
    const onContacts = useCallback(() => onChange("contacts"), [onChange]);
    const onFeed = useCallback(() => onChange("feed"), [onChange]);

    const sliderClass =
        value === "contacts"
            ? " mx_SetkaLeftPanelTabs_slider_contacts"
            : value === "feed"
              ? " mx_SetkaLeftPanelTabs_slider_feed"
              : "";

    return (
        <div className="mx_SetkaLeftPanelTabs" role="tablist" aria-label={_t("setka|tabs|aria_label")}>
            <div className={"mx_SetkaLeftPanelTabs_slider" + sliderClass} aria-hidden />
            <div className="mx_SetkaLeftPanelTabs_row">
                <AccessibleButton
                role="tab"
                aria-selected={value === "chats"}
                className={"mx_SetkaLeftPanelTabs_tab" + (value === "chats" ? " mx_SetkaLeftPanelTabs_tab_active" : "")}
                onClick={onChats}
            >
                {_t("setka|tabs|chats")}
            </AccessibleButton>
            <AccessibleButton
                role="tab"
                aria-selected={value === "contacts"}
                className={
                    "mx_SetkaLeftPanelTabs_tab" + (value === "contacts" ? " mx_SetkaLeftPanelTabs_tab_active" : "")
                }
                onClick={onContacts}
            >
                {_t("setka|tabs|contacts")}
            </AccessibleButton>
            <AccessibleButton
                role="tab"
                aria-selected={value === "feed"}
                className={"mx_SetkaLeftPanelTabs_tab" + (value === "feed" ? " mx_SetkaLeftPanelTabs_tab_active" : "")}
                onClick={onFeed}
            >
                {_t("setka|tabs|feed")}
            </AccessibleButton>
            </div>
        </div>
    );
};

export function useSetkaLeftPanelTab(): [SetkaLeftPanelTab, (tab: SetkaLeftPanelTab) => void] {
    const [tab, setTab] = useState<SetkaLeftPanelTab>(() => readSetkaLeftPanelTab());

    useEffect(() => {
        const onExternalChange = (nextTab: SetkaLeftPanelTab): void => {
            setTab(nextTab);
        };
        setkaLeftPanelTabStore.on(SETKA_LEFT_PANEL_TAB_CHANGED, onExternalChange);
        return () => {
            setkaLeftPanelTabStore.off(SETKA_LEFT_PANEL_TAB_CHANGED, onExternalChange);
        };
    }, []);

    const setTabPersisted = useCallback((nextTab: SetkaLeftPanelTab) => {
        setkaLeftPanelTabStore.setTab(nextTab);
        setTab(nextTab);
    }, []);

    return [tab, setTabPersisted];
}

export default SetkaLeftPanelTabs;
