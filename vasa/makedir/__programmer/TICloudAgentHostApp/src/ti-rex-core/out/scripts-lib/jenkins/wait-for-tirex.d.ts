export function waitForTirex({ tirexUrl }: {
    tirexUrl: any;
}, callback: any): void;
export const command: "wait-for-tirex [options]";
export const describe: "Wait for tirex at the specified url";
export namespace builder {
    namespace tirexUrl {
        let describe: string;
        let demandOption: boolean;
    }
}
export function handler(argv: any): void;
