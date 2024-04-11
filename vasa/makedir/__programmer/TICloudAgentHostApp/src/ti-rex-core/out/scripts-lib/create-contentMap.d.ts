export function handler(argv: any): void;
export const command: string;
export const describe: "Create a file that maps content routes to an approriate explore link and storing it in a file";
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
}
declare const DINFRA_PATH_DEFAULT: "../../dinfra-library/lib/dinfra.js";
declare const DCONFIG_PATH_DEFAULT: "../../tirex4-dconfig.json";
declare const APPCONFIG_PATH_DEFAULT: "../../tirex4-sconfig.json";
export {};
