export const command: "handoff [options]";
export const describe: "A simple client to handoff package(s)";
export namespace builder {
    namespace handoffFile {
        let alias: string;
        let describe: string;
        let demandOption: boolean;
    }
    namespace url {
        let alias_1: string;
        export { alias_1 as alias };
        let describe_1: string;
        export { describe_1 as describe };
        let demandOption_1: boolean;
        export { demandOption_1 as demandOption };
    }
}
export function handler(argv: any): void;
export function validateEntrySchema(entries: any): Error | null;
