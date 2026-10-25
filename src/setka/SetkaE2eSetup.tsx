/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState } from "react";

import AuthPage from "../components/views/auth/AuthPage";
import { InitialCryptoSetupStore, useInitialCryptoSetupStatus } from "../stores/InitialCryptoSetupStore";
import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import { markSetkaAppEnterPending } from "./setkaAppEnter";
import SetkaSKeySplash from "./SetkaSKeySplash";

const E2E_SETUP_TIMEOUT_MS = 90_000;

interface Props {
    onCancelled: () => void;
}

/**
 * Setka S/Key setup — cross-signing bootstrap with branded splash instead of the default dialog.
 */
const SetkaE2eSetup: React.FC<Props> = ({ onCancelled }) => {
    const status = useInitialCryptoSetupStatus(InitialCryptoSetupStore.sharedInstance());
    const [exiting, setExiting] = useState(false);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (status === "complete" && !exiting) {
            setExiting(true);
        }
    }, [exiting, status]);

    useEffect(() => {
        if (status !== "in_progress") {
            setTimedOut(false);
            return;
        }
        const timer = window.setTimeout(() => setTimedOut(true), E2E_SETUP_TIMEOUT_MS);
        return () => window.clearTimeout(timer);
    }, [status]);

    const onFinished = useCallback(() => {
        markSetkaAppEnterPending();
        onCancelled();
    }, [onCancelled]);

    const onRetryClick = useCallback(() => {
        setTimedOut(false);
        InitialCryptoSetupStore.sharedInstance().retry();
    }, []);

    if (status === "error" || timedOut) {
        return (
            <AuthPage>
                <div className="mx_SetkaSKeySplash">
                    <div className="mx_SetkaSKeySplash_inner">
                        <p className="mx_SetkaSKeySplash_message">{_t("setka|skey|error")}</p>
                        <AccessibleButton kind="primary" onClick={onRetryClick}>
                            {_t("action|retry")}
                        </AccessibleButton>
                        <AccessibleButton kind="link" onClick={onCancelled}>
                            {_t("action|skip")}
                        </AccessibleButton>
                    </div>
                </div>
            </AuthPage>
        );
    }

    return (
        <AuthPage>
            <SetkaSKeySplash complete={exiting} onFinished={onFinished} />
        </AuthPage>
    );
};

export default SetkaE2eSetup;
