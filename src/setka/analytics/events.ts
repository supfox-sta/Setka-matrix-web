/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

/** Canonical Setka business analytics events (PostHog + Synapse server sync). */
export const SetkaAnalyticsEvents = {
    SessionActive: "session.active",
    UserRegistered: "user.registered",
    LoginVerified: "login.verified",
    LoginFallbackEmoji: "login.fallback.emoji",
    LoginFallbackRecoveryKey: "login.fallback.recovery_key",
    LoginSkeySilentSuccess: "login.skey.silent_success",
    LoginSkeySilentFailed: "login.skey.silent_failed",
    SkeyEnabled: "skey.enabled",
    SkeyDisabled: "skey.disabled",
    PlusCheckoutStarted: "plus.checkout_started",
    PlusPaymentCreated: "plus.payment_created",
    PlusPaymentPaid: "plus.payment_paid",
    PlusSubscriptionActivated: "plus.subscription_activated",
    ChannelPublished: "channel.published",
    ChannelJoined: "channel.joined",
    ChannelDiscoveryViewed: "channel.discovery_viewed",
    ScreenViewed: "screen.viewed",
    FeatureUsed: "feature.used",
} as const;

export type SetkaAnalyticsEventName = (typeof SetkaAnalyticsEvents)[keyof typeof SetkaAnalyticsEvents];

export type SetkaAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export interface SetkaAnalyticsConfig {
    enabled?: boolean;
    /** Mirror events to Synapse POST /setka/analytics/capture */
    serverSync?: boolean;
}

export interface SetkaAnalyticsEventPayload {
    event_name: SetkaAnalyticsEventName | string;
    properties?: SetkaAnalyticsProperties;
    ts?: number;
}
