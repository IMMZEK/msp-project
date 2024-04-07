"use strict";
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullRexCloudAgentModuleSpies = exports.getRexCloudAgentModuleSpies = exports.uninstallCloudAgent = exports.installCloudAgent = exports.mockInstallWizard = void 0;
const sinon = require("sinon");
const mock_device_detector_module_1 = require("./mock-device-detector-module");
const mock_rex_cloud_agent_module_1 = require("./mock-rex-cloud-agent-module");
const util_1 = require("../component-helpers/util");
const util_2 = require("../../shared/util");
///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
let rexCloudAgentModuleSpies;
// I'm using close to the real data here, but for only one case
// Allows this to be used for styling too
exports.mockInstallWizard = {
    title: 'TI Cloud Agent Setup',
    detailsLink: {
        text: "What's this?",
        url: 'http://processors.wiki.ti.com/index.php/TI_Cloud_Agent#What_is_it.3F'
    },
    helpLink: {
        text: 'Help. I already did this',
        url: 'http://processors.wiki.ti.com/index.php/TI_Cloud_Agent#Troubleshooting'
    },
    finishStep: {
        description: 'Refresh the current browser page',
        action: {
            text: '$Refresh$ Page',
            handler: () => { }
        }
    },
    initialMessage: {
        description: 'Install TI Cloud Agent to enable flashing.',
        action: {
            text: 'Install TI Cloud Agent to enable flashing.'
        }
    },
    description: 'Hardware interaction requires additional one time set up.' +
        ' Please perform the actions listed below and try your operation again.',
    steps: [
        {
            description: 'Install the TI Cloud Agent browser extension.',
            action: {
                text: '$Install$ browser extension',
                handler: () => { }
            }
        },
        {
            description: 'Download and install the TI Cloud Agent host application.',
            action: {
                text: '$Download$ and install the TI Cloud Agent Application',
                handler: () => { }
            }
        }
    ]
};
/**
 * Mock TICloudAgent main module, but with only the functions we care about
 *
 */
class MockAgentModule {
    options;
    subModules = {};
    constructor(options) {
        this.options = options;
    }
    async getSubModule(subModuleName) {
        if (this.options.errorGetSubModule) {
            throw new Error('host communication error');
        }
        let subModule;
        if (subModuleName === 'DeviceDetector') {
            subModule =
                this.subModules[subModuleName] || new mock_device_detector_module_1.MockDeviceDetectorModule(this.options);
        }
        else if (subModuleName === 'Tirex') {
            subModule = this.subModules[subModuleName] || new mock_rex_cloud_agent_module_1.MockRexCloudAgentModule(this.options);
        }
        else {
            throw new Error('Unknown Module');
        }
        if (!this.subModules[subModuleName] && subModule instanceof mock_rex_cloud_agent_module_1.MockRexCloudAgentModule) {
            setupMockRexCloudAgentModuleSpies(subModule);
        }
        this.subModules[subModuleName] = this.subModules[subModuleName] || subModule;
        // @ts-ignore - we want to be able to implement a partial interface
        return subModule;
    }
}
/**
 * Mock TICloudAgent namespace, but with only the functions we care about
 *
 */
class MockAgentNamespace {
    options;
    Install = {
        getInstallWizard: async () => {
            return exports.mockInstallWizard;
        }
    };
    agent = null;
    constructor(options) {
        this.options = options;
    }
    async Init() {
        if (this.options.agentNotInstalled) {
            throw new Error('agent not installed');
        }
        else {
            // Casting allows us to return a partial version that only has the functions needed
            this.agent = this.agent || new MockAgentModule(this.options);
            if (!this.agent) {
                // For ts
                throw new Error('Agent is null');
            }
            return this.agent;
        }
    }
}
/**
 * Install a mock TICloudAgent with the given options
 *
 */
function installCloudAgent(options) {
    const mockAgentNamespace = new MockAgentNamespace(options);
    if ((0, util_1.isBrowserEnvironment)()) {
        window.TICloudAgent = mockAgentNamespace;
    }
    else {
        // @ts-ignore
        global.TICloudAgent = mockAgentNamespace;
    }
    return mockAgentNamespace;
}
exports.installCloudAgent = installCloudAgent;
/**
 * Remove any mock TICloudAgent
 *
 */
function uninstallCloudAgent() {
    if ((0, util_1.isBrowserEnvironment)()) {
        // @ts-ignore typescript not detecting window.TICloudAgent being optional
        delete window.TICloudAgent;
    }
    else {
        // @ts-ignore
        delete global.TICloudAgent;
    }
    // We have to do some busy waiting on desktop for the value to be injected.
    // We keep a cached promise to make this more efficient.
    (0, util_1._clearTICloudAgentObject)();
}
exports.uninstallCloudAgent = uninstallCloudAgent;
function getRexCloudAgentModuleSpies() {
    if (!rexCloudAgentModuleSpies) {
        throw new Error('Tried to call getRexCloudAgentModuleSpies before submodule was created');
    }
    // sinon spy does lazy evaluation so we can't just return it (will just be empty)
    // need to capture what we need then return it
    // Note: we lose the method typing on the keys, just widens to string, with this method
    const obj = (0, util_2.objectFromKeyValuePairs)((0, util_2.getObjectKeys)(rexCloudAgentModuleSpies).map(method => {
        const spy = rexCloudAgentModuleSpies[method];
        const value = {
            callCount: spy.callCount,
            args: spy.args
        };
        return { key: method, value };
    }));
    return obj;
}
exports.getRexCloudAgentModuleSpies = getRexCloudAgentModuleSpies;
function getFullRexCloudAgentModuleSpies() {
    if (!rexCloudAgentModuleSpies) {
        throw new Error('Tried to call getRexCloudAgentModuleSpies before submodule was created');
    }
    return rexCloudAgentModuleSpies;
}
exports.getFullRexCloudAgentModuleSpies = getFullRexCloudAgentModuleSpies;
function setupMockRexCloudAgentModuleSpies(mod) {
    rexCloudAgentModuleSpies = {
        ENTRY_MODULE_TYPE: sinon.spy(mod, 'ENTRY_MODULE_TYPE'),
        init: sinon.spy(mod, 'init'),
        onClose: sinon.spy(mod, 'onClose'),
        getEntryModuleType: sinon.spy(mod, 'getEntryModuleType'),
        getCCSEclipseInitValues: sinon.spy(mod, 'getCCSEclipseInitValues'),
        addListener: sinon.spy(mod, 'addListener'),
        removeListener: sinon.spy(mod, 'removeListener'),
        getPackageInstallInfo: sinon.spy(mod, 'getPackageInstallInfo'),
        getInstalledPackages: sinon.spy(mod, 'getInstalledPackages'),
        getAgentMode: sinon.spy(mod, 'getAgentMode'),
        getProgress: sinon.spy(mod, 'getProgress'),
        getVersion: sinon.spy(mod, 'getVersion'),
        clearTaskProgress: sinon.spy(mod, 'clearTaskProgress'),
        installPackage: sinon.spy(mod, 'installPackage'),
        uninstallPackage: sinon.spy(mod, 'uninstallPackage'),
        importProject: sinon.spy(mod, 'importProject'),
        openExternally: sinon.spy(mod, 'openExternally'),
        onProductsChanged: sinon.spy(mod, 'onProductsChanged'),
        getBoardAndDeviceInfo: sinon.spy(mod, 'getBoardAndDeviceInfo'),
        getInstallInfoForPackageDependencies: sinon.spy(mod, 'getInstallInfoForPackageDependencies'),
        getInstallInfoForPackages: sinon.spy(mod, 'getInstallInfoForPackages'),
        _addProgressTask: sinon.spy(mod, '_addProgressTask')
    };
}
