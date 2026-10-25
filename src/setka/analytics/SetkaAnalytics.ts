/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import posthog from "posthog-js";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { PosthogAnalytics } from "../../PosthogAnalytics";
import SdkConfig from "../../SdkConfig";
import { setkaAuthedJsonRequest } from "../setkaHttp";
import { isSetkaHomeserver } from "../SetkaConfig";
import {
    type SetkaAnalyticsConfig,
    type SetkaAnalyticsEventName,
    type SetkaAnalyticsProperties,
} from "./events";
import { Method } from "matrix-js-sdk/src/matrix";

const PLATFORM = "web";
const pendingEvents: Array<{ event_name: string; properties: SetkaAnalyticsProperties; ts: number }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 10_000;
const MAX_BATCH = 25;

function getConfig(): SetkaAnalyticsConfig {
    return SdkConfig.get("setka_analytics") ?? {};
}

function isEnabled(client?: MatrixClient | null): boolean {
    const cfg = getConfig();
    if (cfg.enabled === false) return false;
    if (!isSetkaHomeserver(client) && cfg.enabled !== true) return false;
    if (cfg.serverSync === true) return true;
    try {
        return cfg.enabled === true || PosthogAnalytics.instance.isEnabled();
    } catch {
        return cfg.enabled === true;
    }
}

function capturePosthog(eventName: string, properties: SetkaAnalyticsProperties): void {
    try {
        if (!PosthogAnalytics.instance.isEnabled()) return;
        posthog.capture(eventName, {
            ...properties,
            setka_platform: PLATFORM,
        });
    } catch (error) {
        logger.warn("Setka PostHog capture failed", error);
    }
}

function scheduleFlush(client: MatrixClient): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushToServer(client);
    }, FLUSH_MS);
}

async function flushToServer(client: MatrixClient): Promise<void> {
    const cfg = getConfig();
    if (!cfg.serverSync || pendingEvents.length === 0) return;

    const batch = pendingEvents.splice(0, MAX_BATCH);
    try {
        await setkaAuthedJsonRequest<{ recorded?: number }>(
            client,
            Method.Post,
            "/setka/analytics/capture",
            {
                platform: PLATFORM,
                app_version: "setka-web",
                events: batch,
            },
        );
    } catch (error) {
        logger.warn("Setka analytics server sync failed", error);
        pendingEvents.unshift(...batch);
    }
}

/**
 * Track a Setka business event to PostHog (if enabled) and queue for Synapse BI sync.
 */
export function trackSetkaEvent(
    client: MatrixClient | null | undefined,
    eventName: SetkaAnalyticsEventName | string,
    properties: SetkaAnalyticsProperties = {},
): void {
    if (!client || !isEnabled(client)) return;

    capturePosthog(eventName, properties);

    const cfg = getConfig();
    if (cfg.serverSync) {
        pendingEvents.push({
            event_name: eventName,
            properties,
            ts: Date.now(),
        });
        if (pendingEvents.length >= MAX_BATCH) {
            void flushToServer(client);
        } else {
            scheduleFlush(client);
        }
    }
}

/** Call after login when session is ready — records session.active */
export function trackSetkaSession(client: MatrixClient | null | undefined): void {
    trackSetkaEvent(client, "session.active", {});
    const cfg = getConfig();
    if (client && cfg.serverSync) {
        void flushSetkaAnalytics(client);
    }
}

export async function flushSetkaAnalytics(client: MatrixClient): Promise<void> {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    await flushToServer(client);
}
