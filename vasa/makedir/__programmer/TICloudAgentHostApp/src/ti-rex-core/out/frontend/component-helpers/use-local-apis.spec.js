"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const Data = require("../../test/frontend/data");
const util_1 = require("../../test/frontend/util");
const util_2 = require("../../test/frontend/enzyme/util");
const use_local_apis_1 = require("./use-local-apis");
const create_app_props_1 = require("../testing-helpers/create-app-props");
const page_1 = require("../../shared/routes/page");
const mock_agent_1 = require("../mock-agent/mock-agent");
const interface_1 = require("../../cloudagent/interface");
const delay_1 = require("../../test/delay");
const hook_tests_1 = require("./hook-tests");
const mock_rex_cloud_agent_module_1 = require("../mock-agent/mock-rex-cloud-agent-module");
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Package Nodes
packageNode2, packageNode61, 
// Folder nodes
folderNode6, 
// PackageGroups
packageGroup2, packageGroup61, 
// Packages
package2, package61 } = Data;
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package61],
        packageGroups: [packageGroup2, packageGroup61]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode61].map(item => item.nodeDbId),
        [packageNode2.nodeDbId]: [folderNode6].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode61.nodeDbId]: packageNode61,
        [folderNode6.nodeDbId]: folderNode6
    }
};
const displayTestOptions = {
    installInfo: ['/home/auser'],
    localPackages: [{ pkg: package2, path: '/home/auser/foo' }].map(({ pkg, path }) => Data.createInstalledPackageData(pkg, path)),
    agentMode: 'desktop'
};
const operationResult1 = 'I am the result';
const operationError1 = new Error('I am the error');
const operation1 = (pass = true) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (pass) {
                resolve(operationResult1);
            }
            else {
                reject(operationError1);
            }
        }, 10);
    });
};
const errorCallback = {
    current: sinon.stub()
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
const EVENT_DELAY_MS = 200;
describe('[frontend] use-local-apis', function () {
    before(async () => {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupEnzymeTest)({ data: data1 });
    });
    after(() => {
        (0, util_1.cleanupEnzymeTest)();
    });
    describe('useApi', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        it('Should handle agent not available (allowNoAgent = true)', async function () {
            // First test seems to take some time (should investigate)
            this.timeout(10000);
            const placeholder = 'Placeholder value';
            const hook = () => (0, use_local_apis_1._useApi)({
                errorCallback,
                allowNoAgent: true,
                api: () => operation1(),
                dependencies: [],
                placeholder
            }).result;
            const { result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.deep.equal(placeholder);
        });
        it('Should handle agent not available (allowNoAgent = false)', async function () {
            const placeholder = 'Placeholder value';
            const hook = () => (0, use_local_apis_1._useApi)({
                errorCallback,
                allowNoAgent: false,
                api: () => operation1(),
                dependencies: [],
                placeholder
            }).result;
            await (0, expect_1.expect)((0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback))).to.eventually.be.rejectedWith('Could not get agent');
        });
        it('Should get the result from an api', async function () {
            await (0, mock_agent_1.installCloudAgent)({}).Init();
            const hook = () => (0, use_local_apis_1._useApi)({
                errorCallback,
                allowNoAgent: false,
                api: () => operation1(),
                dependencies: [],
                placeholder: ''
            }).result;
            const { result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.deep.equal(operationResult1);
        });
    });
    describe('useApiWithEvent', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        let onResultUpdated = () => {
            throw new Error('onResultUpdated never set');
        };
        const evtHandling = function (onResultUpdatedInner) {
            onResultUpdated = onResultUpdatedInner;
            return () => { };
        };
        it('Should handle agent not available (allowNoAgent = true)', async function () {
            const placeholder = 'Placeholder value';
            const hook = () => (0, use_local_apis_1._useApiWithEvent)({
                errorCallback,
                allowNoAgent: true,
                api: () => operation1(),
                dependencies: [],
                placeholder,
                evtHandling
            }).result;
            const { result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.deep.equal(placeholder);
        });
        it('Should handle agent not available (allowNoAgent = false)', async function () {
            const placeholder = 'Placeholder value';
            const hook = () => (0, use_local_apis_1._useApiWithEvent)({
                errorCallback,
                allowNoAgent: false,
                api: () => operation1(),
                dependencies: [],
                placeholder,
                evtHandling
            }).result;
            await (0, expect_1.expect)((0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback))).to.eventually.be.rejectedWith('Could not get agent');
        });
        it('Should get the result from an api', async function () {
            await (0, mock_agent_1.installCloudAgent)({}).Init();
            const hook = () => (0, use_local_apis_1._useApiWithEvent)({
                errorCallback,
                allowNoAgent: false,
                api: () => operation1(),
                dependencies: [],
                placeholder: '',
                evtHandling
            }).result;
            const { result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.deep.equal(operationResult1);
        });
        it('Should handle an event', async function () {
            await (0, mock_agent_1.installCloudAgent)({}).Init();
            const updatedResult = 'Updated result';
            // Get initial value
            const hook = () => (0, use_local_apis_1._useApiWithEvent)({
                errorCallback,
                allowNoAgent: false,
                api: () => operation1(),
                dependencies: [],
                placeholder: '',
                evtHandling
            }).result;
            const { result, wrapper } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.deep.equal(operationResult1);
            // Send event
            (0, util_2.doAct)(() => {
                onResultUpdated(updatedResult);
                wrapper.setProps({});
            });
            // See if result updated
            const result2 = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result2).to.deep.equal(updatedResult);
        });
    });
    describe('useGetPackageInstallInfo', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        (0, hook_tests_1.doCommonTests)(() => setup(displayTestOptions), getHook, result => {
            (0, expect_1.expect)(result).to.deep.equal(displayTestOptions.installInfo);
        }, errorCallback);
        {
            const updatedInstallInfo = [
                ...(displayTestOptions.installInfo || []),
                '/home/auser/ti'
            ];
            const updateTestOptions = {
                ...displayTestOptions,
                tirexTriggerEvents: {
                    ...displayTestOptions.tirexTriggerEvents,
                    ["OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */]: {
                        delay: EVENT_DELAY_MS,
                        data: updatedInstallInfo
                    }
                }
            };
            (0, hook_tests_1.doUpdateTest)(() => setup(updateTestOptions), getHook, (result, done) => {
                (0, expect_1.expect)(result).to.deep.equal(done ? updatedInstallInfo : displayTestOptions.installInfo);
            }, errorCallback, EVENT_DELAY_MS);
        }
        // Helpers
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            return { data: appProps, spy: spies.getPackageInstallInfo };
        }
        function getHook(appProps) {
            return () => (0, use_local_apis_1.useGetPackageInstallInfo)({ appProps, errorCallback }).result;
        }
    });
    describe('useGetInstalledPackages', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        (0, hook_tests_1.doCommonTests)(() => setup(displayTestOptions), getHook, result => {
            (0, expect_1.expect)(result).to.deep.equal(displayTestOptions.localPackages);
        }, errorCallback);
        {
            const updatedInstalledPackages = [
                ...(displayTestOptions.localPackages || []),
                Data.createInstalledPackageData(package61, '/home/auser/bar')
            ];
            const updateTestOptions = {
                ...displayTestOptions,
                tirexTriggerEvents: {
                    ...displayTestOptions.tirexTriggerEvents,
                    ["OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */]: {
                        delay: EVENT_DELAY_MS,
                        data: updatedInstalledPackages
                    }
                }
            };
            (0, hook_tests_1.doUpdateTest)(() => setup(updateTestOptions), getHook, (result, done) => {
                (0, expect_1.expect)(result).to.deep.equal(done ? updatedInstalledPackages : displayTestOptions.localPackages);
            }, errorCallback, EVENT_DELAY_MS);
        }
        // Helpers
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            return { data: appProps, spy: spies.getInstalledPackages };
        }
        function getHook(appProps) {
            return () => (0, use_local_apis_1.useGetInstalledPackages)({ appProps, errorCallback }).result;
        }
    });
    describe('useGetAgentMode', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        (0, hook_tests_1.doCommonTests)(() => setup(displayTestOptions), getHook, result => {
            (0, expect_1.expect)(result).to.deep.equal(displayTestOptions.agentMode);
        }, errorCallback);
        it('Should handle agentMode = cloud', async function () {
            const options = { ...displayTestOptions, agentMode: 'cloud' };
            const { data: appProps } = await setup(options);
            const { result } = await (0, util_2.waitForHookResult)(getHook(appProps), val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.deep.equal(options.agentMode);
        });
        // Helpers
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            return { data: appProps, spy: spies.getAgentMode };
        }
        function getHook(appProps) {
            return () => (0, use_local_apis_1.useGetAgentMode)({ appProps, errorCallback }).result;
        }
    });
    describe('useGetProgress - REX-729#1', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        (0, hook_tests_1.doCommonTests)(() => setup(displayTestOptions), getHook, result => {
            (0, expect_1.expect)(Object.keys(result || {})).to.have.lengthOf(1);
        }, errorCallback);
        (0, hook_tests_1.doUpdateTest)(() => setup(displayTestOptions), getHook, (result, done) => {
            result = result || {};
            const keys = Object.keys(result);
            (0, expect_1.expect)(keys).to.have.lengthOf(1);
            const progress = result[keys[0]];
            (0, expect_1.expect)(progress.isComplete).to.equal(done);
        }, errorCallback, EVENT_DELAY_MS);
        // Helpers
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            const rexModule = await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            // Inject progress
            const register1 = await rexModule._addProgressTask();
            register1((0, delay_1.delay)(EVENT_DELAY_MS));
            return { data: appProps, spy: spies.getProgress };
        }
        function getHook(appProps) {
            return () => (0, use_local_apis_1.useGetProgress)({ appProps, errorCallback }).result;
        }
    });
    describe('useClearTaskProgress', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        {
            const deps = {
                trigger: false,
                progressId: 'temp'
            };
            (0, hook_tests_1.doTriggerTest)(async () => {
                const result = await setup(displayTestOptions);
                // Wait until progress done
                await (0, delay_1.delay)(EVENT_DELAY_MS * 2);
                deps.progressId = result.data.progressId;
                return result;
            }, ({ appProps }) => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps);
        }
        {
            const deps = {
                progressId: 'temp'
            };
            const updatedDeps = {
                progressId: 'temp2'
            };
            (0, hook_tests_1.doDependencyTest)(async () => {
                const result = await setup(displayTestOptions);
                // Wait until progress done
                await (0, delay_1.delay)(EVENT_DELAY_MS * 2);
                deps.progressId = result.data.progressId;
                updatedDeps.progressId = result.data.progressId2;
                return result;
            }, ({ appProps }) => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            const rexModule = await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            // Inject progress
            const register1 = await rexModule._addProgressTask();
            const progressId = register1((0, delay_1.delay)(EVENT_DELAY_MS));
            const register2 = await rexModule._addProgressTask();
            const progressId2 = register2((0, delay_1.delay)(EVENT_DELAY_MS));
            return { data: { appProps, progressId, progressId2 }, spy: spies.clearTaskProgress };
        }
        function createHook(deps, appProps) {
            return () => {
                const { progressId, trigger = true } = deps;
                return (0, use_local_apis_1.useClearTaskProgress)({
                    appProps,
                    errorCallback,
                    progressId,
                    trigger
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { progressId } = deps;
            return verifyResult(count, [progressId], spy, result);
        }
        async function verifyResult(expectedCallCount, args, spy, result) {
            (0, expect_1.expect)(result).to.be.true;
            (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCount);
            (0, expect_1.expect)(spy.args[expectedCallCount - 1]).to.deep.equal(args);
        }
    });
    describe('useImportProject', function () {
        this.timeout(mock_rex_cloud_agent_module_1.MockRexCloudAgentModule.DELAY * 10);
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        {
            const deps = {
                resourceType: "project.ccs" /* ProjectType.CCS */,
                packageUid: package2.packagePublicUid,
                location: '/home/auser/bar',
                targetId: null,
                trigger: false
            };
            (0, hook_tests_1.doTriggerTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps);
        }
        {
            const deps = {
                location: null,
                resourceType: null,
                targetId: null,
                packageUid: null
            };
            const updatedDeps = {
                location: '/home/auser/bar',
                resourceType: "project.ccs" /* ProjectType.CCS */,
                packageUid: package2.packagePublicUid,
                targetId: null // Does not need to be set
            };
            (0, hook_tests_1.doWaitUntilOptionsSetTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        {
            const deps = {
                location: '/home/auser/bar',
                resourceType: "project.ccs" /* ProjectType.CCS */,
                targetId: '7',
                packageUid: package2.packagePublicUid
            };
            const updatedDeps = {
                location: '/home/auser/baz',
                resourceType: "project.energia" /* ProjectType.ENERGIA */,
                targetId: '8',
                packageUid: package61.packagePublicUid
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            return { data: appProps, spy: spies.importProject };
        }
        function createHook(deps, appProps) {
            return () => {
                const { location, resourceType, targetId, packageUid, trigger = true } = deps;
                return (0, use_local_apis_1.useImportProject)({
                    appProps,
                    errorCallback,
                    resourceType,
                    packageUid,
                    location,
                    targetId,
                    trigger,
                    projectName: null
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { location, resourceType, targetId, packageUid } = deps;
            if (!location || !resourceType || !packageUid) {
                throw new Error('Did not set deps correctly');
            }
            return verifyResult(count, [resourceType, packageUid, location, targetId, null], spy, result);
        }
        async function verifyResult(expectedCallCount, args, spy, result) {
            (0, expect_1.expect)(result).to.be.true;
            (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCount);
            (0, expect_1.expect)(spy.args[expectedCallCount - 1]).to.deep.equal(args);
        }
    });
    describe('useInstallPackage', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        {
            const deps = {
                pkg: package2,
                installLocation: '/home/auser/bar',
                trigger: false
            };
            (0, hook_tests_1.doTriggerTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps);
        }
        {
            const deps = {
                pkg: null,
                installLocation: null
            };
            const updatedDeps = {
                pkg: package2,
                installLocation: '/home/auser/bar'
            };
            (0, hook_tests_1.doWaitUntilOptionsSetTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        {
            const deps = {
                installLocation: '/home/auser/bar',
                pkg: package2
            };
            const updatedDeps = {
                installLocation: '/home/auser/baz',
                pkg: package61
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        it.skip('Should handle bulk requests', async function () { });
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            return { data: appProps, spy: spies.installPackage };
        }
        function createHook(deps, appProps) {
            return () => {
                const { pkg, installLocation, trigger = true } = deps;
                return (0, use_local_apis_1.useInstallPackage)({
                    appProps,
                    errorCallback,
                    installLocation,
                    pkg,
                    trigger
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { pkg, installLocation } = deps;
            if (!pkg || !installLocation) {
                throw new Error('Did not set deps correctly');
            }
            return verifyResult(count, [pkg, installLocation], spy, result);
        }
        async function verifyResult(expectedCallCount, args, spy, result) {
            (0, expect_1.expect)(result).to.be.not.null;
            (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCount);
            (0, expect_1.expect)(spy.args[expectedCallCount - 1]).to.deep.equal(args);
        }
    });
    describe('useUninstallPackage', function () {
        afterEach(() => {
            errorCallback.current.resetHistory();
            (0, mock_agent_1.uninstallCloudAgent)();
        });
        {
            const deps = {
                pkg: package2,
                trigger: false
            };
            (0, hook_tests_1.doTriggerTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps);
        }
        {
            const deps = {
                pkg: package2
            };
            const updatedDeps = {
                pkg: package61
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(displayTestOptions), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        async function setup(options) {
            const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            // Setup spies
            await agent.getSubModule(interface_1.rexCloudAgentModuleName);
            const spies = (0, mock_agent_1.getFullRexCloudAgentModuleSpies)();
            return { data: appProps, spy: spies.uninstallPackage };
        }
        function createHook(deps, appProps) {
            return () => {
                const { pkg, trigger = true } = deps;
                return (0, use_local_apis_1.useUninstallPackage)({
                    appProps,
                    errorCallback,
                    pkg,
                    trigger
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { pkg } = deps;
            return verifyResult(count, [pkg], spy, result);
        }
        async function verifyResult(expectedCallCount, args, spy, result) {
            (0, expect_1.expect)(result).to.be.not.null;
            (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCount);
            (0, expect_1.expect)(spy.args[expectedCallCount - 1]).to.deep.equal(args);
        }
    });
});
