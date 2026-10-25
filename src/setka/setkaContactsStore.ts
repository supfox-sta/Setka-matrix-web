/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { EventEmitter } from "events";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { fetchSetkaContacts, type SetkaContactEntry } from "./SetkaContactsApi";
import { isSetkaHomeserver } from "./SetkaConfig";

export const SETKA_CONTACTS_UPDATE_EVENT = "setkaContactsUpdate";

type SetkaContactsListener = () => void;

const setkaContactsListeners = new Set<SetkaContactsListener>();
let storeListenerAttached = false;

function notifySetkaContactsListeners(): void {
    for (const listener of setkaContactsListeners) {
        listener();
    }
}

function ensureSetkaContactsStoreListener(store: SetkaContactsStore): void {
    if (storeListenerAttached) {
        return;
    }
    storeListenerAttached = true;
    store.on(SETKA_CONTACTS_UPDATE_EVENT, notifySetkaContactsListeners);
}

/** Subscribe to Setka contact changes without attaching per-component listeners to the store. */
export function subscribeSetkaContacts(listener: SetkaContactsListener): () => void {
    ensureSetkaContactsStoreListener(setkaContactsStore);
    setkaContactsListeners.add(listener);
    return () => {
        setkaContactsListeners.delete(listener);
    };
}

class SetkaContactsStore extends EventEmitter {
    private contactsByRoomId = new Map<string, SetkaContactEntry>();
    private loadedForUserId: string | null = null;
    private isLoaded = false;
    private loading: Promise<void> | null = null;

    public getContacts(): SetkaContactEntry[] {
        return [...this.contactsByRoomId.values()];
    }

    public getContactDisplayName(roomId: string): string | undefined {
        const name = this.contactsByRoomId.get(roomId)?.displayName?.trim();
        return name || undefined;
    }

    public async ensureLoaded(client: MatrixClient): Promise<void> {
        const userId = client.getUserId();
        if (!userId || !isSetkaHomeserver(client)) {
            return;
        }
        if (this.isLoaded && this.loadedForUserId === userId) {
            return;
        }
        if (this.loading) {
            await this.loading;
            return;
        }
        this.loading = this.refresh(client, userId);
        try {
            await this.loading;
        } finally {
            this.loading = null;
        }
    }

    public async refresh(client: MatrixClient, userId?: string): Promise<void> {
        const uid = userId ?? client.getUserId();
        if (!uid || !isSetkaHomeserver(client)) {
            this.contactsByRoomId.clear();
            this.loadedForUserId = null;
            this.emit(SETKA_CONTACTS_UPDATE_EVENT);
            return;
        }
        const contacts = await fetchSetkaContacts(client, uid);
        this.contactsByRoomId = new Map(contacts.map((entry) => [entry.roomId, entry]));
        this.loadedForUserId = uid;
        this.isLoaded = true;
        this.emit(SETKA_CONTACTS_UPDATE_EVENT);
    }

    public invalidate(): void {
        this.loadedForUserId = null;
        this.isLoaded = false;
        this.contactsByRoomId.clear();
        this.emit(SETKA_CONTACTS_UPDATE_EVENT);
    }
}

export const setkaContactsStore = new SetkaContactsStore();
