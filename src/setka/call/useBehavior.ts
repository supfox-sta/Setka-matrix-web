/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import { useCallback, useSyncExternalStore } from "react";

/** Minimal shape shared by the matrixrtc-sdk Behavior and an rxjs BehaviorSubject. */
export interface BehaviorLike<T> {
    readonly value: T;
    subscribe(next: () => void): { unsubscribe(): void };
}

/** Subscribes a component to an SDK Behavior (hot, always has a current value). */
export function useBehavior<T>(behavior: BehaviorLike<T>): T;
export function useBehavior<T>(behavior: BehaviorLike<T> | undefined): T | undefined;
export function useBehavior<T>(behavior: BehaviorLike<T> | undefined): T | undefined {
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (!behavior) return () => {};
            const sub = behavior.subscribe(onChange);
            return () => sub.unsubscribe();
        },
        [behavior],
    );
    return useSyncExternalStore(subscribe, () => behavior?.value);
}
