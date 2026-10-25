import { ProvideCryptoSetupExtensions } from "../lifecycles/CryptoSetupExtensions";
import { ProvideExperimentalExtensions } from "../lifecycles/ExperimentalExtensions";
export declare type AllExtensions = {
    cryptoSetup?: ProvideCryptoSetupExtensions;
    experimental?: ProvideExperimentalExtensions;
};
