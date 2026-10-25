/*
Copyright 2024 New Vector Ltd.
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2018 New Vector Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";
import { type NumberSize, Resizable } from "re-resizable";
import { type Direction } from "re-resizable/lib/resizer";
import { type WebPanelResize } from "@matrix-org/analytics-events/types/typescript/WebPanelResize";

import { PosthogAnalytics } from "../../PosthogAnalytics.ts";
import { SDKContext } from "../../contexts/SDKContext.ts";
import RightPanelStore from "../../stores/right-panel/RightPanelStore";

interface IProps {
    collapsedRhs?: boolean;
    panel?: JSX.Element;
    children: ReactNode;
    /**
     * A unique identifier for this panel split.
     *
     * This is appended to the key used to store the panel size in localStorage, allowing the widths of different
     * panels to be stored.
     */
    sizeKey?: string;
    /**
     * The size to use for the panel component if one isn't persisted in storage. Defaults to 320.
     */
    defaultSize: number;

    analyticsRoomType: WebPanelResize["roomType"];

    /**
     * Discord-style layout: call on top, chat panel below (Setka experiments).
     */
    vertical?: boolean;
}

export default class MainSplit extends React.Component<IProps> {
    public static contextType = SDKContext;
    declare public context: React.ContextType<typeof SDKContext>;

    public static defaultProps = {
        defaultSize: 320,
    };

    public constructor(props: IProps, context: React.ContextType<typeof SDKContext>) {
        super(props, context);
    }

    private onResizeStart = (): void => {
        this.context.resizeNotifier.startResizing();
    };

    private onResize = (): void => {
        this.context.resizeNotifier.notifyRightHandleResized();
    };

    private get sizeSettingStorageKey(): string {
        let key = "mx_rhs_size";
        if (!!this.props.sizeKey) {
            key += `_${this.props.sizeKey}`;
        }
        return key;
    }

    private onResizeStop = (
        event: MouseEvent | TouchEvent,
        direction: Direction,
        elementRef: HTMLElement,
        delta: NumberSize,
    ): void => {
        const vertical = Boolean(this.props.vertical);
        const prev = this.loadSidePanelSize();
        const rawSize = vertical
            ? (typeof prev.height === "number" ? prev.height : this.props.defaultSize) + delta.height
            : (typeof prev.width === "number" ? prev.width : this.props.defaultSize) + delta.width;
        // A saved split size can outlive the viewport it was created in. Clamp it
        // before persisting so a resize on a small screen cannot hide the chat.
        const maxSize = vertical
            ? Math.max(120, Math.floor(window.innerHeight * 0.55))
            : Math.floor(window.innerWidth * 0.5);
        const minSize = vertical ? Math.min(180, maxSize) : Math.min(320, maxSize);
        const newSize = Math.max(minSize, Math.min(Math.round(rawSize), maxSize));
        this.context.resizeNotifier.stopResizing();
        // Dragged (almost) to the bottom edge: collapse the chat, the call takes the whole area.
        if (vertical && rawSize < 120) {
            const roomId = this.context.roomViewStore.getRoomId();
            if (roomId) RightPanelStore.instance.hide(roomId);
            return;
        }
        window.localStorage.setItem(this.sizeSettingStorageKey, newSize.toString());

        PosthogAnalytics.instance.trackEvent<WebPanelResize>({
            eventName: "WebPanelResize",
            panel: "right",
            roomType: this.props.analyticsRoomType,
            size: newSize,
        });
    };

    private loadSidePanelSize(): { height: string | number; width: string | number } {
        let stored = parseInt(window.localStorage.getItem(this.sizeSettingStorageKey) ?? "", 10);
        const vertical = Boolean(this.props.vertical);
        const maxSize = vertical
            ? Math.max(120, Math.floor(window.innerHeight * 0.8))
            : Math.floor(window.innerWidth * 0.5);
        const minSize = vertical ? Math.min(180, maxSize) : Math.min(320, maxSize);

        if (!Number.isFinite(stored)) {
            stored = this.props.defaultSize;
        }
        stored = Math.max(minSize, Math.min(stored, maxSize));

        if (vertical) {
            return {
                width: "100%",
                height: stored,
            };
        }

        return {
            height: "100%",
            width: stored,
        };
    }

    public render(): React.ReactNode {
        const bodyView = React.Children.only(this.props.children);
        const panelView = this.props.panel;
        const vertical = Boolean(this.props.vertical);

        const hasResizer = !this.props.collapsedRhs && panelView;

        let children;
        if (hasResizer) {
            children = (
                <Resizable
                    key={`${this.props.sizeKey ?? "default"}_${vertical ? "v" : "h"}`}
                    defaultSize={this.loadSidePanelSize()}
                    minWidth={vertical ? "100%" : 320}
                    maxWidth={vertical ? "100%" : "50%"}
                    minHeight={
                        vertical ? 40 : undefined
                    }
                    maxHeight={vertical ? "85%" : undefined}
                    enable={{
                        top: vertical,
                        right: false,
                        bottom: false,
                        left: !vertical,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false,
                    }}
                    onResizeStart={this.onResizeStart}
                    onResize={this.onResize}
                    onResizeStop={this.onResizeStop}
                    className="mx_RightPanel_ResizeWrapper"
                    handleClasses={{
                        left: vertical ? undefined : "mx_ResizeHandle--horizontal",
                        top: vertical ? "mx_ResizeHandle--vertical" : undefined,
                    }}
                >
                    {panelView}
                </Resizable>
            );
        }

        return (
            <div className={"mx_MainSplit" + (vertical ? " mx_MainSplit_vertical" : "")}>
                {bodyView}
                {children}
            </div>
        );
    }
}
