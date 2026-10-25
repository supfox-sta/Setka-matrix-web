/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState } from "react";
import { type MatrixClient, MatrixError } from "matrix-js-sdk/src/matrix";

import AccessibleButton from "../components/views/elements/AccessibleButton";
import Field from "../components/views/elements/Field";
import InlineSpinner from "../components/views/elements/InlineSpinner";
import {
    confirmSetkaEmailCode,
    confirmSetkaPhoneCode,
    listSetkaThreepids,
    newClientSecret,
    normalizeSetkaPhone,
    requestSetkaEmailCode,
    requestSetkaPhoneCode,
    unbindSetkaThreepid,
    type SetkaBoundThreepid,
    type SetkaThreepidMedium,
} from "./SetkaThreepidApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function errText(e: unknown): string {
    if (e instanceof MatrixError) {
        if (e.errcode === "M_THREEPID_IN_USE") return "Уже привязано к другому аккаунту.";
        if (e.errcode === "M_THREEPID_AUTH_FAILED") return "Неверный или просроченный код.";
        if (e.errcode === "M_LIMIT_EXCEEDED") return "Слишком много попыток. Подождите немного.";
        if (e.errcode === "M_THREEPID_DENIED") return "Этот адрес не разрешён на сервере.";
        if (e.data?.error) return String(e.data.error);
    }
    return "Не получилось. Попробуйте ещё раз.";
}

interface BindFlowProps {
    medium: SetkaThreepidMedium;
    client: MatrixClient;
    /** Mailbox where the code is delivered (phone binding only). */
    deliveryEmail?: string;
    onDone: () => void;
}

/** input -> "send code" -> code input -> "confirm". */
const BindFlow: React.FC<BindFlowProps> = ({ medium, client, deliveryEmail, onDone }) => {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [code, setCode] = useState("");
    const [sid, setSid] = useState<string | null>(null);
    const [secret] = useState(newClientSecret);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const isEmail = medium === "email";
    const normalized = isEmail ? value.trim().toLowerCase() : normalizeSetkaPhone(value);
    const valid = isEmail ? EMAIL_RE.test(value.trim()) : !!normalized;

    const reset = (): void => {
        setOpen(false);
        setValue("");
        setCode("");
        setSid(null);
        setError("");
    };

    const send = useCallback(async () => {
        if (!normalized) return;
        setBusy(true);
        setError("");
        try {
            const id = isEmail
                ? await requestSetkaEmailCode(client, normalized, secret)
                : await requestSetkaPhoneCode(client, normalized, deliveryEmail!, secret);
            setSid(id);
        } catch (e) {
            setError(errText(e));
        } finally {
            setBusy(false);
        }
    }, [client, deliveryEmail, isEmail, normalized, secret]);

    const confirm = useCallback(async () => {
        if (!sid) return;
        setBusy(true);
        setError("");
        try {
            if (isEmail) await confirmSetkaEmailCode(client, sid, secret, code.trim());
            else await confirmSetkaPhoneCode(client, sid, secret, code.trim());
            reset();
            onDone();
        } catch (e) {
            setError(errText(e));
        } finally {
            setBusy(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, code, isEmail, onDone, secret, sid]);

    if (!open) {
        return (
            <AccessibleButton kind="primary_outline" onClick={() => setOpen(true)}>
                {isEmail ? "Привязать почту" : "Привязать номер"}
            </AccessibleButton>
        );
    }

    return (
        <div className="mx_SetkaContactMethods_flow">
            {!sid ? (
                <>
                    <Field
                        label={isEmail ? "Почта" : "Номер телефона (+7 999 123-45-67)"}
                        type={isEmail ? "email" : "tel"}
                        value={value}
                        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setValue(ev.target.value)}
                        autoFocus
                    />
                    {!isEmail && (
                        <p className="mx_SetkaContactMethods_hint">
                            Код придёт на почту {deliveryEmail}, не по SMS.
                        </p>
                    )}
                    <div className="mx_SetkaContactMethods_actions">
                        <AccessibleButton kind="primary" disabled={!valid || busy} onClick={send}>
                            Получить код
                        </AccessibleButton>
                        <AccessibleButton kind="link_inline" onClick={reset}>
                            Отмена
                        </AccessibleButton>
                        {busy && <InlineSpinner />}
                    </div>
                </>
            ) : (
                <>
                    <p className="mx_SetkaContactMethods_hint">
                        Код отправлен на {isEmail ? normalized : deliveryEmail}. Он действует 15 минут.
                    </p>
                    <Field
                        label="Код из письма"
                        value={code}
                        inputMode="numeric"
                        maxLength={6}
                        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setCode(ev.target.value)}
                        autoFocus
                    />
                    <div className="mx_SetkaContactMethods_actions">
                        <AccessibleButton kind="primary" disabled={code.trim().length < 6 || busy} onClick={confirm}>
                            Подтвердить
                        </AccessibleButton>
                        <AccessibleButton kind="link_inline" onClick={() => setSid(null)}>
                            Назад
                        </AccessibleButton>
                        {busy && <InlineSpinner />}
                    </div>
                </>
            )}
            {error && <p className="mx_SetkaContactMethods_error">{error}</p>}
        </div>
    );
};

const SetkaContactMethods: React.FC<{ client: MatrixClient }> = ({ client }) => {
    const [items, setItems] = useState<SetkaBoundThreepid[] | null>(null);
    const [error, setError] = useState("");
    const [busyKey, setBusyKey] = useState("");

    const refresh = useCallback(async () => {
        try {
            setItems(await listSetkaThreepids(client));
        } catch {
            setItems([]);
            setError("Не удалось загрузить привязанные данные.");
        }
    }, [client]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const unbind = async (t: SetkaBoundThreepid): Promise<void> => {
        const label = t.medium === "email" ? "почту" : "номер";
        if (!window.confirm(`Отвязать ${label} ${t.address}? Вас перестанут находить по ней.`)) return;
        setBusyKey(t.medium + t.address);
        setError("");
        try {
            await unbindSetkaThreepid(client, t.medium, t.address);
            await refresh();
        } catch (e) {
            setError(errText(e));
        } finally {
            setBusyKey("");
        }
    };

    if (!items) return <InlineSpinner />;

    const emails = items.filter((t) => t.medium === "email");
    const phones = items.filter((t) => t.medium === "msisdn");

    const row = (t: SetkaBoundThreepid): React.ReactNode => (
        <div className="mx_SetkaContactMethods_row" key={t.medium + t.address}>
            <span className="mx_SetkaContactMethods_icon">{t.medium === "email" ? "✉" : "☎"}</span>
            <span className="mx_SetkaContactMethods_value">{t.address}</span>
            <AccessibleButton
                kind="danger_outline"
                disabled={busyKey === t.medium + t.address}
                onClick={() => void unbind(t)}
            >
                Отвязать
            </AccessibleButton>
        </div>
    );

    return (
        <div className="mx_SetkaContactMethods">
            <div className="mx_SetkaContactMethods_group">
                <div className="mx_SetkaContactMethods_title">Почта</div>
                {emails.map(row)}
                {!emails.length && <BindFlow medium="email" client={client} onDone={refresh} />}
            </div>
            <div className="mx_SetkaContactMethods_group">
                <div className="mx_SetkaContactMethods_title">Номер телефона</div>
                {phones.map(row)}
                {!phones.length &&
                    (emails.length ? (
                        <BindFlow medium="msisdn" client={client} deliveryEmail={emails[0].address} onDone={refresh} />
                    ) : (
                        <p className="mx_SetkaContactMethods_hint">
                            Сначала привяжите почту: на неё приходит код для подтверждения номера.
                        </p>
                    ))}
            </div>
            {error && <p className="mx_SetkaContactMethods_error">{error}</p>}
        </div>
    );
};

export default SetkaContactMethods;
