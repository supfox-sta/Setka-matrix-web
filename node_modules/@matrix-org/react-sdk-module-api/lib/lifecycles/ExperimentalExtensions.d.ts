/**
 * Mostly for test. To ensure we handle more than one module having extensions
 * Can possibly also be useful for PoC development
 */
export interface ProvideExperimentalExtensions {
    experimentalMethod(args?: any): any;
}
export declare abstract class ExperimentalExtensionsBase implements ProvideExperimentalExtensions {
    abstract experimentalMethod(args?: any): any;
}
export declare class DefaultExperimentalExtensions extends ExperimentalExtensionsBase {
    experimentalMethod(args?: any): any;
}
