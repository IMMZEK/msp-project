export namespace options {
    namespace remoteserverOptionsCommon {
        import dinfra = commonOptions.dinfra;
        export { dinfra };
        import files = commonOptions.files;
        export { files };
        import testMode = commonOptions.testMode;
        export { testMode };
        import timeout = commonOptions.timeout;
        export { timeout };
        import testData = commonOptions.testData;
        export { testData };
        export namespace consoleLog {
            export let describe: string;
            let _default: boolean;
            export { _default as default };
            export let boolean: boolean;
        }
        import verbose = commonOptions.verbose;
        export { verbose };
    }
    namespace remoteserverOptionsMainProcess {
        import inspectBrk = commonOptions.inspectBrk;
        export { inspectBrk };
    }
    namespace loadRemoteserverOptionsCommon {
        import dinfra_1 = commonOptions.dinfra;
        export { dinfra_1 as dinfra };
        import files_1 = commonOptions.files;
        export { files_1 as files };
        import remoteserverUrl = commonOptions.remoteserverUrl;
        export { remoteserverUrl };
        import testData_1 = commonOptions.testData;
        export { testData_1 as testData };
        export namespace reqLimit {
            let describe_1: string;
            export { describe_1 as describe };
            let _default_1: number;
            export { _default_1 as default };
            export let number: boolean;
        }
        import testMode_1 = commonOptions.testMode;
        export { testMode_1 as testMode };
        import verbose_1 = commonOptions.verbose;
        export { verbose_1 as verbose };
    }
    namespace loadRemoteserverMainProcess {
        import inspectBrk_1 = commonOptions.inspectBrk;
        export { inspectBrk_1 as inspectBrk };
    }
    namespace serverIndependentOptionsCommon {
        import dinfra_2 = commonOptions.dinfra;
        export { dinfra_2 as dinfra };
        import files_2 = commonOptions.files;
        export { files_2 as files };
        import testMode_2 = commonOptions.testMode;
        export { testMode_2 as testMode };
        import timeout_1 = commonOptions.timeout;
        export { timeout_1 as timeout };
        import customTest = commonOptions.customTest;
        export { customTest };
        import testData_2 = commonOptions.testData;
        export { testData_2 as testData };
        import verbose_2 = commonOptions.verbose;
        export { verbose_2 as verbose };
    }
    namespace serverIndependentOptionsMainProcess {
        import inspectBrk_2 = commonOptions.inspectBrk;
        export { inspectBrk_2 as inspectBrk };
    }
    namespace e2eOptions {
        import inspectBrk_3 = commonOptions.inspectBrk;
        export { inspectBrk_3 as inspectBrk };
        import remoteserverUrl_1 = commonOptions.remoteserverUrl;
        export { remoteserverUrl_1 as remoteserverUrl };
        import testData_3 = commonOptions.testData;
        export { testData_3 as testData };
        import testMode_3 = commonOptions.testMode;
        export { testMode_3 as testMode };
    }
}
export namespace commandInfo {
    namespace remoteserver {
        export let command: string;
        let describe_2: string;
        export { describe_2 as describe };
    }
    namespace loadRemoteserver {
        let command_1: string;
        export { command_1 as command };
        let describe_3: string;
        export { describe_3 as describe };
    }
    namespace serverIndependent {
        let command_2: string;
        export { command_2 as command };
        let describe_4: string;
        export { describe_4 as describe };
    }
    namespace e2e {
        let command_3: string;
        export { command_3 as command };
        let describe_5: string;
        export { describe_5 as describe };
    }
}
export function getOptionsMainProcess(configuration: any): {
    dinfra: {
        demandOption: boolean;
        describe: string;
    };
    files: {
        describe: string;
        array: boolean;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
    timeout: {
        describe: string;
        default: number;
    };
    testData: {
        describe: string;
        default: any;
    };
    consoleLog: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
    verbose: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
    inspectBrk: {
        describe: string;
    };
} | {
    dinfra: {
        demandOption: boolean;
        describe: string;
    };
    files: {
        describe: string;
        array: boolean;
    };
    remoteserverUrl: {
        describe: string;
        demandOption: boolean;
    };
    testData: {
        describe: string;
        default: any;
    };
    reqLimit: {
        describe: string;
        default: number;
        number: boolean;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
    verbose: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
    inspectBrk: {
        describe: string;
    };
} | {
    dinfra: {
        demandOption: boolean;
        describe: string;
    };
    files: {
        describe: string;
        array: boolean;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
    timeout: {
        describe: string;
        default: number;
    };
    customTest: {
        describe: string;
    };
    testData: {
        describe: string;
        default: any;
    };
    verbose: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
    inspectBrk: {
        describe: string;
    };
} | {
    inspectBrk: {
        describe: string;
    };
    remoteserverUrl: {
        describe: string;
        demandOption: boolean;
    };
    testData: {
        describe: string;
        default: any;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
};
export function getOptionsSubProcess(configuration: any): {
    dinfra: {
        demandOption: boolean;
        describe: string;
    };
    files: {
        describe: string;
        array: boolean;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
    timeout: {
        describe: string;
        default: number;
    };
    testData: {
        describe: string;
        default: any;
    };
    consoleLog: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
    verbose: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
} | {
    dinfra: {
        demandOption: boolean;
        describe: string;
    };
    files: {
        describe: string;
        array: boolean;
    };
    remoteserverUrl: {
        describe: string;
        demandOption: boolean;
    };
    testData: {
        describe: string;
        default: any;
    };
    reqLimit: {
        describe: string;
        default: number;
        number: boolean;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
    verbose: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
} | {
    dinfra: {
        demandOption: boolean;
        describe: string;
    };
    files: {
        describe: string;
        array: boolean;
    };
    testMode: {
        describe: string;
        default: scriptsUtil.TestMode;
        choices: scriptsUtil.TestMode[];
    };
    timeout: {
        describe: string;
        default: number;
    };
    customTest: {
        describe: string;
    };
    testData: {
        describe: string;
        default: any;
    };
    verbose: {
        describe: string;
        default: boolean;
        boolean: boolean;
    };
};
declare namespace commonOptions {
    let dinfra_3: {
        demandOption: boolean;
        describe: string;
    };
    export { dinfra_3 as dinfra };
    export namespace files_3 {
        let describe_6: string;
        export { describe_6 as describe };
        export let array: boolean;
    }
    export { files_3 as files };
    export namespace inspectBrk_4 {
        let describe_7: string;
        export { describe_7 as describe };
    }
    export { inspectBrk_4 as inspectBrk };
    export namespace remoteserverUrl_2 {
        let describe_8: string;
        export { describe_8 as describe };
        export let demandOption: boolean;
    }
    export { remoteserverUrl_2 as remoteserverUrl };
    export namespace testMode_4 {
        let describe_9: string;
        export { describe_9 as describe };
        let _default_2: scriptsUtil.TestMode;
        export { _default_2 as default };
        export let choices: scriptsUtil.TestMode[];
    }
    export { testMode_4 as testMode };
    export namespace customTest_1 {
        let describe_10: string;
        export { describe_10 as describe };
    }
    export { customTest_1 as customTest };
    export namespace timeout_2 {
        let describe_11: string;
        export { describe_11 as describe };
        let _default_3: number;
        export { _default_3 as default };
    }
    export { timeout_2 as timeout };
    export namespace verbose_3 {
        let describe_12: string;
        export { describe_12 as describe };
        let _default_4: boolean;
        export { _default_4 as default };
        let boolean_1: boolean;
        export { boolean_1 as boolean };
    }
    export { verbose_3 as verbose };
    export namespace testData_4 {
        let describe_13: string;
        export { describe_13 as describe };
        let _default_5: any;
        export { _default_5 as default };
    }
    export { testData_4 as testData };
}
import scriptsUtil = require("../util");
export {};
