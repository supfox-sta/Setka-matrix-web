/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { isSetkaHomeserver } from "./SetkaConfig";
import { consumeSetkaAppEnterPending, runSetkaAppEnterAnimation } from "./setkaAppEnter";

interface Props {
    client: MatrixClient;
}

/** One-shot zoom-in when the main UI appears after the startup splash. */
const SetkaAppEnterHost: React.FC<Props> = ({ client }) => {
    const enabled = isSetkaHomeserver(client);

    useEffect(() => {
        if (!enabled) return;

        let shouldAnimate = consumeSetkaAppEnterPending();
        if (!shouldAnimate) {
            try {
                shouldAnimate = sessionStorage.getItem("setka_entered") !== "1";
                if (shouldAnimate) sessionStorage.setItem("setka_entered", "1");
            } catch {
                shouldAnimate = true;
            }
        }

        if (!shouldAnimate) return;

        const frame = window.requestAnimationFrame(() => runSetkaAppEnterAnimation());
        return () => window.cancelAnimationFrame(frame);
    }, [enabled]);

    return null;
};

export default SetkaAppEnterHost;
