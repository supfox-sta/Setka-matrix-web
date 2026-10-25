/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useState } from "react";
import { HistoryVisibility, JoinRule, Preset, Visibility } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import DialogButtons from "../components/views/elements/DialogButtons";
import Field from "../components/views/elements/Field";
import createRoom from "../createRoom";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { formatChannelTopic, normalizeChannelTag } from "./setkaChannelUtils";

interface Props {
    onFinished: (created?: boolean) => void;
}

const SetkaCreateChannelDialog: React.FC<Props> = ({ onFinished }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [tag, setTag] = useState("");
    const [busy, setBusy] = useState(false);
    const [tagError, setTagError] = useState<string | undefined>();

    const onCancel = useCallback((): void => {
        onFinished(false);
    }, [onFinished]);

    const onCreate = useCallback(async (): Promise<void> => {
        const trimmedName = name.trim();
        if (!trimmedName || busy) return;

        const normalizedTag = tag.trim() ? normalizeChannelTag(tag) : null;
        if (tag.trim() && !normalizedTag) {
            setTagError(_t("setka|channel|create_tag_invalid"));
            return;
        }
        setTagError(undefined);

        const client = MatrixClientPeg.safeGet();
        setBusy(true);
        try {
            await createRoom(client, {
                name: trimmedName,
                topic: formatChannelTopic(description, normalizedTag),
                encryption: false,
                guestAccess: false,
                joinRule: JoinRule.Public,
                createOpts: {
                    preset: Preset.PublicChat,
                    visibility: Visibility.Public,
                    room_alias_name: normalizedTag ?? undefined,
                    initial_state: [
                        {
                            type: "m.room.history_visibility",
                            state_key: "",
                            content: { history_visibility: HistoryVisibility.WorldReadable },
                        },
                    ],
                },
            });
            onFinished(true);
        } finally {
            setBusy(false);
        }
    }, [busy, description, name, onFinished, tag]);

    return (
        <BaseDialog
            className="mx_SetkaCreateChannelDialog"
            onFinished={onCancel}
            title={_t("setka|channel|create_title")}
            contentId="mx_SetkaCreateChannelDialog_content"
        >
            <div id="mx_SetkaCreateChannelDialog_content" className="mx_SetkaCreateChannelDialog_content">
                <Field
                    label={_t("setka|channel|create_name_label")}
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    autoFocus
                />
                <Field
                    label={_t("setka|channel|create_tag_label")}
                    value={tag}
                    onChange={(ev) => {
                        setTag(ev.target.value);
                        setTagError(undefined);
                    }}
                    autoComplete="off"
                />
                {tagError && <div className="mx_Field_error">{tagError}</div>}
                <Field
                    label={_t("setka|channel|create_description_label")}
                    value={description}
                    onChange={(ev) => setDescription(ev.target.value)}
                    element="textarea"
                    rows={3}
                />
            </div>
            <DialogButtons
                primaryButton={_t("setka|channel|create_submit")}
                onPrimaryButtonClick={() => void onCreate()}
                onCancel={onCancel}
                disabled={busy || !name.trim()}
            />
        </BaseDialog>
    );
};

export default SetkaCreateChannelDialog;
