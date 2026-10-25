/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useEffect, useMemo, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { _t, getCurrentLanguage } from "../languageHandler";
import Spinner from "../components/views/elements/Spinner";
import BaseAvatar from "../components/views/avatars/BaseAvatar";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { pickSetkaStartupGreeting } from "./setkaStartupGreeting";
import { readCachedSetkaAvatar, writeCachedSetkaAvatar } from "./setkaAvatarCache";
import { markSetkaAppEnterPending } from "./setkaAppEnter";
import { setkaGreetingName } from "./setkaUsername";
import { promptSetkaOtherSessions } from "./setkaOtherSessionsPrompt";

/** Brand intro (transparent GIF, 4.2 s) plays once per page load, before the greeting. */
const INTRO_SRC = "themes/setka/img/cetka_matrix_intro.gif";
const INTRO_MS = 4300;
// The intro is now shown by a static overlay in index.html (instantly on open); React skips it.
let introPlayed = true;

export type SetkaSKeyPhase = "avatar" | "lift" | "working" | "ready" | "done";

interface Props {
    client?: MatrixClient | null;
    /** When true, transition to the ready animation and call onFinished. */
    complete?: boolean;
    /** Keep showing the working spinner without waiting for `complete`. */
    indeterminate?: boolean;
    /** Called after the ready animation finishes. */
    onFinished?: () => void;
    /** Optional logout control for sync splash. */
    footer?: React.ReactNode;
}

/**
 * Setka startup splash — avatar lift animation with a random greeting.
 */
const SetkaSKeySplash: React.FC<Props> = ({
    client,
    complete = false,
    indeterminate = false,
    onFinished,
    footer,
}) => {
    const matrixClient = client ?? MatrixClientPeg.get();
    const userId = matrixClient?.getUserId() ?? matrixClient?.getSafeUserId();
    const displayName = useMemo(() => {
        if (!matrixClient || !userId) return _t("setka|startup|guest_name");
        return setkaGreetingName(matrixClient, userId);
    }, [matrixClient, userId]);

    const [i18nRevision, setI18nRevision] = useState(0);

    useEffect(() => {
        // Re-render greetings once async locale bundles finish loading.
        const timers = [0, 120, 400].map((delay) => window.setTimeout(() => setI18nRevision((v) => v + 1), delay));
        return () => timers.forEach((id) => window.clearTimeout(id));
    }, []);

    const greeting = useMemo(
        () => pickSetkaStartupGreeting(displayName),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [displayName, getCurrentLanguage(), i18nRevision],
    );
    const cachedAvatar = userId ? readCachedSetkaAvatar(userId) : null;
    const liveAvatarUrl = userId ? matrixClient?.getUser(userId)?.avatarUrl : undefined;
    const avatarMxc = liveAvatarUrl ?? cachedAvatar?.mxcUrl;
    const avatarUrl =
        avatarMxc && matrixClient
            ? (matrixClient.mxcUrlToHttp(avatarMxc, 80, 80, "crop") ?? undefined)
            : undefined;

    useEffect(() => {
        if (userId && liveAvatarUrl) {
            writeCachedSetkaAvatar(userId, liveAvatarUrl, displayName);
        }
    }, [userId, liveAvatarUrl, displayName]);
    const [phase, setPhase] = useState<SetkaSKeyPhase>("avatar");
    const [intro, setIntro] = useState<boolean>(() => !introPlayed);
    const [introFading, setIntroFading] = useState(false);

    useEffect(() => {
        if (!intro) return;
        introPlayed = true;
        const fade = window.setTimeout(() => setIntroFading(true), INTRO_MS - 350);
        const end = window.setTimeout(() => setIntro(false), INTRO_MS);
        return () => {
            window.clearTimeout(fade);
            window.clearTimeout(end);
        };
    }, [intro]);

    useEffect(() => {
        if (intro) return;
        const toLift = window.setTimeout(() => setPhase("lift"), 520);
        const toWorking = window.setTimeout(() => setPhase("working"), 980);
        return () => {
            window.clearTimeout(toLift);
            window.clearTimeout(toWorking);
        };
    }, [intro]);

    useEffect(() => {
        if (indeterminate || !complete || phase === "ready" || phase === "done") return;
        if (phase !== "working") return;

        setPhase("ready");
        const toDone = window.setTimeout(() => setPhase("done"), 700);
        const finish = window.setTimeout(() => {
            markSetkaAppEnterPending();
            onFinished?.();
            if (matrixClient) void promptSetkaOtherSessions(matrixClient);
        }, 1400);

        return () => {
            window.clearTimeout(toDone);
            window.clearTimeout(finish);
        };
    }, [complete, indeterminate, onFinished, phase]);

    if (intro) {
        return (
            <div className={"mx_SetkaSKeySplash mx_SetkaSKeySplash_intro" + (introFading ? " mx_SetkaSKeySplash_intro_fade" : "")}>
                <img className="mx_SetkaSKeySplash_introImg" src={`${INTRO_SRC}?v=${INTRO_MS}`} alt="" draggable={false} />
            </div>
        );
    }

    const showGreeting = phase !== "avatar";
    const showSpinner = phase === "working" || phase === "ready" || indeterminate;
    const lifted = phase !== "avatar";

    return (
        <div className="mx_SetkaSKeySplash">
            <div
                className={
                    "mx_SetkaSKeySplash_stage" +
                    (lifted ? " mx_SetkaSKeySplash_stage_lifted" : "") +
                    (phase === "ready" ? " mx_SetkaSKeySplash_stage_ready" : "")
                }
            >
                <div className="mx_SetkaSKeySplash_avatarRing">
                    {userId ? (
                        <BaseAvatar
                            idName={userId}
                            name={displayName}
                            url={avatarUrl}
                            size="80px"
                        />
                    ) : (
                        <div className="mx_SetkaSKeySplash_avatarPlaceholder" aria-hidden />
                    )}
                </div>
                {showGreeting && (
                    <p className="mx_SetkaSKeySplash_greeting" key={greeting}>
                        {greeting}
                    </p>
                )}
                {showSpinner && (
                    <div className="mx_SetkaSKeySplash_spinner">
                        <Spinner />
                    </div>
                )}
            </div>
            {footer && <div className="mx_SetkaSKeySplash_footer">{footer}</div>}
        </div>
    );
};

export default SetkaSKeySplash;
