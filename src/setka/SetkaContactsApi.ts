/*

Copyright 2026 Setka Matrix



SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only

*/



import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";



import { isRecoverableAuthError, setkaAuthedRequest } from "./setkaHttp";



export interface SetkaContactEntry {

    roomId: string;

    displayName?: string;

    email?: string;

    phone?: string;

}



interface ContactListResponse {

    rooms?: Record<

        string,

        {

            display_name?: string;

            email?: string;

            phone?: string;

        }

    >;

}



function contactListPath(userId: string, roomId?: string): string {

    const base = `/user/${encodeURIComponent(userId)}/contact_list`;

    if (!roomId) return base;

    return `${base}/rooms/${encodeURIComponent(roomId)}`;

}



export async function fetchSetkaContacts(client: MatrixClient, userId: string): Promise<SetkaContactEntry[]> {

    if (!client.getAccessToken()) {

        return [];

    }



    try {

        const data = await setkaAuthedRequest<ContactListResponse>(client, Method.Get, contactListPath(userId));

        const rooms = data.rooms ?? {};

        return Object.entries(rooms).map(([roomId, entry]) => ({

            roomId,

            displayName: entry.display_name,

            email: entry.email,

            phone: entry.phone,

        }));

    } catch (error) {

        if (isRecoverableAuthError(error)) {

            return [];

        }

        throw error;

    }

}



export async function saveSetkaContact(

    client: MatrixClient,

    userId: string,

    roomId: string,

    update: { displayName?: string; email?: string; phone?: string },

): Promise<void> {

    const body: Record<string, string> = {};

    if (update.displayName !== undefined) body.display_name = update.displayName;

    if (update.email !== undefined) body.email = update.email;

    if (update.phone !== undefined) body.phone = update.phone;

    await setkaAuthedRequest(client, Method.Put, contactListPath(userId, roomId), body);

}



export async function deleteSetkaContact(client: MatrixClient, userId: string, roomId: string): Promise<void> {

    await setkaAuthedRequest(client, Method.Delete, contactListPath(userId, roomId));

}

