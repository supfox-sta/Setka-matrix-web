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
import SetkaContactMethods from "../../../../../setka/SetkaContactMethods";
import InlineSpinner from "../../../elements/InlineSpinner";
import Field from "../../../elements/Field";
import { SDKContext } from "../../../../../contexts/SDKContext";
import {
    fetchSetkaPrivacy,
    saveSetkaPrivacy,
    type SetkaPrivacy,
    type SetkaVisibility,
} from "../../../../../setka/SetkaPrivacyApi";

const VISIBILITY_OPTIONS: SetkaVisibility[] = ["everyone", "contacts", "nobody"];

function visibilityLabel(value: SetkaVisibility): string {
    switch (value) {
        case "contacts":
            return _t("setka|privacy|contacts");
        case "nobody":
            return _t("setka|privacy|nobody");
        default:
            return _t("setka|privacy|everyone");
    }
}

const SetkaPrivacySettingsTab: React.FC = () => {
    const sdkContext = useContext(SDKContext);
    const client = sdkContext.client!;
    const userId = client.getUserId()!;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const [privacy, setPrivacy] = useState<SetkaPrivacy | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setPrivacy(await fetchSetkaPrivacy(client, userId));
        } catch (e) {
            logger.warn("Failed to load Setka privacy settings", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [client, userId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const updatePrivacy = useCallback(
        async (patch: Partial<SetkaPrivacy>) => {
            if (!privacy) return;
            setSaving(true);
            setError(false);
            try {
                const updated = await saveSetkaPrivacy(client, userId, patch);
                setPrivacy(updated);
            } catch (e) {
                logger.warn("Failed to save Setka privacy settings", e);
                setError(true);
            } finally {
                setSaving(false);
            }
        },
        [client, privacy, userId],
    );

    const visibilityField = (
        label: string,
        value: SetkaVisibility,
        onChange: (next: SetkaVisibility) => void,
    ): React.ReactNode => (
        <Field
            label={label}
            element="select"
            value={value}
            disabled={loading || saving}
            onChange={(ev: React.ChangeEvent<HTMLSelectElement>) => onChange(ev.target.value as SetkaVisibility)}
        >
            {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                    {visibilityLabel(option)}
                </option>
            ))}
        </Field>
    );

    return (
        <SettingsTab className="mx_SetkaPrivacySettingsTab">
            <SettingsSection heading={_t("setka|privacy|title")}>
                <SettingsSubsection
                    heading="Почта и номер телефона"
                    description="По ним вас находят друзья. Номер подтверждается кодом, который приходит на почту."
                >
                    <SetkaContactMethods client={client} />
                </SettingsSubsection>

                <SettingsSubsection
                    heading={_t("setka|privacy|visibility_section")}
                    description={_t("setka|privacy|visibility_description")}
                >
                    {loading ? (
                        <InlineSpinner />
                    ) : privacy ? (
                        <div className="mx_SetkaPrivacySettingsTab_fields">
                            {visibilityField(_t("setka|privacy|last_seen"), privacy.last_seen_visibility, (next) =>
                                void updatePrivacy({ last_seen_visibility: next }),
                            )}
                            {visibilityField(_t("setka|privacy|phone_visibility"), privacy.phone_visibility, (next) =>
                                void updatePrivacy({ phone_visibility: next }),
                            )}
                            {visibilityField(_t("setka|privacy|call_visibility"), privacy.call_visibility, (next) =>
                                void updatePrivacy({ call_visibility: next }),
                            )}
                            {visibilityField(_t("setka|privacy|email_visibility"), privacy.email_visibility, (next) =>
                                void updatePrivacy({ email_visibility: next }),
                            )}
                        </div>
                    ) : null}
                </SettingsSubsection>

                <SettingsSubsection
                    heading={_t("setka|privacy|search_section")}
                    description={_t("setka|privacy|search_description")}
                >
                    {loading ? (
                        <InlineSpinner />
                    ) : privacy ? (
                        <Form.Root
                            onSubmit={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                        >
                            <SettingsToggleInput
                                name="setka-discoverable-msisdn"
                                label={_t("setka|privacy|discoverable_msisdn")}
                                checked={privacy.discoverable_msisdn}
                                disabled={saving}
                                onChange={(ev) => void updatePrivacy({ discoverable_msisdn: ev.target.checked })}
                            />
                            <SettingsSubsectionText>{_t("setka|privacy|discoverable_msisdn_hint")}</SettingsSubsectionText>
                            <SettingsToggleInput
                                name="setka-discoverable-email"
                                label={_t("setka|privacy|discoverable_email")}
                                checked={privacy.discoverable_email}
                                disabled={saving}
                                onChange={(ev) => void updatePrivacy({ discoverable_email: ev.target.checked })}
                            />
                        </Form.Root>
                    ) : null}
                </SettingsSubsection>

                {error && <SettingsSubsectionText>{_t("setka|privacy|save_error")}</SettingsSubsectionText>}
            </SettingsSection>
        </SettingsTab>
    );
};

export default SetkaPrivacySettingsTab;
