export function testProject({ ccsUrl, location, deviceId }: {
    ccsUrl: any;
    location: any;
    deviceId?: null | undefined;
}, callback: any): void;
export const command: "test-project [options]";
export const describe: "Test a specific project in either a cloud or desktop environment, verifying it imports and builds successfully.. Deletes all projects from the workspace then runs an import & build.";
export namespace builder {
    namespace ccsUrl {
        let alias: string;
        let describe: string;
        let demandOption: boolean;
    }
    namespace location {
        let alias_1: string;
        export { alias_1 as alias };
        let describe_1: string;
        export { describe_1 as describe };
        let demandOption_1: boolean;
        export { demandOption_1 as demandOption };
    }
    namespace deviceId {
        let alias_2: string;
        export { alias_2 as alias };
        let describe_2: string;
        export { describe_2 as describe };
    }
}
export function handler(argv: any): void;
