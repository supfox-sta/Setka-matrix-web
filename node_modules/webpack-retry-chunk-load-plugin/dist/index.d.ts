import { Compiler } from 'webpack';
export interface RetryChunkLoadPluginOptions {
    /**
     * optional stringified function to get the cache busting query string appended to the script src
     * if not set will default to appending the string `?cache-bust=true`
     */
    cacheBust?: string;
    /**
     * optional list of chunks to which retry script should be injected
     * if not set will add retry script to all chunks that have webpack script loading
     */
    chunks?: string[];
    /**
     * optional code to be executed in the browser context if after all retries chunk is not loaded.
     * if not set - nothing will happen and error will be returned to the chunk loader.
     */
    lastResortScript?: string;
    /**
     * optional value to set the maximum number of retries to load the chunk. Default is 1
     */
    maxRetries?: number;
    /**
     * optional number value to set the amount of time in milliseconds before trying to load the chunk again. Default is 0
     * if string, value must be code to generate a delay value. Receives retryCount as argument
     * e.g. `function(retryAttempt) { return retryAttempt * 1000 }`
     */
    retryDelay?: number | string;
}
export declare class RetryChunkLoadPlugin {
    options: RetryChunkLoadPluginOptions;
    constructor(options?: RetryChunkLoadPluginOptions);
    apply(compiler: Compiler): void;
}
