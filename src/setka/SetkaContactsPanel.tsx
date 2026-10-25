/*

Copyright 2026 Setka Matrix



SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import React, { useCallback, useEffect, useState } from "react";

import {

    ClientEvent,

    type MatrixClient,

    RoomEvent,

    RoomStateEvent,

    UserEvent,

} from "matrix-js-sdk/src/matrix";

import { logger } from "matrix-js-sdk/src/logger";

import EditIcon from "@vector-im/compound-design-tokens/assets/web/icons/edit";

import DeleteIcon from "@vector-im/compound-design-tokens/assets/web/icons/delete";



import { _t, getCurrentLanguage } from "../languageHandler";

import AccessibleButton from "../components/views/elements/AccessibleButton";

import BaseAvatar from "../components/views/avatars/BaseAvatar";

import { mediaFromMxc } from "../customisations/Media";

import defaultDispatcher from "../dispatcher/dispatcher";

import { Action } from "../dispatcher/actions";

import Modal from "../Modal";

import QuestionDialog from "../components/views/dialogs/QuestionDialog";

import {

    deleteSetkaContact,

    type SetkaContactEntry,

} from "./SetkaContactsApi";
import { fetchSetkaProfile } from "./SetkaProfileApi";
import { setkaContactsStore } from "./setkaContactsStore";
import { SetkaMxcBackground, SetkaMxcAvatar } from "./SetkaMxcMedia";
import { isSetkaMxcVideo } from "./setkaMxcMediaUtils";

import SetkaContactEditDialog from "./SetkaContactEditDialog";

import Spinner from "../components/views/elements/Spinner";



interface EnrichedContact extends SetkaContactEntry {

    userId?: string;

    avatarUrl?: string;

    resolvedName: string;

    statusEmojiMxc?: string;

    backgroundMxc?: string;

    backgroundIsVideo?: boolean;

}



interface Props {

    client: MatrixClient;

}



function resolveContact(client: MatrixClient, entry: SetkaContactEntry): EnrichedContact {

    const room = client.getRoom(entry.roomId);

    let userId: string | undefined;

    let avatarUrl: string | undefined;

    let resolvedName = entry.roomId;



    if (room) {

        const member = room.getMembers().find((m) => m.userId !== client.getUserId());

        if (member) {

            userId = member.userId;

            avatarUrl = member.getMxcAvatarUrl() ?? undefined;

        }

    }



    const savedName = entry.displayName?.trim();

    const matrixUser = userId ? client.getUser(userId) : undefined;

    resolvedName =

        savedName ||

        matrixUser?.displayName ||

        room?.getMembers().find((m) => m.userId === userId)?.name ||

        userId ||

        entry.roomId;



    return { ...entry, userId, avatarUrl, resolvedName };

}



const SetkaContactsPanel: React.FC<Props> = ({ client }) => {

    const userId = client.getUserId()!;

    const [contacts, setContacts] = useState<EnrichedContact[]>([]);

    const [loading, setLoading] = useState(true);



    const loadContacts = useCallback(async () => {

        try {

            await setkaContactsStore.refresh(client, userId);

            const raw = setkaContactsStore.getContacts();

            const enriched = await Promise.all(
                raw.map(async (entry) => {
                    const base = resolveContact(client, entry);
                    if (!base.userId) return base;
                    try {
                        const profile = await fetchSetkaProfile(client, base.userId, {
                            allowProfileFieldFallback: false,
                        });
                        return {
                            ...base,
                            statusEmojiMxc: profile.status_emoji_mxc ?? base.statusEmojiMxc,
                            backgroundMxc: profile.background_mxc,
                            backgroundIsVideo:
                                Boolean(profile.background_is_video) ||
                                isSetkaMxcVideo(profile.background_mxc),
                        };
                    } catch {
                        return base;
                    }
                }),
            );

            enriched.sort((a, b) => a.resolvedName.localeCompare(b.resolvedName, getCurrentLanguage()));

            setContacts(enriched);

        } catch (e) {

            logger.warn("Failed to load Setka contacts", e);

            setContacts([]);

        } finally {

            setLoading(false);

        }

    }, [client, userId]);



    useEffect(() => {

        void loadContacts();

    }, [loadContacts]);



    useEffect(() => {

        let timer: number | undefined;

        const scheduleRefresh = (): void => {

            window.clearTimeout(timer);

            timer = window.setTimeout(() => {

                void loadContacts();

            }, 400);

        };



        client.on(ClientEvent.Room, scheduleRefresh);

        client.on(RoomEvent.Name, scheduleRefresh);

        client.on(RoomStateEvent.Members, scheduleRefresh);

        client.on(UserEvent.DisplayName, scheduleRefresh);

        client.on(UserEvent.AvatarUrl, scheduleRefresh);



        return () => {

            window.clearTimeout(timer);

            client.removeListener(ClientEvent.Room, scheduleRefresh);

            client.removeListener(RoomEvent.Name, scheduleRefresh);

            client.removeListener(RoomStateEvent.Members, scheduleRefresh);

            client.removeListener(UserEvent.DisplayName, scheduleRefresh);

            client.removeListener(UserEvent.AvatarUrl, scheduleRefresh);

        };

    }, [client, loadContacts]);



    const onContactClick = (contact: EnrichedContact): void => {

        defaultDispatcher.dispatch({ action: Action.ViewRoom, room_id: contact.roomId });

    };



    const onStartChat = (): void => {

        defaultDispatcher.fire(Action.CreateChat);

    };



    const onEditContact = (contact: EnrichedContact): void => {

        const { finished } = Modal.createDialog(

            SetkaContactEditDialog,

            {

                client,

                contact: {

                    roomId: contact.roomId,

                    displayName: contact.displayName ?? contact.resolvedName,

                    email: contact.email,

                    phone: contact.phone,

                },

            },

            "mx_SetkaContactEditDialog",

        );

        finished.then((saved) => {

            if (saved) void loadContacts();

        });

    };



    const onDeleteContact = (contact: EnrichedContact): void => {

        const { finished } = Modal.createDialog(QuestionDialog, {

            title: _t("setka|contacts|delete_title"),

            description: _t("setka|contacts|delete_description", { name: contact.resolvedName }),

            button: _t("action|delete"),

            danger: true,

            hasCancelButton: true,

        });

        finished.then(async (confirmed) => {

            if (!confirmed) return;

            try {

                await deleteSetkaContact(client, userId, contact.roomId);

                void loadContacts();

            } catch (e) {

                logger.warn("Failed to delete Setka contact", e);

            }

        });

    };



    if (loading) {

        return (

            <div className="mx_SetkaContactsPanel mx_SetkaContactsPanel_loading">

                <Spinner />

            </div>

        );

    }



    return (

        <div className="mx_SetkaContactsPanel">

            <div className="mx_SetkaContactsPanel_header">

                <span>{_t("setka|contacts|title")}</span>

                <AccessibleButton kind="primary_outline" onClick={onStartChat}>

                    {_t("setka|contacts|add")}

                </AccessibleButton>

            </div>



            {contacts.length === 0 ? (

                <div className="mx_SetkaContactsPanel_empty">{_t("setka|contacts|empty")}</div>

            ) : (

                <div className="mx_SetkaContactsPanel_list">

                    {contacts.map((contact) => {

                        const statusUrl = contact.statusEmojiMxc

                            ? client.mxcUrlToHttp(contact.statusEmojiMxc, 20, 20, "crop")

                            : null;

                        const avatarMxc = contact.avatarUrl;

                        return (
                            <div
                                key={contact.roomId}
                                className="mx_SetkaContactsPanel_rowWrap"
                            >
                                {contact.backgroundMxc && (
                                    <SetkaMxcBackground
                                        client={client}
                                        mxc={contact.backgroundMxc}
                                        className="mx_SetkaContactsPanel_cover"
                                        forceVideo={Boolean(contact.backgroundIsVideo)}
                                    />
                                )}
                                <AccessibleButton
                                    className="mx_SetkaContactsPanel_row"
                                    onClick={() => onContactClick(contact)}
                                >

                                    <div className="mx_SetkaContactsPanel_avatar">
                                        {avatarMxc ? (
                                            <SetkaMxcAvatar
                                                client={client}
                                                mxc={avatarMxc}
                                                className="mx_SetkaContactsPanel_avatarVideo"
                                                size={36}
                                            />
                                        ) : (
                                            <BaseAvatar
                                                size="36px"
                                                name={contact.resolvedName}
                                                idName={contact.userId ?? contact.roomId}
                                            />
                                        )}
                                    </div>

                                    <div className="mx_SetkaContactsPanel_rowText">

                                        <div className="mx_SetkaContactsPanel_name">

                                            {contact.resolvedName}

                                            {statusUrl && (

                                                <img

                                                    className="mx_SetkaContactsPanel_status"

                                                    src={statusUrl}

                                                    alt=""

                                                />

                                            )}

                                        </div>

                                        <div

                                            className={

                                                "mx_SetkaContactsPanel_sub" +

                                                (contact.backgroundMxc ? " mx_SetkaContactsPanel_sub_onCover" : "")

                                            }

                                        >

                                            {contact.userId ?? contact.email ?? contact.phone}

                                        </div>

                                    </div>

                                </AccessibleButton>

                                <div className="mx_SetkaContactsPanel_actions">

                                    <AccessibleButton

                                        kind="icon"

                                        className="mx_SetkaContactsPanel_actionBtn"

                                        title={_t("action|edit")}

                                        onClick={() => onEditContact(contact)}

                                    >

                                        <EditIcon width={16} height={16} />

                                    </AccessibleButton>

                                    <AccessibleButton

                                        kind="icon"

                                        className="mx_SetkaContactsPanel_actionBtn mx_SetkaContactsPanel_actionBtn_danger"

                                        title={_t("action|delete")}

                                        onClick={() => onDeleteContact(contact)}

                                    >

                                        <DeleteIcon width={16} height={16} />

                                    </AccessibleButton>

                                </div>

                            </div>

                        );

                    })}

                </div>

            )}

        </div>

    );

};



export default SetkaContactsPanel;

