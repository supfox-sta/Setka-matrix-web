/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import Modal from "../Modal";
import { mediaFromMxc } from "../customisations/Media";
import SetkaEmojiPickerDialog from "./SetkaEmojiPickerDialog";

interface Props {
    client: MatrixClient;
    label: string;
    value: string;
    onChange: (mxc: string) => void;
}

const SetkaEmojiPickerField: React.FC<Props> = ({ client, label, value, onChange }) => {
    const previewUrl = value ? mediaFromMxc(value).getSquareThumbnailHttp(48) : undefined;

    const onPick = useCallback(() => {
        const { finished } = Modal.createDialog(
            SetkaEmojiPickerDialog,
            {
                client,
                title: label,
                selectedMxc: value || undefined,
            },
            "mx_SetkaEmojiPickerDialog",
        );
        finished.then((args) => {
            if (args.length > 0) {
                onChange(args[0] ?? "");
            }
        });
    }, [client, label, onChange, value]);

    const onClear = useCallback(() => onChange(""), [onChange]);

    return (
        <div className="mx_SetkaEmojiPickerField">
            <div className="mx_SetkaEmojiPickerField_label">{label}</div>
            <div className="mx_SetkaEmojiPickerField_row">
                <button type="button" className="mx_SetkaEmojiPickerField_preview" onClick={onPick}>
                    {previewUrl ? (
                        <img src={previewUrl} alt="" />
                    ) : (
                        <span className="mx_SetkaEmojiPickerField_placeholder">{_t("setka|emoji|pick")}</span>
                    )}
                </button>
                <AccessibleButton kind="secondary" onClick={onPick}>
                    {_t("setka|emoji|choose")}
                </AccessibleButton>
                {value && (
                    <AccessibleButton kind="secondary" onClick={onClear}>
                        {_t("action|remove")}
                    </AccessibleButton>
                )}
            </div>
        </div>
    );
};

export default SetkaEmojiPickerField;
