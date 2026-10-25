/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useContext, useEffect, useState } from "react";
import classNames from "classnames";
import VideoCallIcon from "@vector-im/compound-design-tokens/assets/web/icons/video-call";

import { _t } from "../languageHandler";
import { SpaceButton } from "../components/views/spaces/SpaceTreeLevel";
import { MetaSpace, UPDATE_SELECTED_SPACE } from "../stores/spaces";
import { SDKContext } from "../contexts/SDKContext";

interface Props {
    isPanelCollapsed: boolean;
}

/** Direct shortcut to Setka conferences (video rooms space). */
const SetkaSpaceNavButton: React.FC<Props> = ({ isPanelCollapsed }) => {
    const sdkContext = useContext(SDKContext);
    const [active, setActive] = useState(false);

    useEffect(() => {
        const sync = (): void => {
            setActive(sdkContext.spaceStore.activeSpace === MetaSpace.VideoRooms);
        };
        sync();
        sdkContext.spaceStore.on(UPDATE_SELECTED_SPACE, sync);
        return () => sdkContext.spaceStore.off(UPDATE_SELECTED_SPACE, sync);
    }, [sdkContext.spaceStore]);

    const openConferences = (): void => {
        sdkContext.spaceStore.setActiveSpace(MetaSpace.VideoRooms);
    };

    return (
        <li
            className={classNames("mx_SpaceItem", { collapsed: isPanelCollapsed })}
            role="treeitem"
            aria-selected={active}
        >
            <SpaceButton
                className="mx_SetkaSpaceNavButton"
                label={_t("setka|tabs|conferences")}
                title={_t("setka|tabs|conferences")}
                selected={active}
                isNarrow={isPanelCollapsed}
                size="32px"
                icon={<VideoCallIcon />}
                onClick={openConferences}
            />
        </li>
    );
};

export default SetkaSpaceNavButton;
