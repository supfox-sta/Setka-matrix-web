/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { type FC, type SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    ...p,
});

export const MicIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.92V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.08A7 7 0 0 1 5 11a1 1 0 1 1 2 0 5 5 0 0 0 10 0Z" />
    </svg>
);

export const MicOffIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M3.7 2.3a1 1 0 0 0-1.4 1.4l5.7 5.7V11a4 4 0 0 0 5.6 3.66l1.46 1.46A6 6 0 0 1 6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.94V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.06c1.2-.15 2.3-.57 3.25-1.2l4.05 4.06a1 1 0 0 0 1.4-1.42L3.7 2.3ZM9.4 4.8 15 10.4V6a4 4 0 0 0-5.6-3.66v.01ZM18 11a1 1 0 1 1 2 0c0 1.05-.2 2.05-.58 2.97l-1.5-1.5c.05-.48.08-.97.08-1.47Z" />
    </svg>
);

export const CameraIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M4 6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-1.5l4.4 2.64A1 1 0 0 0 22 16.28V7.72a1 1 0 0 0-1.6-.86L16 9.5V9a3 3 0 0 0-3-3H4Z" />
    </svg>
);

export const CameraOffIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M3.7 2.3a1 1 0 0 0-1.4 1.4l1.1 1.1A3 3 0 0 0 1 9v6a3 3 0 0 0 3 3h9a3 3 0 0 0 2.4-1.2l4.9 4.9a1 1 0 0 0 1.4-1.4L3.7 2.3ZM6.2 6H13a3 3 0 0 1 3 3v.5l4.4-2.64A1 1 0 0 1 22 7.72v8.56a1 1 0 0 1-.1.43L16 10.8V9a1 1 0 0 0-1-1H8.2L6.2 6Z" />
    </svg>
);

export const ScreenIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M4 4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h6v2H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-2v-2h6a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H4Zm8 3.5 3.5 3.5-1.4 1.4-1.1-1.1V15h-2v-3.7l-1.1 1.1L8.5 11 12 7.5Z" />
    </svg>
);

export const HangupIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M12 8.5c-3.2 0-6.2 1-8.6 2.8-.8.6-.9 1.7-.3 2.4l1.3 1.6c.5.6 1.3.8 2 .4l2.2-1.2c.4-.2.6-.6.6-1v-1.6c1.4-.5 3.4-.5 4.8 0V13c0 .4.2.8.6 1l2.2 1.2c.7.4 1.5.2 2-.4l1.3-1.6c.6-.7.5-1.8-.3-2.4A14.2 14.2 0 0 0 12 8.5Z" />
    </svg>
);

export const ReturnIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M14 3a1 1 0 1 0 0 2h3.6L10.3 12.3a1 1 0 1 0 1.4 1.4L19 6.4V10a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-6ZM5 6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4a1 1 0 1 0-2 0v4H5V8h4a1 1 0 1 0 0-2H5Z" />
    </svg>
);

export const HeadphonesIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5v-1a7 7 0 1 1 14 0v1h-2a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9Z" />
    </svg>
);

export const HeadphonesOffIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M3.7 2.3a1 1 0 0 0-1.4 1.4l2.1 2.1A9 9 0 0 0 3 12v6a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5v-1c0-1.2.35-2.3.95-3.25L9.4 13.2V19a2 2 0 0 0 .1.6l-1 1a1 1 0 1 0 1.4 1.4L21.7 20.2a1 1 0 0 0-1.4-1.4l-.3.3V12a9 9 0 0 0-13.3-7.9L3.7 2.3ZM12 5c3.9 0 7 3.1 7 7v1h-2a2 2 0 0 0-2 2v2.2L10.2 10.4A7 7 0 0 1 12 5Z" />
    </svg>
);

export const FullscreenIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M4 4h6a1 1 0 1 1 0 2H6v4a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm10 0h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V6h-4a1 1 0 1 1 0-2ZM5 14a1 1 0 0 1 1 1v3h4a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Zm14 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 1 1 0-2h4v-4a1 1 0 0 1 1-1Z" />
    </svg>
);

export const ChatIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M5 3a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h1v3.2a.8.8 0 0 0 1.3.6L12 18h7a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H5Z" />
    </svg>
);

export const PinIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M14.7 2.3a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1-.9 1.7l-2.2.3-3.5 3.5.3 3.3a1 1 0 0 1-1.7.8L9.3 14.3l-5.6 5.6a1 1 0 0 1-1.4-1.4l5.6-5.6-3.5-3.5a1 1 0 0 1 .8-1.7l3.3.3 3.5-3.5.3-2.2a1 1 0 0 1 .4-.1Z" />
    </svg>
);

export const LockOffIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
    </svg>
);

export const SpeakerIcon: FC<SVGProps<SVGSVGElement>> = (p) => (
    <svg {...base(p)}>
        <path d="M11 4.4a1 1 0 0 0-1.65-.76L5.6 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.6l3.75 3.36A1 1 0 0 0 11 19.6V4.4Zm5.7 2.9a1 1 0 0 1 1.4.1 8 8 0 0 1 0 9.2 1 1 0 1 1-1.5-1.3 6 6 0 0 0 0-6.6 1 1 0 0 1 .1-1.4Z" />
    </svg>
);
