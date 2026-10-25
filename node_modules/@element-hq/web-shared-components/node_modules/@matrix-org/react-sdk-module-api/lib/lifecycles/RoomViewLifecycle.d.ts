import React from "react";
export declare enum RoomViewLifecycle {
    PreviewRoomNotLoggedIn = "preview_not_logged_in",
    JoinFromRoomPreview = "try_join_not_logged_in",
    ViewRoom = "view_room"
}
export declare type RoomPreviewOpts = {
    canJoin: boolean;
};
export declare type ViewRoomOpts = {
    buttons: Array<{
        icon: React.ReactNode | (() => React.ReactNode);
        id: string;
        label: () => string;
        onClick: () => void;
    }>;
};
export declare type RoomPreviewListener = (opts: RoomPreviewOpts, roomId: string) => void;
export declare type JoinFromPreviewListener = (roomId: string) => void;
export declare type ViewRoomListener = (opts: ViewRoomOpts, roomId: string) => void;
