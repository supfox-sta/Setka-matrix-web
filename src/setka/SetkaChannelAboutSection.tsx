/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React from "react";
import { type Room } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import { getSetkaChannelDescription, isSetkaChannelRoom } from "./setkaChannelUtils";

interface Props {
    room: Room;
}

const SetkaChannelAboutSection: React.FC<Props> = ({ room }) => {
    if (!isSetkaChannelRoom(room)) return null;

    const memberCount = room.getJoinedMemberCount();
    const description = getSetkaChannelDescription(room);

    return (
        <section className="mx_SetkaChannelAboutSection" aria-label={_t("setka|channel|about_title")}>
            <h3 className="mx_SetkaChannelAboutSection_title">{_t("setka|channel|about_title")}</h3>
            <div className="mx_SetkaChannelAboutSection_card">
                <p className="mx_SetkaChannelAboutSection_subscribers">
                    {_t("setka|channel|subscribers", { count: memberCount })}
                </p>
                <p className="mx_SetkaChannelAboutSection_label">{_t("setka|channel|description_label")}</p>
                <p className="mx_SetkaChannelAboutSection_description">
                    {description || _t("setka|channel|description_empty")}
                </p>
            </div>
        </section>
    );
};

export default SetkaChannelAboutSection;
