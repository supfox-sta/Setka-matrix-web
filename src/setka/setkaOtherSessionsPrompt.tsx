/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import Modal from "../Modal";
import QuestionDialog from "../components/views/dialogs/QuestionDialog";
import dis from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import { UserTab } from "../components/views/dialogs/UserTab";

const REMIND_KEY = "setka_other_sessions_remind_at";
const REMIND_EVERY_MS = 24 * 60 * 60 * 1000;
let asked = false;

/**
 * After startup, reminds the user about other still-open sessions (devices)
 * and offers to close them all or keep them. Asked at most once per day.
 */
export async function promptSetkaOtherSessions(client: MatrixClient): Promise<void> {
    if (asked) return;
    asked = true;
    try {
        const next = Number(window.localStorage.getItem(REMIND_KEY) || 0);
        if (Date.now() < next) return;
    } catch {
        /* storage unavailable */
    }

    let others: { device_id: string }[] = [];
    try {
        const { devices } = await client.getDevices();
        const mine = client.getDeviceId();
        others = devices.filter((d) => d.device_id !== mine);
    } catch {
        return;
    }
    if (!others.length) return;

    try {
        window.localStorage.setItem(REMIND_KEY, String(Date.now() + REMIND_EVERY_MS));
    } catch {
        /* ignore */
    }

    const { finished } = Modal.createDialog(QuestionDialog, {
        title: "Незавершённые сеансы",
        description: (
            <div>
                Ваш аккаунт ещё открыт на других устройствах: {others.length}. Завершить все эти сеансы или оставить
                как есть?
            </div>
        ),
        button: "Завершить все",
        cancelButton: "Оставить",
    });
    const [confirmed] = await finished;
    if (!confirmed) return;

    try {
        await client.deleteMultipleDevices(others.map((d) => d.device_id));
    } catch {
        // Server requires re-authentication: let the user finish it in the sessions manager.
        dis.dispatch({ action: Action.ViewUserSettings, initialTabId: UserTab.SessionManager });
    }
}
