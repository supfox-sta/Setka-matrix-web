/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { type MatrixClient, Method } from "matrix-js-sdk/src/matrix";

import { setkaAuthedJsonRequest } from "./setkaHttp";

export interface SetkaPlusSubscription {
    tier?: string;
    plan_name?: string;
    status?: string;
    is_active?: boolean;
    expires_at?: number;
    duration_days?: number;
}

export interface SetkaPlusPlan {
    id: string;
    name: string;
    price_rub: number;
    duration_days: number;
    features: string[];
    active: boolean;
    is_default?: boolean;
    sort_order?: number;
}

export interface SetkaPlusCheckoutConfig {
    payment_mode: string;
    checkout_enabled: boolean;
    vouchers_enabled: boolean;
    voucher_footer_text: string;
}

export interface SetkaPlusCatalog {
    plans: SetkaPlusPlan[];
    checkoutConfig: SetkaPlusCheckoutConfig;
}

export interface SetkaPlusVoucherRedemption {
    voucher_code: string;
    subscription: SetkaPlusSubscription;
}

interface PlansResponse {
    plans?: SetkaPlusPlan[];
    payment_mode?: string;
    checkout_enabled?: boolean;
    vouchers_enabled?: boolean;
    voucher_footer_text?: string;
}

function parseCheckoutConfig(data: PlansResponse): SetkaPlusCheckoutConfig {
    const paymentMode = data.payment_mode ?? "acquiring_and_vouchers";
    return {
        payment_mode: paymentMode,
        checkout_enabled: data.checkout_enabled ?? paymentMode !== "vouchers_only",
        vouchers_enabled: data.vouchers_enabled ?? true,
        voucher_footer_text: (data.voucher_footer_text ?? "").trim(),
    };
}

function parsePlan(plan: SetkaPlusPlan): SetkaPlusPlan | null {
    if (!plan.id || !plan.name || plan.price_rub <= 0 || plan.duration_days <= 0) {
        return null;
    }
    return {
        ...plan,
        features: (plan.features ?? []).filter(Boolean),
        active: plan.active !== false,
    };
}

export async function fetchSetkaPlusSubscription(
    client: MatrixClient,
    userId: string,
): Promise<SetkaPlusSubscription> {
    return setkaAuthedJsonRequest<SetkaPlusSubscription>(
        client,
        Method.Get,
        `/user/${encodeURIComponent(userId)}/setka_plus/subscription`,
    );
}

export async function fetchSetkaPlusCatalog(client: MatrixClient, userId: string): Promise<SetkaPlusCatalog> {
    const data = await setkaAuthedJsonRequest<PlansResponse>(
        client,
        Method.Get,
        `/user/${encodeURIComponent(userId)}/setka_plus/plans`,
    );
    const plans = (data.plans ?? [])
        .map(parsePlan)
        .filter((plan): plan is SetkaPlusPlan => plan !== null)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_rub - b.price_rub);
    return {
        plans,
        checkoutConfig: parseCheckoutConfig(data),
    };
}

export async function redeemSetkaPlusVoucher(
    client: MatrixClient,
    userId: string,
    code: string,
): Promise<SetkaPlusVoucherRedemption> {
    return setkaAuthedJsonRequest<SetkaPlusVoucherRedemption>(
        client,
        Method.Post,
        `/user/${encodeURIComponent(userId)}/setka_plus/vouchers/redeem`,
        { code: code.trim() },
    );
}

export function formatSetkaPlusVoucherError(error: unknown): string {
    const raw = String(error instanceof Error ? error.message : error).toLowerCase();
    if (raw.includes("not found") || raw.includes("не найден")) return "Промокод не найден";
    if (raw.includes("expired") || raw.includes("истёк") || raw.includes("истек")) {
        return "Срок действия промокода истёк";
    }
    if (raw.includes("limit reached") || raw.includes("максимальное число")) {
        return "Промокод уже использован максимальное число раз";
    }
    if (raw.includes("already redeemed") || raw.includes("уже активировали")) {
        return "Вы уже активировали этот промокод";
    }
    if (raw.includes("inactive") || raw.includes("недействител") || raw.includes("invalid voucher")) {
        return "Промокод недействителен";
    }
    return error instanceof Error && error.message ? error.message : "Не удалось активировать промокод";
}

export function formatSetkaPlusStatus(status?: string): string {
    switch (status?.toLowerCase()) {
        case "active":
            return "Активна";
        case "inactive":
            return "Не активна";
        case "pending":
            return "Ожидает оплаты";
        case "expired":
            return "Истекла";
        case "canceled":
            return "Отменена";
        default:
            return status?.trim() || "Не активна";
    }
}
