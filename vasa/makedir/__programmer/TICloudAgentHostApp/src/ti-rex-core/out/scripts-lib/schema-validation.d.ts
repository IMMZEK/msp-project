export const command: string;
export const describe: "Run schema validation on desktop without dinfra";
export namespace builder {
    namespace contentPath {
        let describe: string;
        let demandOption: boolean;
    }
    namespace cfg {
        let describe_1: string;
        export { describe_1 as describe };
        let _default: string;
        export { _default as default };
    }
    namespace full {
        let describe_2: string;
        export { describe_2 as describe };
        let _default_1: boolean;
        export { _default_1 as default };
    }
}
export function handler(argv: any): void;
