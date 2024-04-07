export namespace config {
    let seleniumAddress: string;
    let multiCapabilities: {
        browserName: string;
        loggingPrefs: {
            driver: string;
            browser: string;
        };
    }[];
    let maxSessions: number;
    let getPageTimeout: number;
    let allScriptsTimeout: number;
    let framework: string;
    namespace mochaOpts {
        let reporter: string;
        namespace reporterOptions {
            let inlineAssets: boolean;
            let quiet: boolean;
            let reportDir: string;
            let reportFilename: string;
        }
    }
    let specs: string[];
    function onPrepare(): Promise<any>;
    function onComplete(): void;
}
