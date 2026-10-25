/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useContext } from "react";
import LabsIcon from "@vector-im/compound-design-tokens/assets/web/icons/labs";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import MatrixClientContext from "../contexts/MatrixClientContext";
import { openSetkaBotCreatorChat } from "./setkaBotCreatorUtils";

/** Entry point: open DM with @bottool_bot (all bot management is in chat). */
const SetkaBotCreatorSettings: React.FC = () => {
    const client = useContext(MatrixClientContext)!;

    const onOpenChat = useCallback(() => {
        openSetkaBotCreatorChat(client);
    }, [client]);

    return (
        <div className="mx_SetkaBotCreatorSettings">
            <header className="mx_SetkaBotCreatorSettings_header">
                <LabsIcon className="mx_SetkaBotCreatorSettings_headerIcon" width={32} height={32} />
                <div>
                    <h2 className="mx_SetkaBotCreatorSettings_title">{_t("setka|bot_creator|settings_title")}</h2>
                    <p className="mx_SetkaBotCreatorSettings_subtitle">{_t("setka|bot_creator|settings_subtitle")}</p>
                </div>
            </header>

            <div className="mx_SetkaBotCreatorSettings_actions">
                <AccessibleButton kind="primary" onClick={onOpenChat}>
                    {_t("setka|bot_creator|open_chat")}
                </AccessibleButton>
            </div>
            <p className="mx_SetkaBotCreatorSettings_chatHint">{_t("setka|bot_creator|chat_hint")}</p>
        </div>
    );
};

export default SetkaBotCreatorSettings;
