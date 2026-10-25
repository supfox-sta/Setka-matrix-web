/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useContext, useEffect, useState } from "react";
import { Form, SettingsToggleInput } from "@vector-im/compound-web";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../../../languageHandler";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { SettingsSubsection, SettingsSubsectionText } from "../../shared/SettingsSubsection";
import InlineSpinner from "../../../elements/InlineSpinner";
import CopyableText from "../../../elements/CopyableText";
import QuestionDialog from "../../../dialogs/QuestionDialog";
import Modal from "../../../../../Modal";
import { SDKContext } from "../../../../../contexts/SDKContext";
import { deleteSetkaRecoveryKey, getSetkaSKeyBackupState } from "../../../../../setka/SetkaLoginVerificationApi";
import { publishSetkaRecoveryKeyToServer } from "../../../../../setka/setkaSKeyService";

const SetkaSKeySettingsTab: React.FC = () => {
    const sdkContext = useContext(SDKContext);
    const client = sdkContext.client!;

    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [recoveryKey, setRecoveryKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(false);
        setFetchFailed(false);
        try {
            const state = await getSetkaSKeyBackupState(client);
            setEnabled(state.enabled);
            setRecoveryKey(state.recoveryKey);
            setFetchFailed(state.fetchFailed);
        } catch (e) {
            logger.warn("Failed to load Setka S/Key status", e);
            setEnabled(false);
            setRecoveryKey("");
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [client]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const onEnable = (): void => {
        if (enabled || busy) return;
        setBusy(true);
        setError(false);
        void (async () => {
            try {
                const key = await publishSetkaRecoveryKeyToServer(client);
                setEnabled(true);
                setRecoveryKey(key);
                setFetchFailed(false);
            } catch (e) {
                logger.warn("Failed to enable Setka S/Key", e);
                setError(true);
            } finally {
                setBusy(false);
            }
        })();
    };

    const onDisable = (): void => {
        if (!enabled || busy) return;

        const { finished } = Modal.createDialog(QuestionDialog, {
            title: _t("setka|skey|disable_title"),
            description: _t("setka|skey|disable_description"),
            button: _t("setka|skey|disable_confirm"),
            danger: true,
            hasCancelButton: true,
        });

        finished.then(async (confirmed) => {
            if (!confirmed) return;
            setBusy(true);
            setError(false);
            try {
                await deleteSetkaRecoveryKey(client);
                setEnabled(false);
                setRecoveryKey("");
            } catch (e) {
                logger.warn("Failed to disable Setka S/Key", e);
                setError(true);
            } finally {
                setBusy(false);
            }
        });
    };

    const onToggle = (checked: boolean): void => {
        if (checked) {
            onEnable();
        } else {
            onDisable();
        }
    };

    return (
        <SettingsTab className="mx_SetkaSKeySettingsTab">
            <SettingsSection heading={_t("setka|skey|settings_title")}>
                <SettingsSubsection
                    heading={_t("setka|skey|toggle_title")}
                    description={_t("setka|skey|settings_description")}
                >
                    {loading || busy ? (
                        <InlineSpinner />
                    ) : (
                        <Form.Root
                            onSubmit={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                        >
                            <SettingsToggleInput
                                name="setka-skey-enabled"
                                label={_t("setka|skey|toggle_title")}
                                checked={enabled}
                                disabled={busy}
                                onChange={(ev) => onToggle(ev.target.checked)}
                            />
                        </Form.Root>
                    )}
                    {error && <SettingsSubsectionText>{_t("setka|skey|toggle_error")}</SettingsSubsectionText>}
                    {fetchFailed && !error && (
                        <SettingsSubsectionText>{_t("setka|skey|stale_backup_hint")}</SettingsSubsectionText>
                    )}
                </SettingsSubsection>

                {enabled && recoveryKey && (
                    <SettingsSubsection heading={_t("setka|skey|copy_title")}>
                        <CopyableText getTextToCopy={() => recoveryKey}>
                            <code className="mx_SetkaSKeySettingsTab_key">{recoveryKey}</code>
                        </CopyableText>
                        <SettingsSubsectionText>{_t("setka|skey|copy_hint")}</SettingsSubsectionText>
                    </SettingsSubsection>
                )}
            </SettingsSection>
        </SettingsTab>
    );
};

export default SetkaSKeySettingsTab;
