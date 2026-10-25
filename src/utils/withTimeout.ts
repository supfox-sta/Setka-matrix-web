/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

/** Reject if `promise` does not settle within `ms` milliseconds. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}
