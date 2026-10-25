/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type ChangeEvent, type FormEvent, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import DialogButtons from "../components/views/elements/DialogButtons";
import Field from "../components/views/elements/Field";
import { saveSetkaContact } from "./SetkaContactsApi";
import { setkaContactsStore } from "./setkaContactsStore";

export interface SetkaContactEditFields {
    roomId: string;
    displayName?: string;
    email?: string;
    phone?: string;
}

interface Props {
    client: MatrixClient;
    contact: SetkaContactEditFields;
    onFinished: (saved?: boolean) => void;
}

const SetkaContactEditDialog: React.FC<Props> = ({ client, contact, onFinished }) => {
    const userId = client.getUserId()!;
    const [displayName, setDisplayName] = useState(contact.displayName ?? "");
    const [email, setEmail] = useState(contact.email ?? "");
    const [phone, setPhone] = useState(contact.phone ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    const onSubmit = async (ev: FormEvent): Promise<void> => {
        ev.preventDefault();
        setSaving(true);
        setError(false);
        try {
            await saveSetkaContact(client, userId, contact.roomId, {
                displayName: displayName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
            });
            await setkaContactsStore.refresh(client, userId);
            onFinished(true);
        } catch {
            setError(true);
            setSaving(false);
        }
    };

    return (
        <BaseDialog
            className="mx_SetkaContactEditDialog"
            onFinished={onFinished}
            title={_t("setka|contacts|edit_title")}
            contentId="mx_SetkaContactEditDialog_content"
        >
            <form onSubmit={onSubmit}>
                <div className="mx_Dialog_content" id="mx_SetkaContactEditDialog_content">
                    <Field
                        label={_t("settings|general|display_name")}
                        value={displayName}
                        onChange={(ev: ChangeEvent<HTMLInputElement>) => setDisplayName(ev.target.value)}
                        autoComplete="off"
                    />
                    <Field
                        label={_t("setka|contacts|email_label")}
                        value={email}
                        onChange={(ev: ChangeEvent<HTMLInputElement>) => setEmail(ev.target.value)}
                        autoComplete="off"
                        type="email"
                    />
                    <Field
                        label={_t("setka|contacts|phone_label")}
                        value={phone}
                        onChange={(ev: ChangeEvent<HTMLInputElement>) => setPhone(ev.target.value)}
                        autoComplete="off"
                        type="tel"
                    />
                    {error && <div className="error">{_t("setka|contacts|save_error")}</div>}
                </div>
                <DialogButtons
                    primaryButton={saving ? _t("common|updating") : _t("action|save")}
                    primaryDisabled={saving}
                    hasCancel={true}
                    onPrimaryButtonClick={onSubmit}
                    onCancel={() => onFinished(false)}
                />
            </form>
        </BaseDialog>
    );
};

export default SetkaContactEditDialog;
