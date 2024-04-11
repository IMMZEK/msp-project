"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const _ = require("lodash");
const path = require("path");
const fs = require("fs-extra");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const expect_1 = require("../test/expect");
const testing_util_1 = require("./testing-util");
const util_1 = require("./util");
const database_utils_1 = require("../test/integration-tests/database-utils");
const response_data_1 = require("../shared/routes/response-data");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const devices = [(0, database_utils_1.generateDevice)('DEVICE1', 'device1')];
const devtools = [(0, database_utils_1.generateDevtool)('BOARD1', 'board1')];
// overviews
const overview1 = (0, database_utils_1.generatePackageOverview)('package1', '1.0.0.0', {
    localPackagePath: (0, test_helpers_1.getUniqueFolderName)()
});
// projects
const project1 = (0, database_utils_1.generateResource)('test.projectspec', overview1, devices[0], devtools[0], {
    resourceType: 'project.ccs',
    link: 'test.projectspec',
    categories: [],
    fullPaths: [],
    _importProjectCCS: 'some path'
});
const project2 = (0, database_utils_1.generateResource)('test.projectspec', overview1, devices[0], devtools[0], {
    resourceType: 'project.energia',
    link: 'test.projectspec',
    categories: [],
    fullPaths: [],
    _importProjectCCS: 'some path'
});
const project3 = (0, database_utils_1.generateResource)('test.projectspec', overview1, devices[0], devtools[0], {
    resourceType: 'project.iar',
    link: 'test.projectspec',
    categories: [],
    fullPaths: [],
    _importProjectCCS: 'some path'
});
const project4 = (0, database_utils_1.generateResource)('test.projectspec', overview1, devices[0], devtools[0], {
    resourceType: 'file.importable',
    link: 'test.projectspec',
    categories: [],
    fullPaths: [],
    _importProjectCCS: 'some path'
});
const project5 = (0, database_utils_1.generateResource)('test.projectspec', overview1, devices[0], devtools[0], {
    resourceType: 'folder.importable',
    link: 'test.projectspec',
    categories: [],
    fullPaths: [],
    _importProjectCCS: 'some path'
});
// packages
const package1 = {
    packageOverview: overview1,
    overviews: [],
    resources: [project1, project2, project3, project4, project5],
    simpleCategories: []
};
// metadata objs
const metadata1 = { devices: [], devtools: [], packages: [package1] };
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[cloudagent] CCSAdapter', function () {
    describe('initial discovery', function () {
        it('should query for packages discovered with IDE at startup', async function () {
            const onIDERequest = sinon.stub();
            await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            await (0, testing_util_1.waitForCallWithArgs)(onIDERequest, "/ide/getProducts" /* CCS_ECLIPSE_API.GET_PRODUCTS */);
        });
        it('should request that deleted packages have their metadata deleted', async function () {
            const { offlineMetadataManager, progressManager } = await (0, testing_util_1.createCCSAdapter)({
                metadata: metadata1
            });
            const spy = sinon.spy(offlineMetadataManager, 'removePackageMetadata');
            await progressManager.waitForTasks();
            (0, expect_1.expect)(spy.calledOnce).to.be.true;
            (0, expect_1.expect)(spy.args[0][0]).to.equal(overview1.packageUId);
        });
        it('should request that new discovered packages have their metadata downloaded', async function () {
            // Create a physical package.tirex.json so we know what to fetch
            const location = (0, test_helpers_1.getUniqueFolderName)();
            await fs.mkdirs(path.join(location, '.metadata', '.tirex'));
            await fs.writeJson(path.join(location, '.metadata', '.tirex', 'package.tirex.json'), [
                {
                    id: 'id',
                    version: 'version'
                }
            ]);
            // Have the ide say it saw that new package
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/getProducts" /* CCS_ECLIPSE_API.GET_PRODUCTS */) {
                    return [{ location }];
                }
                return;
            });
            const { offlineMetadataManager, progressManager } = await (0, testing_util_1.createCCSAdapter)({
                onIDERequest
            });
            // We should see a request to offline the metadata refered to by that json file
            const spy = sinon.spy(offlineMetadataManager, 'offlinePackageMetadata');
            await progressManager.waitForTasks();
            (0, expect_1.expect)(spy.calledOnce).to.be.true;
            (0, expect_1.expect)(spy.args[0][0]).to.equal('id__version');
            (0, expect_1.expect)(spy.args[0][1]).to.equal(location);
            (0, expect_1.expect)(spy.args[0][3]).to.equal(true);
        });
        it('should not request that existing packages have their metadata downloaded', async function () {
            // Create a physical representation of known metadata (so it isn't deleted on us)
            const location = overview1.localPackagePath;
            await fs.mkdirs(path.join(location, '.metadata', '.tirex'));
            await fs.writeJson(path.join(location, '.metadata', '.tirex', 'package.tirex.json'), [
                {
                    id: overview1.id,
                    version: overview1.version
                }
            ]);
            // Have the ide say it sees that existing package
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/getProducts" /* CCS_ECLIPSE_API.GET_PRODUCTS */) {
                    return [
                        {
                            location,
                            id: overview1.id,
                            version: overview1.version
                        }
                    ];
                }
                return;
            });
            const { offlineMetadataManager, progressManager } = await (0, testing_util_1.createCCSAdapter)({
                onIDERequest,
                metadata: metadata1
            });
            // There should be no request to delete that package, or offline it
            const offline = sinon.spy(offlineMetadataManager, 'offlinePackageMetadata');
            const remove = sinon.spy(offlineMetadataManager, 'removePackageMetadata');
            await progressManager.waitForTasks();
            (0, expect_1.expect)(offline.calledOnce).to.be.false;
            (0, expect_1.expect)(remove.calledOnce).to.be.false;
        });
        it('should create progress tasks for initial package discovery', async function () {
            // Setup
            const triggerEventSpy = sinon.stub();
            await (0, testing_util_1.createCCSAdapter)({ triggerEventSpy });
            // Wait for initial progress message
            await (0, testing_util_1.waitForCallWithArgs)(triggerEventSpy, "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */);
            const firstCall = triggerEventSpy.withArgs("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */).firstCall;
            const progress = firstCall.args[1];
            (0, expect_1.expect)(_.size(progress)).to.equal(1);
            (0, expect_1.expect)(Object.values(progress)).to.deep.equal([
                {
                    progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                    name: 'Scanning for file system changes',
                    subActivity: '',
                    isFirstUpdate: true,
                    isComplete: false,
                    error: null
                }
            ]);
            // Eventually the task should be auto removed if it succeeded
            let lastProgressResult;
            do {
                await (0, testing_util_1.waitForCallWithArgs)(triggerEventSpy, "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */);
                const lastCall = triggerEventSpy.withArgs("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */).lastCall;
                lastProgressResult = lastCall.args[1];
                const completedResult = _.find(lastProgressResult, (r) => r.isComplete);
                if (completedResult) {
                    if (completedResult.error) {
                        throw new Error(completedResult.error);
                    }
                    else {
                        throw new Error('Progress did not auto-remove');
                    }
                }
                if (!_.isEmpty(lastProgressResult)) {
                    triggerEventSpy.resetHistory();
                }
            } while (!_.isEmpty(lastProgressResult));
            // And that progress should self-deregister from the list (non-user initiated)
            (0, expect_1.expect)(_.size(lastProgressResult)).to.equal(0);
        });
        it('should handle errors for initial package discovery', async function () {
            // Setup
            const triggerEventSpy = sinon.stub();
            const onIDERequest = sinon.stub().callsFake(() => {
                throw new Error('IDE messed up');
            });
            await (0, testing_util_1.createCCSAdapter)({ triggerEventSpy, onIDERequest });
            // Eventually we should see a final progress message indicating error
            let lastProgressResult;
            let lastProgress;
            do {
                await (0, testing_util_1.waitForCallWithArgs)(triggerEventSpy, "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */);
                const lastCall = triggerEventSpy.withArgs("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */).lastCall;
                lastProgressResult = lastCall.args[1];
                (0, expect_1.expect)(_.size(lastProgressResult)).to.equal(1);
                lastProgress = Object.values(lastProgressResult)[0];
                if (!lastProgress.isComplete) {
                    triggerEventSpy.resetHistory();
                }
            } while (!lastProgress.isComplete);
            (0, expect_1.expect)(lastProgress.error).to.contain('IDE messed up');
        });
    });
    describe('notifyIDEPackagesChanged', function () {
        it('should notify IDE', async function () {
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            await ccsAdapter.notifyIDEPackagesChanged();
            onIDERequest.calledWith("/ide/rediscoverProducts" /* CCS_ECLIPSE_API.REDISCOVER_PRODUCTS */);
        });
        it('should report IDE errors', async function () {
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/rediscoverProducts" /* CCS_ECLIPSE_API.REDISCOVER_PRODUCTS */) {
                    throw new Error('IDE messed up');
                }
            });
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            await (0, expect_1.expect)(ccsAdapter.notifyIDEPackagesChanged()).to.eventually.be.rejectedWith('IDE messed up');
        });
    });
    describe('getSearchPaths', function () {
        const isWindows = (0, util_1.getPlatform)() === response_data_1.Platform.WINDOWS;
        const discoveryPaths = isWindows
            ? ['c:\\ti\\', 'c:\\ti\\product\\', 'c:\\ti\\msp\\', 'c:\\ti\\msp\\product\\']
            : [
                '/home/auser/ti/',
                '/home/auser/ti/product/',
                '/home/auser/ti/msp/',
                '/home/auser/ti/msp/product/'
            ];
        const productPaths = isWindows
            ? ['c:\\ti\\product\\', 'c:\\ti\\msp\\product\\']
            : ['/home/auser/ti/product/', '/home/auser/ti/msp/product/'];
        const searchPaths = isWindows
            ? ['c:\\ti\\', 'c:\\ti\\msp\\']
            : ['/home/auser/ti/', '/home/auser/ti/msp/'];
        it('should return paths from IDE', async function () {
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */) {
                    return discoveryPaths;
                }
                return;
            });
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            const returnedPaths = await ccsAdapter.getSearchPaths();
            (0, expect_1.expect)(returnedPaths).to.deep.equal(discoveryPaths.sort());
        });
        it('should exclude paths where there is a product installed', async function () {
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */) {
                    return discoveryPaths;
                }
                if (pathname === "/ide/getProducts" /* CCS_ECLIPSE_API.GET_PRODUCTS */) {
                    return productPaths.map((location) => ({ location }));
                }
                return;
            });
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            const returnedPaths = await ccsAdapter.getSearchPaths();
            // should be sorted, and ~/ti/foo should be removed as it's a child of ~/ti
            (0, expect_1.expect)(returnedPaths).to.deep.equal(searchPaths.sort());
        });
        it('should exclude paths ending with xdctools', async function () {
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */) {
                    return [...discoveryPaths, path.join(discoveryPaths[0], 'xdctools_3_24_05_48')];
                }
                return;
            });
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            const returnedPaths = await ccsAdapter.getSearchPaths();
            (0, expect_1.expect)(returnedPaths).to.deep.equal(discoveryPaths.sort());
        });
        it('should exclude "ccs" folder', async function () {
            const pathExistsSync = fs.pathExistsSync;
            try {
                // @ts-ignore
                fs.pathExistsSync = sinon.fake.returns(true);
                const onIDERequest = sinon.stub().callsFake((pathname) => {
                    if (pathname === "/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */) {
                        // add both ccs and ccsv# versions
                        return [
                            ...discoveryPaths,
                            path.join(discoveryPaths[0], 'ccs'),
                            path.join(discoveryPaths[0], 'ccsv8')
                        ];
                    }
                    return;
                });
                const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
                const returnedPaths = await ccsAdapter.getSearchPaths();
                (0, expect_1.expect)(returnedPaths).to.deep.equal(discoveryPaths.sort());
            }
            finally {
                // @ts-ignore
                fs.pathExistsSync = pathExistsSync;
            }
        });
        for (const api of ["/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */, "/ide/getProducts" /* CCS_ECLIPSE_API.GET_PRODUCTS */]) {
            it(`should report IDE errors on ${api}`, async function () {
                const onIDERequest = sinon.stub().callsFake((pathname) => {
                    if (pathname === api) {
                        throw new Error('IDE messed up');
                    }
                });
                const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
                await (0, expect_1.expect)(ccsAdapter.getSearchPaths()).to.eventually.be.rejectedWith('IDE messed up');
            });
        }
        it('should move the default path to the top', async function () {
            // Return the discovery paths, but not in sorted order
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/syncProductDiscoveryPath" /* CCS_ECLIPSE_API.SYNC_SEARCH_PATH */) {
                    return [
                        discoveryPathsWithNonTopDefault[1],
                        discoveryPathsWithNonTopDefault[0],
                        discoveryPathsWithNonTopDefault[2]
                    ];
                }
                return;
            });
            // Create the adapter, then create discovery paths where the default path is
            // at the top, but other paths sort before/after it
            const { ccsAdapter, commonParams } = await (0, testing_util_1.createCCSAdapter)({ onIDERequest });
            const { contentBasePath } = commonParams.vars;
            const parentPath = path.dirname(contentBasePath);
            const basePath = path.basename(contentBasePath);
            const discoveryPathsWithNonTopDefault = [
                contentBasePath + path.sep,
                path.join(parentPath, '_' + basePath) + path.sep,
                path.join(parentPath, basePath + '2' + path.sep)
            ];
            // Expect that we see that same sort order (ie default is first)
            const returnedPaths = await ccsAdapter.getSearchPaths();
            (0, expect_1.expect)(returnedPaths).to.deep.equal(discoveryPathsWithNonTopDefault);
        });
    });
    describe('importProject', function () {
        it('should notify ide to do an import', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project1;
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { resourceType, packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await ccsAdapter.importProject(resourceType, packageUId, link, null, null);
            (0, expect_1.expect)(onIDERequest.calledWith("/ide/importProject" /* CCS_ECLIPSE_API.IMPORT_PROJECT */, {
                location: localPackagePath + link
            }));
        });
        it('should report ide errors', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project1;
            const onIDERequest = sinon.stub().callsFake((pathname) => {
                if (pathname === "/ide/importProject" /* CCS_ECLIPSE_API.IMPORT_PROJECT */) {
                    throw new Error('IDE messed up');
                }
            });
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { resourceType, packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await (0, expect_1.expect)(ccsAdapter.importProject(resourceType, packageUId, link, null, null)).to.eventually.be.rejectedWith('IDE messed up');
        });
        it('should report an error trying to import from a non-local package', async function () {
            const resouceType = 'project.ccs';
            const packagePublicUid = 'packageUid';
            const relativeLocation = '/foo/bar';
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({});
            await (0, expect_1.expect)(ccsAdapter.importProject(resouceType, packagePublicUid, relativeLocation, null, null)).to.eventually.be.rejectedWith('Package not installed locally');
        });
        it('should notify IDE to do Import Energia Sketch', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project2;
            const targetId = 'boardId';
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { resourceType, packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await ccsAdapter.importProject(resourceType, packageUId, link, targetId, null);
            (0, expect_1.expect)(onIDERequest.calledWith("/ide/importSketch" /* CCS_ECLIPSE_API.IMPORT_SKETCH */, {
                sketchFile: localPackagePath + link,
                boardId: targetId
            }));
        });
        it('should report an error trying to Import Energia Sketch without board-Id', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project2;
            const targetId = null;
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { resourceType, packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await (0, expect_1.expect)(ccsAdapter.importProject(resourceType, packageUId, link, targetId, null)).to.eventually.be.rejectedWith('Missing Energia board ID');
        });
        it('should notify IDE to import a file', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project4;
            const targetId = 'boardId';
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { resourceType, packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await ccsAdapter.importProject(resourceType, packageUId, link, targetId, null);
            (0, expect_1.expect)(onIDERequest.calledWith("/ide/createProject" /* CCS_ECLIPSE_API.CREATE_PROJECT */, {
                pathname: localPackagePath + link,
                deviceId: targetId
            }));
        });
        it('should notify IDE to import a folder', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project5;
            const targetId = 'boardId';
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { resourceType, packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await ccsAdapter.importProject(resourceType, packageUId, link, targetId, null);
            (0, expect_1.expect)(onIDERequest.calledWith("/ide/createProject" /* CCS_ECLIPSE_API.CREATE_PROJECT */, {
                pathname: localPackagePath + link,
                deviceId: targetId
            }));
        });
        it('should report an error trying to import unsupported project type', async function () {
            const metadata = metadata1;
            const pkg = overview1;
            const project = project2;
            const targetId = null;
            const onIDERequest = sinon.spy();
            const { ccsAdapter } = await (0, testing_util_1.createCCSAdapter)({
                metadata,
                onIDERequest
            });
            // @ts-ignore
            const localPackagePath = pkg.localPackagePath;
            const { packageUId, link } = project;
            if (!packageUId || !link || !localPackagePath) {
                throw new Error('no link, packageUid, or localPackagePath');
            }
            await (0, expect_1.expect)(ccsAdapter.importProject('bundle', packageUId, link, targetId, null)).to.eventually.be.rejectedWith('Unsupported project type: bundle');
        });
    });
    describe('general', function () {
        it.skip('Should handle IDE server not running', async function () { });
        it.skip('Should handle bad status codes from IDE server (i.e 500s)', async function () { });
    });
});
