/// <reference types="node" />
import { EventEmitter } from "events";
import { ModuleApi } from "./ModuleApi";
import { PlainSubstitution } from "./types/translations";
import { AllExtensions } from "./types/extensions";
/**
 * Represents a module which is loaded at runtime. Modules which implement this class
 * will be provided information about the application state and can react to it.
 */
export declare abstract class RuntimeModule extends EventEmitter {
    protected readonly moduleApi: ModuleApi;
    extensions?: AllExtensions;
    moduleName: string;
    protected constructor(moduleApi: ModuleApi);
    /**
     * Run a string through the translation engine. Shortcut to ModuleApi#translateString().
     * @param s The string.
     * @param variables The variables, if any.
     * @returns The translated string.
     * @protected
     */
    protected t(s: string, variables?: Record<string, PlainSubstitution>): string;
}
