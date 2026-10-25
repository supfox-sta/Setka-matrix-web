/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedRequest } from "./setkaHttp";

export type SetkaBotSummary = {
    bot_id: string;
    bot_user_id: string;
    username: string;
    display_name: string;
    webhook_url?: string | null;
    created_at: number;
};

export type SetkaBotCommand = {
    command: string;
    description: string;
};

export type SetkaBotReplyMarkup = {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
};

export async function listSetkaBots(client: MatrixClient): Promise<SetkaBotSummary[]> {
    const data = await setkaAuthedRequest<{ bots: SetkaBotSummary[] }>(
        client,
        Method.Get,
        "/setka/bots",
    );
    return data.bots ?? [];
}

export type SetkaBotCreateResult = {
    bot: SetkaBotSummary;
    token: string;
    matrix_user?: string;
    matrix_password?: string;
};

export async function createSetkaBot(
    client: MatrixClient,
    username: string,
    displayName: string,
): Promise<SetkaBotCreateResult> {
    const data = await setkaAuthedRequest<SetkaBotCreateResult>(client, Method.Post, "/setka/bots", {
        username,
        display_name: displayName,
    });
    return {
        bot: data.bot,
        token: data.token,
        matrix_user: data.matrix_user,
        matrix_password: data.matrix_password,
    };
}

export type SetkaBotMatrixPasswordResult = {
    matrix_user: string;
    matrix_password: string;
    bot_user_id: string;
};

export async function regenerateSetkaBotMatrixPassword(
    client: MatrixClient,
    botId: string,
): Promise<SetkaBotMatrixPasswordResult> {
    return await setkaAuthedRequest<SetkaBotMatrixPasswordResult>(
        client,
        Method.Post,
        `/setka/bots/${encodeURIComponent(botId)}/regenerate_matrix_password`,
    );
}

export async function deleteSetkaBot(client: MatrixClient, botId: string): Promise<void> {
    await setkaAuthedRequest(client, Method.Delete, `/setka/bots/${encodeURIComponent(botId)}`);
}

export async function setSetkaBotWebhook(
    client: MatrixClient,
    botId: string,
    url: string | null,
): Promise<void> {
    await setkaAuthedRequest(client, Method.Put, `/setka/bots/${encodeURIComponent(botId)}/webhook`, {
        url,
    });
}

export async function updateSetkaBot(
    client: MatrixClient,
    botId: string,
    update: { display_name?: string; webhook_url?: string | null },
): Promise<SetkaBotSummary> {
    const data = await setkaAuthedRequest<{ bot: SetkaBotSummary }>(
        client,
        Method.Put,
        `/setka/bots/${encodeURIComponent(botId)}`,
        update,
    );
    if (data.bot) return data.bot;
    if (update.webhook_url !== undefined) {
        await setSetkaBotWebhook(client, botId, update.webhook_url);
    }
    const bots = await listSetkaBots(client);
    const found = bots.find((bot) => bot.bot_id === botId);
    if (!found) throw new Error("Bot not found after update");
    return found;
}

export async function regenerateSetkaBotToken(client: MatrixClient, botId: string): Promise<string> {
    const data = await setkaAuthedRequest<{ token: string }>(
        client,
        Method.Post,
        `/setka/bots/${encodeURIComponent(botId)}/regenerate_token`,
    );
    return data.token;
}

export async function getSetkaBotCommands(client: MatrixClient, botId: string): Promise<SetkaBotCommand[]> {
    const data = await setkaAuthedRequest<{ commands: SetkaBotCommand[] }>(
        client,
        Method.Get,
        `/setka/bots/${encodeURIComponent(botId)}/commands`,
    );
    return data.commands ?? [];
}

export async function setSetkaBotCommands(
    client: MatrixClient,
    botId: string,
    commands: SetkaBotCommand[],
): Promise<void> {
    await setkaAuthedRequest(client, Method.Put, `/setka/bots/${encodeURIComponent(botId)}/commands`, {
        commands,
    });
}

export async function getSetkaBotReplyMarkup(
    client: MatrixClient,
    botId: string,
): Promise<SetkaBotReplyMarkup | null> {
    const data = await setkaAuthedRequest<{ reply_markup: SetkaBotReplyMarkup | null }>(
        client,
        Method.Get,
        `/setka/bots/${encodeURIComponent(botId)}/reply_markup`,
    );
    return data.reply_markup ?? null;
}

export async function setSetkaBotReplyMarkup(
    client: MatrixClient,
    botId: string,
    replyMarkup: SetkaBotReplyMarkup | null,
): Promise<void> {
    await setkaAuthedRequest(client, Method.Put, `/setka/bots/${encodeURIComponent(botId)}/reply_markup`, {
        reply_markup: replyMarkup,
    });
}

export async function submitSetkaBotCallback(
    client: MatrixClient,
    payload: {
        bot_user_id: string;
        event_id: string;
        callback_data: string;
    },
): Promise<void> {
    await setkaAuthedRequest(client, Method.Post, "/setka/bot/callback", payload);
}

/** Relay plaintext to the bot queue (required in E2EE rooms; same path as inline buttons). */
export async function submitSetkaBotMessage(
    client: MatrixClient,
    payload: {
        bot_user_id: string;
        event_id: string;
        text: string;
        msgtype?: string;
        url?: string;
    },
): Promise<void> {
    await setkaAuthedRequest(client, Method.Post, "/setka/bot/message", payload);
}
