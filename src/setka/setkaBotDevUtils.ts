/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

export type SetkaBotCredentials = {
    homeserver: string;
    botUserId: string;
    apiToken?: string;
    matrixUser?: string;
    matrixPassword?: string;
};

export function formatSetkaBotKey(
    matrixUser: string,
    matrixPassword: string,
    apiToken: string,
): string {
    const user = matrixUser.replace(/^@/, "").split(":")[0];
    return `${user}:${matrixPassword}:${apiToken}`;
}

export function formatSetkaBotEnvFile(creds: SetkaBotCredentials): string {
    if (creds.matrixUser && creds.matrixPassword && creds.apiToken) {
        return `SETKA_BOT_KEY=${formatSetkaBotKey(creds.matrixUser, creds.matrixPassword, creds.apiToken)}`;
    }
    const lines: string[] = [];
    if (creds.apiToken) lines.push(`SETKA_BOT_TOKEN=${creds.apiToken}`);
    if (creds.matrixUser) lines.push(`SETKA_BOT_MATRIX_USER=${creds.matrixUser}`);
    if (creds.matrixPassword) lines.push(`SETKA_BOT_MATRIX_PASSWORD=${creds.matrixPassword}`);
    return lines.join("\n");
}

export function formatSetkaBotCreatorEnvFile(creds: SetkaBotCredentials, serviceToken?: string): string {
    const lines = [
        `SETKA_HOMESERVER=${creds.homeserver}`,
        `SETKA_BOTCREATOR_TOKEN=${creds.apiToken ?? ""}`,
    ];
    if (serviceToken) {
        lines.push(`SETKA_BOTCREATOR_SERVICE_TOKEN=${serviceToken}`);
    }
    if (creds.matrixUser) {
        lines.push(`SETKA_BOTCREATOR_MATRIX_USER=${creds.matrixUser}`);
    }
    if (creds.matrixPassword) {
        lines.push(`SETKA_BOTCREATOR_MATRIX_PASSWORD=${creds.matrixPassword}`);
    }
    lines.push("SETKA_BOTCREATOR_STATE=/var/lib/setka-botcreator/state.json");
    return lines.join("\n");
}

export function formatSetkaBotPythonQuickstart(creds: SetkaBotCredentials): string {
    const key =
        creds.matrixUser && creds.matrixPassword && creds.apiToken
            ? formatSetkaBotKey(creds.matrixUser, creds.matrixPassword, creds.apiToken)
            : "mybot_bot:password:setka_…";
    return `import asyncio
import aiohttp
from setka_bot import SetkaBot, SetkaBotClient

async def main():
    async with aiohttp.ClientSession() as http:
        bot = SetkaBot.from_env(http)

        async def on_message(msg):
            text = SetkaBotClient.message_text(msg)
            if text:
                await bot.send_message(msg["chat_id"], f"Echo: {text}")

        await bot.run(on_message)

asyncio.run(main())

# export SETKA_BOT_KEY=${key}`;
}
