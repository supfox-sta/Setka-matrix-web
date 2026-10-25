/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type JSX, useContext, useEffect, useState } from "react";

import { _t } from "../../../../../languageHandler";
import UserProfileSettings from "../../UserProfileSettings";
import SettingsTab from "../SettingsTab";
import { SDKContext } from "../../../../../contexts/SDKContext";

const SetkaAccountUserSettingsTab: React.FC = () => {
    const [externalAccountManagementUrl, setExternalAccountManagementUrl] = useState<string | undefined>();
    const [canSetDisplayName, setCanSetDisplayName] = useState(false);
    const [canSetAvatar, setCanSetAvatar] = useState(false);

    const sdkContext = useContext(SDKContext);
    const cli = sdkContext.client!;

    useEffect(() => {
        (async () => {
            const capabilities = (await cli.getCapabilities()) ?? {};
            setCanSetDisplayName(
                !capabilities["m.set_displayname"] || capabilities["m.set_displayname"].enabled === true,
            );
            setCanSetAvatar(!capabilities["m.set_avatar_url"] || capabilities["m.set_avatar_url"].enabled === true);
            const authMetadata = await cli.getAuthMetadata().catch(() => {});
            setExternalAccountManagementUrl(authMetadata?.account_management_uri);
        })();
    }, [cli]);

    return (
        <SettingsTab data-testid="mx_SetkaAccountUserSettingsTab">
            <UserProfileSettings
                externalAccountManagementUrl={externalAccountManagementUrl}
                canSetDisplayName={canSetDisplayName}
                canSetAvatar={canSetAvatar}
            />
        </SettingsTab>
    );
};

export default SetkaAccountUserSettingsTab;
