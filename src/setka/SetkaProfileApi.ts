/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, MatrixError, Method } from "matrix-js-sdk/src/matrix";

import { isRecoverableAuthError, setkaAuthedRequest } from "./setkaHttp";

export interface SetkaProfile {
    bio?: string;
    color?: string;
    badge_emoji_mxc?: string;
    status_emoji_mxc?: string;
    background_mxc?: string;
    background_is_video?: boolean;
}

export type SetkaProfileUpdate = Partial<Record<keyof SetkaProfile, string | boolean | null>>;

const EMPTY_PROFILE: SetkaProfile = {};
const profileCache = new Map<string, SetkaProfile>();
const profileMissCache = new Set<string>();

export const SETKA_STOCK_EMOJI_PACK_ID = "__setka_stock_emoji__";

export interface FetchSetkaProfileOptions {
    /** @deprecated Profile paths are chosen automatically from the viewed user. */
    allowProfileFieldFallback?: boolean;
}

function profilePath(userId: string): string {
    return `/user/${encodeURIComponent(userId)}/setka_profile`;
}

function profileCandidatePaths(userId: string, isSelf: boolean): string[] {
    const encoded = encodeURIComponent(userId);
    if (isSelf) {
        return [`/setka/users/${encoded}/profile`, `/user/${encoded}/setka_profile`];
    }
    return [
        `/setka/users/${encoded}/profile`,
        `/profile/${encoded}/setka_profile`,
        `/profile/${userId}/setka_profile`,
    ];
}

function pickBool(payload: Record<string, unknown>, key: string): boolean | undefined {
    const value = payload[key];
    if (value === true || value === 1 || value === "1" || value === "true") return true;
    if (value === false || value === 0 || value === "0" || value === "false") return false;
    return undefined;
}

function pickString(payload: Record<string, unknown>, key: string): string | undefined {
    const value = payload[key];
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}

export function parseSetkaProfileResponse(data: unknown): SetkaProfile {
    if (!data || typeof data !== "object") {
        return { ...EMPTY_PROFILE };
    }

    const raw = data as Record<string, unknown>;
    let payload: Record<string, unknown> = raw;

    if (raw.profile && typeof raw.profile === "object") {
        payload = raw.profile as Record<string, unknown>;
    } else if (raw.user && typeof raw.user === "object") {
        const user = raw.user as Record<string, unknown>;
        if (user.profile && typeof user.profile === "object") {
            payload = user.profile as Record<string, unknown>;
        }
    }

    return {
        bio: pickString(payload, "bio"),
        color: pickString(payload, "color"),
        badge_emoji_mxc: pickString(payload, "badge_emoji_mxc"),
        status_emoji_mxc: pickString(payload, "status_emoji_mxc"),
        background_mxc: pickString(payload, "background_mxc"),
        background_is_video: pickBool(payload, "background_is_video"),
    };
}

export function hasUsefulSetkaProfile(profile: SetkaProfile): boolean {
    return Boolean(
        profile.bio ||
            profile.color ||
            profile.badge_emoji_mxc ||
            profile.status_emoji_mxc ||
            profile.background_mxc ||
            profile.background_is_video,
    );
}

export async function fetchSetkaProfile(
    client: MatrixClient,
    userId: string,
    _options: FetchSetkaProfileOptions = {},
): Promise<SetkaProfile> {
    if (!client.getAccessToken()) {
        return { ...EMPTY_PROFILE };
    }

    const isSelf = client.getUserId() === userId;

    if (profileMissCache.has(userId)) {
        return { ...EMPTY_PROFILE };
    }

    const cached = profileCache.get(userId);
    if (cached && hasUsefulSetkaProfile(cached)) {
        return { ...cached };
    }

    const paths = profileCandidatePaths(userId, isSelf);
    let lastProfile: SetkaProfile = { ...EMPTY_PROFILE };
    let saw404 = false;

    for (const path of paths) {
        try {
            const data = await setkaAuthedRequest<unknown>(client, Method.Get, path);
            const profile = parseSetkaProfileResponse(data);
            lastProfile = profile;
            if (hasUsefulSetkaProfile(profile)) {
                profileCache.set(userId, profile);
                profileMissCache.delete(userId);
                return { ...profile };
            }
        } catch (error) {
            if (error instanceof MatrixError && (error.httpStatus === 404 || error.httpStatus === 403)) {
                saw404 = true;
                continue;
            }
            if (isRecoverableAuthError(error)) {
                continue;
            }
            throw error;
        }
    }

    profileCache.set(userId, lastProfile);
    if (saw404 && !hasUsefulSetkaProfile(lastProfile)) {
        profileMissCache.add(userId);
    }
    return { ...lastProfile };
}

export async function saveSetkaProfile(
    client: MatrixClient,
    userId: string,
    update: SetkaProfileUpdate,
): Promise<SetkaProfile> {
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(update)) {
        if (value !== undefined && value !== null) {
            body[key] = typeof value === "boolean" ? (value ? "true" : "false") : value;
        } else if (value === null) {
            body[key] = "";
        }
    }

    const isSelf = client.getUserId() === userId;
    const paths = isSelf ? profileCandidatePaths(userId, true) : [profilePath(userId)];
    let lastError: unknown;

    for (const path of paths) {
        try {
            const saved = await setkaAuthedRequest<unknown>(client, Method.Put, path, body);
            const profile = parseSetkaProfileResponse(saved);
            // Merge local update so UI reflects immediately even if response is sparse.
            const merged: SetkaProfile = {
                ...profile,
                bio: update.bio !== undefined ? (update.bio as string | null) || undefined : profile.bio,
                color: update.color !== undefined ? (update.color as string | null) || undefined : profile.color,
                background_mxc:
                    update.background_mxc !== undefined
                        ? (update.background_mxc as string | null) || undefined
                        : profile.background_mxc,
                background_is_video:
                    update.background_is_video !== undefined
                        ? update.background_is_video === null
                            ? undefined
                            : Boolean(update.background_is_video)
                        : profile.background_is_video,
                status_emoji_mxc:
                    update.status_emoji_mxc !== undefined
                        ? (update.status_emoji_mxc as string | null) || undefined
                        : profile.status_emoji_mxc,
                badge_emoji_mxc:
                    update.badge_emoji_mxc !== undefined
                        ? (update.badge_emoji_mxc as string | null) || undefined
                        : profile.badge_emoji_mxc,
            };
            profileCache.set(userId, merged);
            profileMissCache.delete(userId);
            return { ...merged };
        } catch (error) {
            lastError = error;
            if (error instanceof MatrixError && (error.httpStatus === 404 || error.httpStatus === 405)) {
                continue;
            }
            if (isRecoverableAuthError(error)) {
                continue;
            }
            throw error;
        }
    }

    if (lastError) throw lastError;
    throw new Error("Failed to save Setka profile");
}

export function invalidateSetkaProfileCache(userId?: string): void {
    if (userId) {
        profileCache.delete(userId);
        profileMissCache.delete(userId);
        return;
    }
    profileCache.clear();
    profileMissCache.clear();
}
