/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useState } from "react";
import { Button, Text } from "@vector-im/compound-web";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import DialogButtons from "../components/views/elements/DialogButtons";

interface Props {
    onFinished: () => void;
}

const STEPS = ["download", "install", "done"] as const;

const SetkaAndroidDownloadDialog: React.FC<Props> = ({ onFinished }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const step = STEPS[stepIndex];

    const onNext = useCallback(() => {
        if (stepIndex >= STEPS.length - 1) {
            onFinished();
            return;
        }
        setStepIndex((value) => value + 1);
    }, [onFinished, stepIndex]);

    const onBack = useCallback(() => {
        if (stepIndex <= 0) return;
        setStepIndex((value) => value - 1);
    }, [stepIndex]);

    const imageSrc = `media/setka/android-install-${stepIndex + 1}.png`;

    return (
        <BaseDialog
            className="mx_SetkaAndroidDownloadDialog"
            onFinished={onFinished}
            title={_t("setka|download|android_title")}
            fixedWidth={false}
        >
            <div className="mx_SetkaAndroidDownloadDialog_body">
                <div className="mx_SetkaAndroidDownloadDialog_copy">
                    <Text size="lg" weight="semibold">
                        {_t(`setka|download|android_step_${step}_title`)}
                    </Text>
                    <Text size="md">{_t(`setka|download|android_step_${step}_body`)}</Text>
                    {step === "download" && (
                        <Button
                            kind="primary"
                            onClick={() => window.open("https://setka-matrix.ru", "_blank", "noopener,noreferrer")}
                        >
                            {_t("setka|download|android_open_site")}
                        </Button>
                    )}
                    <DialogButtons
                        primaryButton={_t(stepIndex === STEPS.length - 1 ? "action|ok" : "action|next")}
                        onPrimaryButtonClick={onNext}
                        hasCancel={stepIndex > 0}
                        cancelButton={_t("action|back")}
                        onCancel={onBack}
                    />
                </div>
                <div className="mx_SetkaAndroidDownloadDialog_preview">
                    <img src={imageSrc} alt="" />
                </div>
            </div>
        </BaseDialog>
    );
};

export default SetkaAndroidDownloadDialog;
