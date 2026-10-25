/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MouseEvent } from "react";

import { MatrixClientPeg } from "../MatrixClientPeg";
import { isSetkaHomeserver } from "./SetkaConfig";

/** Block Chrome's native image/video context menu; Element's menu still opens on the tile. */
export function preventSetkaNativeMediaContextMenu(event: MouseEvent): void {
    const client = MatrixClientPeg.get();
    if (!client || !isSetkaHomeserver(client)) {
        return;
    }
    event.preventDefault();
}
