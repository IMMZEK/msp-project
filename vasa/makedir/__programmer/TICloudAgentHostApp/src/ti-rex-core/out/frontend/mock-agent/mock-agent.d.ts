/// <reference types="agent" />
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { Options } from './util';
export declare const enum MockAgentType {
    AGENT_NOT_INSTALLED = 0,
    HOST_FILES_MISSING = 1,
    UNKNOWN_ERROR = 2
}
export declare const mockInstallWizard: {
    title: string;
    detailsLink: {
        text: string;
        url: string;
    };
    helpLink: {
        text: string;
        url: string;
    };
    finishStep: {
        description: string;
        action: {
            text: string;
            handler: () => void;
        };
    };
    initialMessage: {
        description: string;
        action: {
            text: string;
        };
    };
    description: string;
    steps: {
        description: string;
        action: {
            text: string;
            handler: () => void;
        };
    }[];
};
/**
 * Mock TICloudAgent namespace, but with only the functions we care about
 *
 */
declare class MockAgentNamespace implements Partial<typeof TICloudAgent> {
    private readonly options;
    Install: {
        getInstallWizard: () => Promise<{
            title: string;
            detailsLink: {
                text: string;
                url: string;
            };
            helpLink: {
                text: string;
                url: string;
            };
            finishStep: {
                description: string;
                action: {
                    text: string;
                    handler: () => void;
                };
            };
            initialMessage: {
                description: string;
                action: {
                    text: string;
                };
            };
            description: string;
            steps: {
                description: string;
                action: {
                    text: string;
                    handler: () => void;
                };
            }[];
        }>;
    };
    private agent;
    constructor(options: Options);
    Init(): Promise<TICloudAgent.AgentModule>;
}
/**
 * Install a mock TICloudAgent with the given options
 *
 */
export declare function installCloudAgent(options: Options): MockAgentNamespace;
/**
 * Remove any mock TICloudAgent
 *
 */
export declare function uninstallCloudAgent(): void;
export declare function getRexCloudAgentModuleSpies(): _.Dictionary<{
    callCount: number;
    args: any[][];
}>;
export declare function getFullRexCloudAgentModuleSpies(): {
    readonly ENTRY_MODULE_TYPE: sinon.SinonSpy;
    init: sinon.SinonSpy;
    onClose: sinon.SinonSpy;
    getEntryModuleType: sinon.SinonSpy;
    getCCSEclipseInitValues: sinon.SinonSpy;
    addListener: sinon.SinonSpy;
    removeListener: sinon.SinonSpy;
    getPackageInstallInfo: sinon.SinonSpy;
    getInstalledPackages: sinon.SinonSpy;
    getAgentMode: sinon.SinonSpy;
    getProgress: sinon.SinonSpy;
    getVersion: sinon.SinonSpy;
    clearTaskProgress: sinon.SinonSpy;
    installPackage: sinon.SinonSpy;
    uninstallPackage: sinon.SinonSpy;
    importProject: sinon.SinonSpy;
    openExternally: sinon.SinonSpy;
    onProductsChanged: sinon.SinonSpy;
    getBoardAndDeviceInfo: sinon.SinonSpy;
    getInstallInfoForPackageDependencies: sinon.SinonSpy;
    getInstallInfoForPackages: sinon.SinonSpy;
    _addProgressTask: sinon.SinonSpy;
};
export {};
