/**
 * Get the passed in appConfig, dconfig, and dinfra paths
 *
 */
export declare function getAppConfig(): Promise<{
    dinfra: string | null;
    dconfig: string | null;
    appConfig: string | null;
}>;
