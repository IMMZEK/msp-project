export function testProjects(args: {
    tirexUrl: string;
    ccsUrl: string;
    packages: Array.String;
    exclude: Array.String;
    backupLocation: string;
    device: string;
    devtool: string;
    logFile: string;
    reportFile: string;
}, callback: any): void;
export const command: "test-projects [options]";
export const describe: "Test all the projects in tirex in a desktop environment, verifying they import and build successfully. Deletes all projects from the workspace then runs an import & build on each project, deleting all projects from the workspace in between each import & build.";
export namespace builder {
    namespace tirexUrl {
        let alias: string;
        let describe: string;
        let demandOption: boolean;
    }
    namespace ccsUrl {
        let alias_1: string;
        export { alias_1 as alias };
        let describe_1: string;
        export { describe_1 as describe };
        let demandOption_1: boolean;
        export { demandOption_1 as demandOption };
    }
    namespace packages {
        let alias_2: string;
        export { alias_2 as alias };
        let describe_2: string;
        export { describe_2 as describe };
        export let array: boolean;
    }
    namespace exclude {
        let describe_3: string;
        export { describe_3 as describe };
        let array_1: boolean;
        export { array_1 as array };
    }
    namespace backupLocation {
        let describe_4: string;
        export { describe_4 as describe };
    }
    namespace device {
        let describe_5: string;
        export { describe_5 as describe };
    }
    namespace devtool {
        let alias_3: string;
        export { alias_3 as alias };
        let describe_6: string;
        export { describe_6 as describe };
    }
    namespace logFile {
        let describe_7: string;
        export { describe_7 as describe };
        let _default: string;
        export { _default as default };
    }
    namespace reportFile {
        let describe_8: string;
        export { describe_8 as describe };
        let _default_1: string;
        export { _default_1 as default };
    }
}
export function handler(argv: any): void;
export type testProjectsCallback = (error: Error, result: {
    total: number;
    failed: number;
    log: string;
}) => any;
