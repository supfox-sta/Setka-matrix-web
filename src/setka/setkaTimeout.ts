/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

export class SetkaTimeoutError extends Error {
    public constructor(message = "Operation timed out") {
        super(message);
        this.name = "SetkaTimeoutError";
    }
}

/** Reject if `promise` does not settle within `ms` milliseconds. */
export function withSetkaTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(new SetkaTimeoutError(label ? `${label} timed out after ${ms}ms` : undefined));
        }, ms);

        promise.then(
            (value) => {
                window.clearTimeout(timer);
                resolve(value);
            },
            (error: unknown) => {
                window.clearTimeout(timer);
                reject(error);
            },
        );
    });
}
