export const command: "run-tests [options]";
export const describe: "Run tests and figure out test configuration based on operating system";
export namespace builder {
    namespace remoteserverUrl {
        let describe: string;
        let demandOption: boolean;
    }
    let dinfra: {
        demandOption: boolean;
        describe: string;
    };
    namespace testMode {
        let describe_1: string;
        export { describe_1 as describe };
        export let choices: TestMode[];
        let demandOption_1: boolean;
        export { demandOption_1 as demandOption };
    }
    namespace testData {
        let describe_2: string;
        export { describe_2 as describe };
    }
}
export function handler(argv: any): void;
import { TestMode } from "../util";
