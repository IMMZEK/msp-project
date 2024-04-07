export function killTirex({ tirexUrl }: {
    tirexUrl: any;
}, callback: any): void;
export const command: "kill-tirex [options]";
export const describe: "Kill the tirex at the specified url";
export namespace builder {
    namespace tirexUrl {
        let describe: string;
        let demandOption: boolean;
    }
}
export function handler(argv: any): void;
