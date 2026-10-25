/**
 * Options for {@link ModuleApi#openDialog}.
 */
export interface ModuleUiDialogOptions {
    /**
     * The title of the dialog.
     */
    title: string;
    /**
     * The label of the action button. If unset, a default label will be used.
     */
    actionLabel?: string;
    /**
     * The label of the cancel button. If unset, a default label will be used.
     */
    cancelLabel?: string;
    /**
     * Enable or disable the action button when the dialog is created.
     * @defaultValue The default is `true`
     */
    canSubmit?: boolean;
}
