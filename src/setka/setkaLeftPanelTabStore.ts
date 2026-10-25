/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { EventEmitter } from "events";

import { type SetkaLeftPanelTab, readSetkaLeftPanelTab, writeSetkaLeftPanelTab } from "./SetkaLeftPanelTabs";

export const SETKA_LEFT_PANEL_TAB_CHANGED = "changed";

class SetkaLeftPanelTabStore extends EventEmitter {
    public getTab(): SetkaLeftPanelTab {
        return readSetkaLeftPanelTab();
    }

    public setTab(tab: SetkaLeftPanelTab): void {
        writeSetkaLeftPanelTab(tab);
        this.emit(SETKA_LEFT_PANEL_TAB_CHANGED, tab);
    }
}

export const setkaLeftPanelTabStore = new SetkaLeftPanelTabStore();
