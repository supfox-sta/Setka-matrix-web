/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Button, ErrorMessage } from "@vector-im/compound-web";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { FavouriteIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../languageHandler";
import BaseDialog from "../components/views/dialogs/BaseDialog";
import DialogButtons from "../components/views/elements/DialogButtons";
import InlineSpinner from "../components/views/elements/InlineSpinner";
import Field from "../components/views/elements/Field";
import { SetkaAnalyticsEvents } from "./analytics/events";
import { trackSetkaEvent } from "./analytics/SetkaAnalytics";
import {
    fetchSetkaPlusCatalog,
    fetchSetkaPlusSubscription,
    formatSetkaPlusStatus,
    formatSetkaPlusVoucherError,
    redeemSetkaPlusVoucher,
    type SetkaPlusSubscription,
} from "./SetkaPlusApi";

interface Props {
    client: MatrixClient;
    onFinished: () => void;
}

const SetkaPlusDialog: React.FC<Props> = ({ client, onFinished }) => {
    const userId = client.getUserId()!;
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<SetkaPlusSubscription | null>(null);
    const [voucherFooter, setVoucherFooter] = useState("");
    const [voucherCode, setVoucherCode] = useState("");
    const [redeeming, setRedeeming] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [noticeSuccess, setNoticeSuccess] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sub, catalog] = await Promise.all([
                fetchSetkaPlusSubscription(client, userId),
                fetchSetkaPlusCatalog(client, userId),
            ]);
            setSubscription(sub);
            setVoucherFooter(catalog.checkoutConfig.voucher_footer_text);
        } catch {
            setSubscription({ is_active: false, status: "inactive" });
            setVoucherFooter("");
        } finally {
            setLoading(false);
        }
    }, [client, userId]);

    useEffect(() => {
        trackSetkaEvent(client, SetkaAnalyticsEvents.ScreenViewed, { screen: "setka_plus" });
        void load();
    }, [client, load]);

    const onRedeem = useCallback(async () => {
        const code = voucherCode.trim();
        if (!code) {
            setNotice(_t("setka|plus|voucher_empty"));
            setNoticeSuccess(false);
            return;
        }
        setRedeeming(true);
        setNotice(null);
        try {
            const result = await redeemSetkaPlusVoucher(client, userId, code);
            setSubscription(result.subscription);
            setVoucherCode("");
            setNotice(_t("setka|plus|voucher_success"));
            setNoticeSuccess(true);
        } catch (error) {
            setNotice(formatSetkaPlusVoucherError(error));
            setNoticeSuccess(false);
        } finally {
            setRedeeming(false);
        }
    }, [client, userId, voucherCode]);

    const active = Boolean(subscription?.is_active);

    return (
        <BaseDialog
            className="mx_SetkaPlusDialog"
            onFinished={onFinished}
            title={_t("setka|plus|title")}
            contentId="mx_SetkaPlusDialog_content"
        >
            <div className="mx_Dialog_content mx_SetkaPlusDialog_content" id="mx_SetkaPlusDialog_content">
                <div className="mx_SetkaPlusDialog_icon">
                    <FavouriteIcon width={32} height={32} />
                </div>
                {loading ? (
                    <InlineSpinner />
                ) : (
                    <>
                        <div className="mx_SetkaPlusDialog_status">
                            <span className="mx_SetkaPlusDialog_statusLabel">{_t("setka|plus|status_label")}</span>
                            <strong>{formatSetkaPlusStatus(subscription?.status)}</strong>
                        </div>
                        {active ? (
                            <p>{_t("setka|plus|active_description")}</p>
                        ) : (
                            <p>{_t("setka|plus|inactive_description")}</p>
                        )}

                        <div className="mx_SetkaPlusDialog_voucher">
                            <Field
                                label={_t("setka|plus|voucher_label")}
                                value={voucherCode}
                                onChange={(ev: ChangeEvent<HTMLInputElement>) => setVoucherCode(ev.target.value)}
                                autoComplete="off"
                                disabled={redeeming}
                            />
                            {voucherFooter && (
                                <p className="mx_SetkaPlusDialog_voucherFooter">{voucherFooter}</p>
                            )}
                            {!active && (
                                <p className="mx_SetkaPlusDialog_voucherHint">{_t("setka|plus|voucher_hint")}</p>
                            )}
                            <Button
                                kind="primary"
                                onClick={() => void onRedeem()}
                                disabled={redeeming || !voucherCode.trim()}
                            >
                                {redeeming ? _t("common|loading") : _t("setka|plus|voucher_submit")}
                            </Button>
                        </div>

                        {notice &&
                            (noticeSuccess ? (
                                <p className="mx_SetkaPlusDialog_noticeSuccess">{notice}</p>
                            ) : (
                                <ErrorMessage>{notice}</ErrorMessage>
                            ))}
                    </>
                )}
            </div>
            <DialogButtons primaryButton={_t("action|ok")} onPrimaryButtonClick={onFinished} hasCancel={false} />
        </BaseDialog>
    );
};

export default SetkaPlusDialog;
