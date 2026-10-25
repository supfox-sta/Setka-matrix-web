/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect, useMemo, useState } from "react";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import DialogButtons from "../components/views/elements/DialogButtons";
import Field from "../components/views/elements/Field";
import { fileSize } from "../utils/FileUtils";

interface Props {
    files: File[];
    onFinished: (confirmed: boolean, caption?: string) => void;
}

interface PreviewItem {
    file: File;
    url: string;
}

const SetkaMediaBatchUploadDialog: React.FC<Props> = ({ files, onFinished }) => {
    const [caption, setCaption] = useState("");

    const previews = useMemo((): PreviewItem[] => {
        return files.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));
    }, [files]);

    useEffect(() => {
        return () => {
            for (const preview of previews) {
                URL.revokeObjectURL(preview.url);
            }
        };
    }, [previews]);

    const onCancel = (): void => onFinished(false);
    const onUpload = (): void => onFinished(true, caption.trim() || undefined);

    return (
        <BaseDialog
            className="mx_SetkaMediaBatchUploadDialog"
            onFinished={onCancel}
            title={_t("setka|upload|batch_title", { count: files.length })}
            contentId="mx_SetkaMediaBatchUploadDialog_content"
        >
            <div id="mx_SetkaMediaBatchUploadDialog_content">
                <p className="mx_SetkaMediaBatchUploadDialog_hint">{_t("setka|upload|batch_hint")}</p>
                <div className="mx_SetkaMediaBatchUploadDialog_grid">
                    {previews.map(({ file, url }) => (
                        <div key={`${file.name}-${file.size}`} className="mx_SetkaMediaBatchUploadDialog_item">
                            {file.type.startsWith("video/") ? (
                                <video src={url} playsInline muted className="mx_SetkaMediaBatchUploadDialog_thumb" />
                            ) : (
                                <img src={url} alt={file.name} className="mx_SetkaMediaBatchUploadDialog_thumb" />
                            )}
                            <span className="mx_SetkaMediaBatchUploadDialog_meta">
                                {file.name} ({fileSize(file.size)})
                            </span>
                        </div>
                    ))}
                </div>
                <Field
                    label={_t("setka|upload|caption_label")}
                    value={caption}
                    onChange={(ev) => setCaption(ev.target.value)}
                    element="textarea"
                    rows={2}
                />
            </div>
            <DialogButtons
                primaryButton={_t("action|upload")}
                onPrimaryButtonClick={onUpload}
                onCancel={onCancel}
            />
        </BaseDialog>
    );
};

export default SetkaMediaBatchUploadDialog;
