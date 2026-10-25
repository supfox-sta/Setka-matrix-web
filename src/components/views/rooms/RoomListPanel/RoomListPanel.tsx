/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useCallback, useContext, useEffect } from "react";
import { Flex, RoomListHeaderView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import { shouldShowComponent } from "../../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../../settings/UIFeature";
import { RoomListSearch } from "./RoomListSearch";
import { RoomListView } from "./RoomListView";
import { _t } from "../../../../languageHandler";
import { getKeyBindingsManager } from "../../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../../accessibility/KeyboardShortcuts";
import { Landmark, LandmarkNavigation } from "../../../../accessibility/LandmarkNavigation";
import { type IState as IRovingTabIndexState } from "../../../../accessibility/RovingTabIndex";
import { RoomListHeaderViewModel } from "../../../../viewmodels/room-list/RoomListHeaderViewModel";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { SDKContext } from "../../../../contexts/SDKContext.ts";
import { isSetkaHomeserver } from "../../../../setka/SetkaConfig";
import SetkaContactsPanel from "../../../../setka/SetkaContactsPanel";
import SetkaFeedPanel from "../../../../setka/SetkaFeedPanel";
import SetkaLeftPanelLogo from "../../../../setka/SetkaLeftPanelLogo";
import SetkaLeftPanelTabs, { useSetkaLeftPanelTab } from "../../../../setka/SetkaLeftPanelTabs";
import { setkaContactsStore } from "../../../../setka/setkaContactsStore";

type RoomListPanelProps = {
    /**
     * Current active space
     * See {@link RoomListSearch}
     */
    activeSpace: string;
};

/**
 * The panel of the room list
 */
export const RoomListPanel: React.FC<RoomListPanelProps> = ({ activeSpace }) => {
    const sdkContext = useContext(SDKContext);
    const displayRoomSearch = shouldShowComponent(UIComponent.FilterContainer);
    const [focusedElement, setFocusedElement] = useState<Element | null>(null);
    const [setkaTab, setSetkaTab] = useSetkaLeftPanelTab();

    const onFocus = useCallback((ev: React.FocusEvent): void => {
        setFocusedElement(ev.target);
    }, []);

    const onBlur = useCallback((): void => {
        setFocusedElement(null);
    }, []);

    const onKeyDown = useCallback(
        (ev: React.KeyboardEvent, state?: IRovingTabIndexState): void => {
            if (!focusedElement) return;
            const navAction = getKeyBindingsManager().getNavigationAction(ev);
            if (navAction === KeyBindingAction.PreviousLandmark || navAction === KeyBindingAction.NextLandmark) {
                ev.stopPropagation();
                ev.preventDefault();
                LandmarkNavigation.findAndFocusNextLandmark(
                    Landmark.ROOM_SEARCH,
                    navAction === KeyBindingAction.PreviousLandmark,
                );
            }
        },
        [focusedElement],
    );

    const matrixClient = useMatrixClientContext();
    const showSetkaTabs = isSetkaHomeserver(matrixClient);

    useEffect(() => {
        if (showSetkaTabs) {
            void setkaContactsStore.ensureLoaded(matrixClient);
        }
    }, [matrixClient, showSetkaTabs]);

    const vm = useCreateAutoDisposedViewModel(
        () => new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore }),
    );

    return (
        <Flex
            as="nav"
            className="mx_RoomListPanel"
            direction="column"
            align="stretch"
            aria-label={_t("room_list|list_title")}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
        >
            {showSetkaTabs && <SetkaLeftPanelLogo />}
            {showSetkaTabs && <SetkaLeftPanelTabs value={setkaTab} onChange={setSetkaTab} />}
            <div className={showSetkaTabs ? "mx_SetkaLeftPanel_body" : undefined}>
                {showSetkaTabs && setkaTab === "contacts" ? (
                    <SetkaContactsPanel client={matrixClient} />
                ) : showSetkaTabs && setkaTab === "feed" ? (
                    <SetkaFeedPanel client={matrixClient} />
                ) : (
                    <>
                        {displayRoomSearch && <RoomListSearch activeSpace={activeSpace} />}
                        <RoomListHeaderView vm={vm} />
                        <RoomListView />
                    </>
                )}
            </div>
        </Flex>
    );
};
