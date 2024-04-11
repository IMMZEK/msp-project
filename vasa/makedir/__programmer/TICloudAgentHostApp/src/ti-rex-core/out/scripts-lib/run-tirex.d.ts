export const command: "start [options]";
export const describe: "Run ti-rex-core";
export namespace builder {
    namespace dinfra {
        let describe: string;
        let demandOption: boolean;
    }
    namespace production {
        let describe_1: string;
        export { describe_1 as describe };
        export let boolean: boolean;
        let _default: boolean;
        export { _default as default };
    }
    namespace inspectBrk {
        let describe_2: string;
        export { describe_2 as describe };
        let boolean_1: boolean;
        export { boolean_1 as boolean };
        let _default_1: boolean;
        export { _default_1 as default };
    }
    namespace inspect {
        let describe_3: string;
        export { describe_3 as describe };
        let boolean_2: boolean;
        export { boolean_2 as boolean };
        let _default_2: boolean;
        export { _default_2 as default };
    }
}
export function handler(argv: any): void;
export function runTirex(config: any, callback?: () => void): void;
