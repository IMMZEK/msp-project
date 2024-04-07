import { EntryModuleDesktop } from './entry-module-inner-desktop';
import { TriggerEvent } from './util';
export declare const name = "Tirex";
export declare function instance(triggerEvent: TriggerEvent, _createSiblingModule: (name: string) => Promise<{
    port: number;
}>, logger: any, eventBroker: any, _getHostAgentSetupArgs: any, getProxy?: (url: string) => Promise<string>): {
    commands: EntryModuleDesktop;
};
