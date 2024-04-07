export function handler(argv: any): void;
export const command: string;
export const describe: string;
export namespace builder {
    namespace dinfra {
        export let describe: string;
        export let demandOption: boolean;
        export { DINFRA_PATH_DEFAULT as default };
    }
    namespace dconfig {
        let describe_1: string;
        export { describe_1 as describe };
        let demandOption_1: boolean;
        export { demandOption_1 as demandOption };
        export { DCONFIG_PATH_DEFAULT as default };
    }
    namespace appconfig {
        let describe_2: string;
        export { describe_2 as describe };
        let demandOption_2: boolean;
        export { demandOption_2 as demandOption };
        export { APPCONFIG_PATH_DEFAULT as default };
    }
    namespace rediscoverOnly {
        let describe_3: string;
        export { describe_3 as describe };
        export let boolean: boolean;
        let _default: boolean;
        export { _default as default };
    }
    namespace defaultJson {
        let describe_4: string;
        export { describe_4 as describe };
        let boolean_1: boolean;
        export { boolean_1 as boolean };
        let _default_1: boolean;
        export { _default_1 as default };
    }
    namespace validationType {
        let describe_5: string;
        export { describe_5 as describe };
        let _default_2: string;
        export { _default_2 as default };
    }
    namespace contentPath {
        let describe_6: string;
        export { describe_6 as describe };
    }
    namespace noSyncPackages {
        let describe_7: string;
        export { describe_7 as describe };
        let boolean_2: boolean;
        export { boolean_2 as boolean };
        let _default_3: boolean;
        export { _default_3 as default };
    }
}
declare const DINFRA_PATH_DEFAULT: "../../dinfra-library/lib/dinfra.js";
declare const DCONFIG_PATH_DEFAULT: "../../tirex4-dconfig.json";
declare const APPCONFIG_PATH_DEFAULT: "../../tirex4-sconfig.json";
export {};
