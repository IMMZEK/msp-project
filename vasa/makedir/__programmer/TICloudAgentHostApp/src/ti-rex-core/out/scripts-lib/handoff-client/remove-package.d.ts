export const command: "remove-package [options]";
export const describe: "A simple client to remove a package";
export namespace builder {
    namespace packageId {
        let alias: string;
        let describe: string;
        let demandOption: boolean;
    }
    namespace packageVersion {
        let describe_1: string;
        export { describe_1 as describe };
        let _default: string;
        export { _default as default };
    }
    namespace url {
        let alias_1: string;
        export { alias_1 as alias };
        let describe_2: string;
        export { describe_2 as describe };
        let demandOption_1: boolean;
        export { demandOption_1 as demandOption };
    }
    namespace email {
        let alias_2: string;
        export { alias_2 as alias };
        let describe_3: string;
        export { describe_3 as describe };
        export let array: boolean;
    }
}
export function handler(argv: any): void;
