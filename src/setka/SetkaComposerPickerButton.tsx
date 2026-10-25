/*
Copyright 2026 Setka Matrix

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import classNames from "classnames";
import React, { type JSX, useContext } from "react";
import { type IEventRelation } from "matrix-js-sdk/src/matrix";
import { ReactionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../languageHandler";
import ContextMenu, { type MenuProps, useContextMenu } from "../components/structures/ContextMenu";
import UIStore from "../stores/UIStore";
import { CollapsibleButton, OverflowMenuContext } from "../components/views/rooms/CollapsibleButton";
import MatrixClientContext from "../contexts/MatrixClientContext";
import { isSetkaHomeserver } from "./SetkaConfig";
import SetkaComposerPicker from "./SetkaComposerPicker";

interface Props {
    addEmoji: (unicode: string) => boolean;
    menuPosition?: MenuProps;
    className?: string;
    relation?: IEventRelation;
}

/** TG-style: full-width panel anchored above the message composer. */
function setkaPickerAboveComposer(fallbackRect: DOMRect): MenuProps {
    const wrapper = document.querySelector<HTMLElement>(".mx_MessageComposer_wrapper");
    const rect = wrapper?.getBoundingClientRect() ?? fallbackRect;
    const horizontalInset = Math.max(12, (UIStore.instance.windowWidth - rect.width) / 2);

    return {
        left: rect.left + window.scrollX,
        bottom: UIStore.instance.windowHeight - rect.top + window.scrollY + 6,
        menuWidth: Math.min(rect.width, UIStore.instance.windowWidth - horizontalInset * 2),
    };
}

export function SetkaComposerPickerButton({ addEmoji, menuPosition, className, relation }: Props): JSX.Element {
    const client = useContext(MatrixClientContext);
    const overflowMenuCloser = useContext(OverflowMenuContext);
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    if (!client || !isSetkaHomeserver(client)) {
        return <></>;
    }

    let contextMenu: React.ReactElement | null = null;
    if (menuDisplayed && button.current) {
        const position = menuPosition ?? setkaPickerAboveComposer(button.current.getBoundingClientRect());
        const onFinished = (): void => {
            closeMenu();
            overflowMenuCloser?.();
        };

        contextMenu = (
            <ContextMenu {...position} onFinished={onFinished} managed={false} focusLock>
                <div className="mx_SetkaComposerPicker_menu">
                    <SetkaComposerPicker
                        client={client}
                        addEmoji={addEmoji}
                        relation={relation}
                        onClose={onFinished}
                    />
                </div>
            </ContextMenu>
        );
    }

    const computedClassName = classNames("mx_SetkaComposerPickerButton", className, {
        mx_SetkaComposerPickerButton_highlight: menuDisplayed,
    });

    return (
        <>
            <CollapsibleButton
                className={computedClassName}
                onClick={openMenu}
                title={_t("setka|picker|open")}
                inputRef={button}
            >
                <ReactionIcon />
            </CollapsibleButton>
            {contextMenu}
        </>
    );
}

export default SetkaComposerPickerButton;
