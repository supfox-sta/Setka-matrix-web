import * as React from "react";
import { ModuleApi } from "../ModuleApi";
import { PlainSubstitution } from "../types/translations";
import { ModuleUiDialogOptions } from "../types/ModuleUiDialogOptions";
/** React properties for dialog content implementations based on {@link DialogContent} */
export interface DialogProps {
    /**
     * A reference to the active Module API.
     */
    moduleApi: ModuleApi;
    /**
     * Callback to update the dialog options.
     *
     * Dialog content implementations can call this to update any of the options that were
     * originally set via {@link ModuleApi.openDialog}.
     *
     * @param options - The updates that should be applied to the dialog options. Any properties
     * not set in the {@link options} are left unchanged.
     */
    setOptions(options: Partial<ModuleUiDialogOptions>): void;
    /**
     * Cancel the dialog programmatically.
     */
    cancel(): void;
}
/** State of {@link DialogContent} */
export interface DialogState {
    busy: boolean;
    error?: string;
}
/**
 * Base class for the content of a Dialog.
 *
 * The `body` callback passed to {@link ModuleApi.openDialog} should return an instance of a
 * class based on this.
 */
export declare abstract class DialogContent<P extends DialogProps = DialogProps, S extends DialogState = DialogState, M extends object = {}> extends React.PureComponent<P, S> {
    protected constructor(props: P, state?: S);
    /**
     * Run a string through the translation engine. Shortcut to ModuleApi#translateString().
     * @param s The string.
     * @param variables The variables, if any.
     * @returns The translated string.
     * @protected
     */
    protected t(s: string, variables?: Record<string, PlainSubstitution>): string;
    /**
     * Called when the dialog is submitted. Note that calling this will not submit the
     * dialog by default - this component will be wrapped in a form which handles keyboard
     * submission and buttons on its own.
     *
     * If the returned promise resolves then the dialog will be closed, otherwise the dialog
     * will stay open.
     */
    abstract trySubmit(): Promise<M>;
}
