export function generate({ logDir, summarize }: {
    logDir: any;
    summarize: any;
}): Promise<string[]>;
export const command: "generate-report [options]";
export const describe: "Generate an HTML report for any available load testing results";
export namespace builder {
    namespace logDir {
        let describe: string;
        let string: boolean;
        let demandOption: boolean;
    }
    namespace summarize {
        let describe_1: string;
        export { describe_1 as describe };
        export let boolean: boolean;
        let _default: boolean;
        export { _default as default };
    }
}
export function handler(argv: any): void;
