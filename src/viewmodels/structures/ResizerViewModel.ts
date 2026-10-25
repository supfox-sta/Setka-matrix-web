/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import {
    BaseViewModel,
    type LeftResizablePanelViewActions,
    type SeparatorViewActions,
    type PanelSize,
    type PanelImperativeHandle,
    type GroupViewActions,
    type ResizerViewSnapshot,
} from "@element-hq/web-shared-components";
import { debounce } from "lodash";
import { type PointerEvent as ReactPointerEvent } from "react";

import SettingsStore from "../../settings/SettingsStore";
import { SettingLevel } from "../../settings/SettingLevel";
import { AutoCollapse } from "./auto-collapse/AutoCollapse";
import { type CallStore } from "../../stores/CallStore";

function getInitialState(): ResizerViewSnapshot {
    const shouldStartCollapsed =
        SettingsStore.getValue("RoomList.isPanelCollapsed") || AutoCollapse.shouldStartCollapsed();
    if (shouldStartCollapsed) {
        return {
            isCollapsed: true,
            initialSize: 0,
        };
    }
    return {
        isCollapsed: false,
        initialSize: SettingsStore.getValue("RoomList.panelSize") ?? undefined,
    };
}

/**
 * Viewmodel that drives the resizable left panel.
 */
export class ResizerViewModel
    extends BaseViewModel<ResizerViewSnapshot, void>
    implements SeparatorViewActions, LeftResizablePanelViewActions, GroupViewActions
{
    /**
     * This object gives us access to the API methods of react-resizable-panels library.
     */
    private panelHandle?: PanelImperativeHandle;

    /**
     * Needed to distinguish between a drag and a click on the separator.
     */
    private readonly mouseClickHandler: MouseClickHandler;

    /**
     * Orchestrator for auto collapse behaviour.
     */
    private readonly autoCollapse: AutoCollapse;

    /**
     * Tracks whether we've seen the first resized event.
     */
    private firstResizedEventSeen = false;

    public constructor(callStore: CallStore) {
        super(undefined, getInitialState());

        // Run onSeparatorClick when the separator is clicked.
        this.mouseClickHandler = new MouseClickHandler(this.onSeparatorClick);
        this.autoCollapse = this.disposables.track(
            new AutoCollapse(
                this.onSeparatorClick,
                () => {
                    this.panelHandle?.collapse();
                    this.snapshot.merge({ isCollapsed: true });
                },
                callStore,
            ),
        );
    }

    public onLeftPanelResize = debounce((panelSize: PanelSize): void => {
        const newSize = panelSize.inPixels;
        this.snapshot.merge({ isCollapsed: newSize === 0 });
    }, 50);

    public onLeftPanelResized = (newSize: number): void => {
        if (!this.firstResizedEventSeen) {
            // When the panel is first rendered, we get a resized event.
            // This should be ignored to prevent rewriting the setting value and
            // to avoid confusing the collapse behaviour code.
            this.firstResizedEventSeen = true;
            return;
        }

        // Early return if we should be ignoring this event due to some auto-collapse behaviour.
        if (this.autoCollapse.shouldIgnoreResize) return;

        this.autoCollapse.onLeftPanelResized();

        const isCollapsed = newSize === 0;
        // Store the size if the panel isn't collapsed.
        if (!isCollapsed) {
            SettingsStore.setValue("RoomList.panelSize", null, SettingLevel.DEVICE, newSize);
        }
        // Store whether the panel was collapsed.
        // This is stored separately instead of being inferred from the stored panel size so that
        // the panel can be restored to its last known non-zero width even after app reload, which
        // we wouldn't be able to do if we stored panelSize as zero.
        SettingsStore.setValue("RoomList.isPanelCollapsed", null, SettingLevel.DEVICE, isCollapsed);
    };

    public setPanelHandle = (handle: PanelImperativeHandle): void => {
        this.panelHandle = handle;
    };

    private onSeparatorClick = (): void => {
        if (!this.panelHandle) return;

        if (this.panelHandle.isCollapsed()) {
            const lastSize = SettingsStore.getValue("RoomList.panelSize");
            this.panelHandle.resize(`${lastSize ?? 100}%`);
            this.autoCollapse.onLeftPanelResized();
            this.snapshot.merge({ isCollapsed: false });
            return;
        }

        this.panelHandle.collapse();
        this.snapshot.merge({ isCollapsed: true });
    };

    public onDoubleClick = (): void => {
        // When the panel is expanded, double click should collapse.
        if (!this.panelHandle?.isCollapsed()) this.panelHandle?.collapse();
    };

    public onPointerUp = (): void => {
        this.mouseClickHandler.onPointerUp();
    };

    public onPointerMove = (event?: React.PointerEvent): void => {
        this.mouseClickHandler.onPointerMove(event);
    };

    public onPointerDown = (event?: React.PointerEvent): void => {
        this.mouseClickHandler.onPointerDown(event);
    };
}

/**
 * Dragging the separator will emit a click event.
 * This class uses pointer event handlers to distinguish between a drag and a click
 * on the separator.
 */
class MouseClickHandler {
    public constructor(private readonly onClick: () => void) {}

    private isResize = false;
    private startX = 0;
    private startY = 0;

    public onPointerUp = (): void => {
        if (!this.isResize) this.onClick();
    };

    public onPointerDown = (event?: ReactPointerEvent | PointerEvent): void => {
        this.isResize = false;
        this.startX = event?.clientX ?? 0;
        this.startY = event?.clientY ?? 0;
    };

    public onPointerMove = (event?: ReactPointerEvent | PointerEvent): void => {
        if (!event) {
            this.isResize = true;
            return;
        }
        const dx = Math.abs(event.clientX - this.startX);
        const dy = Math.abs(event.clientY - this.startY);
        if (dx > 6 || dy > 6) {
            this.isResize = true;
        }
    };
}
