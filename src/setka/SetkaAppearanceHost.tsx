/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { isSetkaHomeserver } from "./SetkaConfig";
import {
    applySetkaAppearanceToDocument,
    readSetkaAppearance,
    subscribeSetkaAppearance,
} from "./setkaAppearanceStore";

interface Props {
    client: MatrixClient;
}

const SetkaAppearanceHost: React.FC<Props> = ({ client }) => {
    const enabled = isSetkaHomeserver(client);

    useEffect(() => {
        if (!enabled) return;
        applySetkaAppearanceToDocument(readSetkaAppearance());
        return subscribeSetkaAppearance(applySetkaAppearanceToDocument);
    }, [enabled]);

    return null;
};

export default SetkaAppearanceHost;
