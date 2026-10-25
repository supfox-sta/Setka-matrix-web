/*

Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import React, { useCallback, useEffect, useState } from "react";

import LockIcon from "@vector-im/compound-design-tokens/assets/web/icons/lock";



import { _t } from "../languageHandler";

import { MatrixClientPeg } from "../MatrixClientPeg";

import AccessibleButton from "../components/views/elements/AccessibleButton";

import AuthPage from "../components/views/auth/AuthPage";

import SetkaSKeySplash from "./SetkaSKeySplash";

import {

    completeSetkaLoginFallback,

    fetchSetkaRecoveryKey,

    getSetkaLoginStatus,

    type SetkaLoginStatus,

} from "./SetkaLoginVerificationApi";

import {

    applySetkaRecoveryKeyForVerification,

    fetchSetkaRecoveryKeyForPaste,

    trySilentSetkaLogin,

    verifySetkaCurrentDevice,

} from "./setkaLoginRecovery";

import { SetkaTimeoutError } from "./setkaTimeout";

import { SetkaAnalyticsEvents } from "./analytics/events";

import { trackSetkaEvent } from "./analytics/SetkaAnalytics";



const SILENT_LOGIN_TIMEOUT_MS = 25_000;



type Props = {

    onFinished: () => void;

};



const SetkaLoginVerification: React.FC<Props> = ({ onFinished }) => {

    const client = MatrixClientPeg.safeGet();

    const [loading, setLoading] = useState(true);

    const [status, setStatus] = useState<SetkaLoginStatus | null>(null);

    const [statusError, setStatusError] = useState(false);

    const [recoveryMode, setRecoveryMode] = useState(false);

    const [recoveryKey, setRecoveryKey] = useState("");

    const [busy, setBusy] = useState(false);

    const [actionError, setActionError] = useState(false);

    const [skeyMissing, setSkeyMissing] = useState(false);

    const [silentTimedOut, setSilentTimedOut] = useState(false);



    useEffect(() => {

        void (async () => {

            try {

                const silentOk = await Promise.race([

                    trySilentSetkaLogin(client),

                    new Promise<"timeout">((resolve) =>

                        window.setTimeout(() => resolve("timeout"), SILENT_LOGIN_TIMEOUT_MS),

                    ),

                ]);

                if (silentOk === "timeout") {

                    setSilentTimedOut(true);

                } else if (silentOk) {

                    onFinished();

                    return;

                }

                setStatus(await getSetkaLoginStatus(client));

            } catch (error) {

                if (!(error instanceof SetkaTimeoutError)) {

                    setStatusError(true);

                } else {

                    setSilentTimedOut(true);

                }

            } finally {

                setLoading(false);

            }

        })();

    }, [client, onFinished]);



    const onEmojiVerification = useCallback(async (): Promise<void> => {

        setBusy(true);

        setActionError(false);

        try {

            await completeSetkaLoginFallback(client, "emoji");

            await verifySetkaCurrentDevice(client);

            trackSetkaEvent(client, SetkaAnalyticsEvents.LoginFallbackEmoji, {});

            onFinished();

        } catch {

            setActionError(true);

        } finally {

            setBusy(false);

        }

    }, [client, onFinished]);



    const onSKeyVerification = useCallback(async (): Promise<void> => {

        setBusy(true);

        setActionError(false);

        setSkeyMissing(false);

        try {

            const backup = await fetchSetkaRecoveryKey(client);

            if (!backup.available || !backup.recoveryKey) {

                setSkeyMissing(true);

                return;

            }

            await applySetkaRecoveryKeyForVerification(client, backup.recoveryKey);

            await completeSetkaLoginFallback(client, "recovery_key", backup.recoveryKey);

            await verifySetkaCurrentDevice(client);

            trackSetkaEvent(client, SetkaAnalyticsEvents.LoginFallbackRecoveryKey, {});

            onFinished();

        } catch {

            setActionError(true);

        } finally {

            setBusy(false);

        }

    }, [client, onFinished]);



    const onRecoverySubmit = useCallback(async (): Promise<void> => {

        const trimmed = recoveryKey.trim();

        if (!trimmed) return;

        setBusy(true);

        setActionError(false);

        try {

            await applySetkaRecoveryKeyForVerification(client, trimmed);

            await completeSetkaLoginFallback(client, "recovery_key", trimmed);

            await verifySetkaCurrentDevice(client);

            trackSetkaEvent(client, SetkaAnalyticsEvents.LoginFallbackRecoveryKey, {});

            onFinished();

        } catch {

            setActionError(true);

        } finally {

            setBusy(false);

        }

    }, [client, onFinished, recoveryKey]);



    const onTrySetkaSKeyInRecoveryField = useCallback(async (): Promise<void> => {

        setBusy(true);

        setActionError(false);

        try {

            const serverKey = await fetchSetkaRecoveryKeyForPaste(client);

            if (!serverKey) {

                setSkeyMissing(true);

                return;

            }

            setRecoveryKey(serverKey);

            await applySetkaRecoveryKeyForVerification(client, serverKey);

            await completeSetkaLoginFallback(client, "recovery_key", serverKey);

            await verifySetkaCurrentDevice(client);

            trackSetkaEvent(client, SetkaAnalyticsEvents.LoginFallbackRecoveryKey, {});

            onFinished();

        } catch {

            setActionError(true);

        } finally {

            setBusy(false);

        }

    }, [client, onFinished]);



    const onRecoveryFormSubmit = useCallback(

        (event: React.FormEvent) => {

            event.preventDefault();

            void onRecoverySubmit();

        },

        [onRecoverySubmit],

    );



    if (loading) {

        return (

            <AuthPage>

                <SetkaSKeySplash indeterminate />

            </AuthPage>

        );

    }



    return (

        <AuthPage>

            <div className="mx_SetkaLoginVerification">

                <LockIcon width={48} height={48} className="mx_SetkaLoginVerification_icon" />

                <h1>{_t("setka|login|title")}</h1>

                <p className="mx_SetkaLoginVerification_subtitle">{_t("setka|login|subtitle")}</p>

                {silentTimedOut && (

                    <p className="mx_SetkaLoginVerification_meta">{_t("setka|login|auto_trying")}</p>

                )}

                {status?.ip && (

                    <p className="mx_SetkaLoginVerification_meta">{_t("setka|login|ip", { ip: status.ip })}</p>

                )}

                {status?.region && (

                    <p className="mx_SetkaLoginVerification_meta">

                        {_t("setka|login|region", { region: status.region })}

                    </p>

                )}

                {(skeyMissing || (status !== null && !status.recoveryBackupAvailable)) && (

                    <p className="mx_SetkaLoginVerification_meta">{_t("setka|login|skey_not_available")}</p>

                )}

                {(statusError || actionError) && !skeyMissing && (

                    <p className="mx_SetkaLoginVerification_error">{_t("setka|login|error")}</p>

                )}



                {recoveryMode ? (

                    <form className="mx_SetkaLoginVerification_recovery" onSubmit={onRecoveryFormSubmit}>

                        <label htmlFor="setka-recovery-key">{_t("setka|login|recovery_label")}</label>

                        <input

                            id="setka-recovery-key"

                            type="text"

                            value={recoveryKey}

                            onChange={(e) => setRecoveryKey(e.target.value)}

                            autoComplete="off"

                            disabled={busy}

                        />

                        <AccessibleButton kind="primary" element="button" type="submit" disabled={busy || !recoveryKey.trim()}>

                            {_t("setka|login|recovery_submit")}

                        </AccessibleButton>

                        {status?.recoveryBackupAvailable && (

                            <AccessibleButton

                                kind="secondary"

                                element="button"

                                type="button"

                                onClick={() => void onTrySetkaSKeyInRecoveryField()}

                                disabled={busy}

                            >

                                {_t("setka|login|try_skey")}

                            </AccessibleButton>

                        )}

                        <AccessibleButton

                            kind="link_inline"

                            element="button"

                            type="button"

                            onClick={() => setRecoveryMode(false)}

                            disabled={busy}

                        >

                            {_t("action|back")}

                        </AccessibleButton>

                    </form>

                ) : (

                    <div className="mx_SetkaLoginVerification_actions">

                        {status?.recoveryBackupAvailable && (

                            <AccessibleButton kind="primary" element="button" type="button" onClick={() => void onSKeyVerification()} disabled={busy}>

                                {_t("setka|login|skey_button")}

                            </AccessibleButton>

                        )}

                        <AccessibleButton
                            kind={status?.recoveryBackupAvailable ? "secondary" : "primary"}
                            element="button"
                            type="button"
                            onClick={() => void onEmojiVerification()}
                            disabled={busy}
                        >

                            {_t("setka|login|emoji_button")}

                        </AccessibleButton>

                        <AccessibleButton kind="secondary" element="button" type="button" onClick={() => setRecoveryMode(true)} disabled={busy}>

                            {_t("setka|login|recovery_button")}

                        </AccessibleButton>

                        <AccessibleButton kind="link" element="button" type="button" onClick={() => onFinished()} disabled={busy}>

                            {_t("action|skip")}

                        </AccessibleButton>

                    </div>

                )}

            </div>

        </AuthPage>

    );

};



export default SetkaLoginVerification;

