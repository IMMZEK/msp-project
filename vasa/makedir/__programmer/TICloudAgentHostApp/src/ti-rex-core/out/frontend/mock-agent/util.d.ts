import type { ModuleEvents } from '../../cloudagent/util';
import type { InstalledPackage } from '../../cloudagent/response-data';
export interface Options {
    agentNotInstalled?: boolean;
    filesNeeded?: number;
    errorGetSubModule?: boolean;
    errorFilesNeeded?: boolean;
    errorDetectDebugProbes?: boolean;
    errorDetectDeviceWithProbe?: boolean;
    attach?: number;
    detach?: number;
    agentMode?: 'desktop' | 'cloud';
    installInfo?: string[];
    localPackages?: InstalledPackage[];
    tirexTriggerEvents?: {
        [key in ModuleEvents]?: {
            delay: number;
            data: any;
        };
    };
}
