/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

const SETKA_GLASS_LINK_ID = "setka-element-call-glass";

function hasSetkaGlassStylesheet(doc: Document): boolean {
    return Boolean(
        doc.getElementById(SETKA_GLASS_LINK_ID) ||
            doc.querySelector('link[rel="stylesheet"][href*="setka-glass.css"]'),
    );
}

/** Inject Setka glass stylesheet into the embedded Element Call iframe (same-origin). */
export function injectSetkaElementCallGlass(iframe: HTMLIFrameElement): void {
    if (!iframe.src.includes("element-call")) return;

    const apply = (): void => {
        try {
            const doc = iframe.contentDocument;
            if (!doc?.head || hasSetkaGlassStylesheet(doc)) return;

            const link = doc.createElement("link");
            link.id = SETKA_GLASS_LINK_ID;
            link.rel = "stylesheet";
            link.href = new URL("./setka-glass.css", iframe.src).href;
            doc.head.appendChild(link);
        } catch {
            // Cross-origin or not ready yet.
        }
    };

    iframe.addEventListener("load", apply);
    apply();
}
