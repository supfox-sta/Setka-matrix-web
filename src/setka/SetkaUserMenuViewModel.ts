/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { BaseViewModel } from "@element-hq/web-shared-components";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { type OwnProfileStore } from "../stores/OwnProfileStore";
import { UPDATE_EVENT } from "../stores/AsyncStore";
import type { MatrixDispatcher } from "../dispatcher/dispatcher";
import Modal from "../Modal";
import { Action } from "../dispatcher/actions";
import { UserTab } from "../components/views/dialogs/UserTab";
import LogoutDialog, { shouldShowLogoutDialog } from "../components/views/dialogs/LogoutDialog";
import SetkaPlusDialog from "./SetkaPlusDialog";
import SetkaAndroidDownloadDialog from "./SetkaAndroidDownloadDialog";
import { makeSetkaShareLink } from "./setkaShareLink";

const AVATAR_PX = 88;

export interface SetkaUserMenuSnapshot {
    open: boolean;
    expanded: boolean;
    userId: string;
    displayName: string;
    avatarUrl?: string;
}

export class SetkaUserMenuViewModel extends BaseViewModel<SetkaUserMenuSnapshot, { ownProfileStore: OwnProfileStore }> {
    public constructor(
        props: { ownProfileStore: OwnProfileStore },
        private readonly dispatcher: MatrixDispatcher,
        private readonly client: MatrixClient,
        isPanelCollapsed: boolean,
    ) {
        super(props, SetkaUserMenuViewModel.computeSnapshot(client, props.ownProfileStore, isPanelCollapsed));
        props.ownProfileStore.on(UPDATE_EVENT, this.recalculateProfile);
    }

    public dispose(): void {
        this.props.ownProfileStore.off(UPDATE_EVENT, this.recalculateProfile);
        super.dispose();
    }

    private static computeSnapshot(
        client: MatrixClient,
        ownProfileStore: OwnProfileStore,
        isPanelCollapsed: boolean,
    ): SetkaUserMenuSnapshot {
        const userId = client.getSafeUserId();
        return {
            open: false,
            expanded: !isPanelCollapsed,
            userId,
            displayName: ownProfileStore.displayName || userId,
            avatarUrl: ownProfileStore.getHttpAvatarUrl(AVATAR_PX) ?? undefined,
        };
    }

    public readonly recalculateProfile = (): void => {
        const displayName = this.props.ownProfileStore.displayName || this.snapshot.current.userId;
        const avatarUrl = this.props.ownProfileStore.getHttpAvatarUrl(AVATAR_PX) ?? undefined;
        this.snapshot.merge({ displayName, avatarUrl });
    };

    public readonly setOpen = (isOpen: boolean): void => {
        this.snapshot.merge({ open: isOpen });
    };

    public readonly setExpanded = (expanded: boolean): void => {
        this.snapshot.merge({ expanded });
    };

    public readonly openMyProfile = (): void => {
        this.setOpen(false);
        this.dispatcher.dispatch({
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Account,
        });
    };

    public readonly openSetkaPlus = (): void => {
        this.setOpen(false);
        Modal.createDialog(SetkaPlusDialog, { client: this.client }, "mx_SetkaPlusDialog");
    };

    public readonly openSettings = (): void => {
        this.setOpen(false);
        this.dispatcher.dispatch({
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Appearance,
        });
    };

    public readonly copyInviteLink = async (): Promise<void> => {
        this.setOpen(false);
        const userId = this.client.getSafeUserId();
        const link = makeSetkaShareLink(userId);
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            // fallback for older browsers
            const textarea = document.createElement("textarea");
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }
    };

    public readonly openAndroidDownload = (): void => {
        Modal.createDialog(SetkaAndroidDownloadDialog, {}, "mx_SetkaAndroidDownloadDialog");
    };

    public readonly logout = async (): Promise<void> => {
        this.setOpen(false);
        if (await shouldShowLogoutDialog(this.client)) {
            Modal.createDialog(LogoutDialog);
        } else {
            this.dispatcher.fire(Action.TriggerLogout);
        }
    };
}
