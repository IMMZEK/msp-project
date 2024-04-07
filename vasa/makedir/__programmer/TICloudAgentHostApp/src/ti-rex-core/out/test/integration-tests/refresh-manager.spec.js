"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../src/scripts-lib/util"); // always import from 'src' not 'out' (see REX-2269)
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
// our modules
const content_utils_1 = require("./content-utils");
const path = require("path");
const fs = require("fs-extra");
const chai_1 = require("chai");
const vars_1 = require("../../lib/vars");
const dbBuilder_1 = require("../../lib/dbBuilder/dbBuilder");
const rex_1 = require("../../lib/rex");
const dbBuilderUtils_1 = require("../../lib/dbBuilder/dbBuilderUtils");
const refresh_1 = require("../../lib/dbBuilder/refresh");
const rexdb_split_1 = require("../../rexdb/lib/rexdb-split");
const versioning_1 = require("../../lib/versioning");
// Globals used by support functions (must be declared before describe block)
// allow expect(blah).to.exist
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
const devtoolsId = 'com.ti.fake.devtools';
const devtoolsVersion1 = '1.00.00.00';
const devtoolsVersion2 = '2.00.00.00';
const devicesId = 'com.ti.fake.devices';
const devicesVersion1 = '1.00.00.00';
const devicesVersion2 = '2.00.00.00';
const rex = (0, rex_1._getRex)();
const softwarePackages = [];
const addOnSoftwarePackages = [];
let addOnSDKPackage;
let addOnSLAPackage;
let addOnTestpackageSdkVersion3;
let addOnTestpackageSlaVersion6;
function createPackageEntryRefreshReq({ id, version, content, operation }) {
    const prrt = {
        uid: (0, dbBuilderUtils_1.formUid)(id, version),
        content: content[0],
        operation,
        installCommand: {},
        installPath: {},
        installSize: {},
        modulePrefix: null
    };
    return prrt;
}
function changePackageOperation(id, version, opr, peb, content) {
    if (opr === "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */ && !content) {
        // TODO this is an error condition
    }
    const index = peb.findIndex(item => item.uid === (0, dbBuilderUtils_1.formUid)(id, version));
    if (index !== -1) {
        peb[index].operation = opr;
        if (content) {
            peb[index].content = content;
        }
    }
}
function changePackagePropertyVersion(id, version, peb, versionNew) {
    const index = peb.findIndex(item => item.uid === (0, dbBuilderUtils_1.formUid)(id, version));
    peb[index].uid = (0, dbBuilderUtils_1.formUid)(id, versionNew);
}
function createFullListForRefresh(operation) {
    const peb = [];
    for (const pkg of softwarePackages) {
        peb.push(createPackageEntryRefreshReq({
            id: pkg.id,
            version: pkg.version,
            content: [pkg.folder],
            operation
        }));
    }
    peb.push(createPackageEntryRefreshReq({
        id: devicesId,
        version: devicesVersion2,
        content: ['tirex-product-tree/Fdevices_2_00_00_00/'],
        operation
    }));
    peb.push(createPackageEntryRefreshReq({
        id: devtoolsId,
        version: devtoolsVersion2,
        content: ['tirex-product-tree/Fdevtools_2_00_00_00'],
        operation
    }));
    return peb;
}
function makeSoftwarePackageList() {
    softwarePackages.push({
        folder: 'Ftestpackage_main_1_23_45_00',
        id: 'com.ti.testpackage1',
        version: '1.23.45.00'
    });
    softwarePackages.push({
        folder: 'Ftestpackage_sdk_2_00_00_00',
        id: 'com.ti.testpackage.sdk',
        version: '2.00.00.00'
        // SDK should not mention SLAs. THis info gets injected
        /*
        dependencies: [
            {
                packageId: 'com.ti.testpackage.sla',
                version: '5.00.00.00'
            }
        ]
        */
    });
    softwarePackages.push({
        folder: 'Ftestpackage_sla_5_00_00_00',
        id: 'com.ti.testpackage.sla',
        version: '5.00.00.00',
        supplements: {
            packageId: 'com.ti.testpackage.sdk',
            semver: '>=1.0'
        }
    });
}
function makeAddOnSoftwarePackages() {
    addOnSoftwarePackages.push({
        folder: 'Ftestpackage_main_addon_6_12_34_00',
        id: 'com.ti.testpackage1.addon',
        version: '6.12.34.00'
    });
    addOnSDKPackage = {
        folder: 'Ftestpackage_sdk_addon_6_00_00_00',
        id: 'com.ti.testpackage.sdk.addon',
        version: '6.00.00.00'
        // dependencies: NOTE SDK should not mention SLAs. THis info gets injected
    };
    addOnSLAPackage = {
        folder: 'Ftestpackage_sla_addon_7_00_00_00',
        id: 'com.ti.testpackage.sla.addon',
        version: '7.00.00.00',
        supplements: {
            packageId: 'com.ti.testpackage.sdk.addon',
            semver: '>=1.0'
        }
    };
    // later version of the com.ti.testpackage.sdk above (softawarePackages[1]) to test correct
    // supplemental dependency creation
    addOnTestpackageSdkVersion3 = {
        folder: 'Ftestpackage_sdk_3_00_00_00',
        id: 'com.ti.testpackage.sdk',
        version: '3.00.00.00'
        // SDK should not mention SLAs. THis info gets injected
        /*
        dependencies: [
            {
                packageId: 'com.ti.testpackage.sla',
                version: '5.00.00.00'
            }
        ]
        */
    };
    // later version of the com.ti.testpackage.sla above (softawarePackages[2]) to test correct
    // supplemental dependency creation
    addOnTestpackageSlaVersion6 = {
        folder: 'Ftestpackage_sla_6_00_00_00',
        id: 'com.ti.testpackage.sla',
        version: '6.00.00.00',
        supplements: {
            packageId: 'com.ti.testpackage.sdk',
            semver: '>=1.0'
        }
    };
}
// TODO try push the addOnpackages in the middle of the peb pack just because there could be some bug hidding in the fact that it is being sent last
const contentBasePath = vars_1.Vars.CONTENT_BASE_PATH;
const dbBasePath = vars_1.Vars.DB_BASE_PATH;
const defaultLogger = rex.loggerManager.createLogger('refresh');
let refreshManager;
let peb;
let packageids;
let Result;
describe('refreshManager', async function () {
    // this.timeout(10 * 60 * 1000);
    before(async () => {
        refreshManager = new refresh_1.RefreshManager(dbBasePath, defaultLogger);
        makeSoftwarePackageList();
        makeAddOnSoftwarePackages();
        generateMetadataContent(contentBasePath);
    });
    beforeEach(async () => {
        await fs.remove(dbBasePath);
        refreshManager.createDB();
        peb = createFullListForRefresh("addPackage" /* RefreshOperation.ADD_PACKAGE */);
        packageids = peb.map(pkg => {
            return pkg.uid;
        });
        try {
            Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
        }
        catch (err) {
            throw new Error('Prerequisite refresh in before() failed. ' + err);
        }
        const success = Result.success;
        if (!success) {
            throw new Error('Prerequisite refresh in before() failed. ');
        }
        peb = createFullListForRefresh("doNothing" /* RefreshOperation.DO_NOTHING */);
    });
    afterEach(async () => {
        try {
            await refreshManager.removeBackup();
        }
        catch (err) {
            throw new Error('Failed to restore from refresh backup db properly, could not delete backup directory after restoring');
        }
    });
    describe(`Individual Refresh`, async () => {
        it('Basic Full Refresh', async () => {
            peb = createFullListForRefresh("addPackage" /* RefreshOperation.ADD_PACKAGE */);
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            // Test the result coming back
            packageids.forEach(packageid => {
                const actionResult = result.get(packageid).status.actionResult;
                (0, chai_1.expect)(actionResult).to.equal("succeeded" /* PackageRefreshResult.SUCCEEDED */);
            });
            // Test for some of the expected refresh db files on the file system
            const dirContents = fs.readdirSync(path.join(dbBasePath, 'overviews_split.db'));
            const dbSuffixes = ['', '.index', '.filter.index', '.search.index'];
            packageids.forEach(packageid => {
                dbSuffixes.forEach(suffix => {
                    const index = dirContents.findIndex(item => item === packageid + suffix);
                    (0, chai_1.expect)(index).to.not.equal(-1);
                });
            });
        });
        it('Refresh with 2 versions of the same hardware package', async () => {
            // add an older hardware package both at the start and the end of list to cover both
            // executions paths; also make one a device and the other a devtool package to make
            // sure they are handled the same
            peb = [
                createPackageEntryRefreshReq({
                    id: devtoolsId,
                    version: devtoolsVersion1,
                    content: ['tirex-product-tree/Fdevtools_1_00_00_00/'],
                    operation: "doNothing" /* RefreshOperation.DO_NOTHING */
                })
            ];
            peb.push(...createFullListForRefresh("addPackage" /* RefreshOperation.ADD_PACKAGE */));
            peb.push(createPackageEntryRefreshReq({
                id: devicesId,
                version: devicesVersion1,
                content: ['tirex-product-tree/Fdevices_1_00_00_00/'],
                operation: "doNothing" /* RefreshOperation.DO_NOTHING */
            }));
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            (0, chai_1.expect)(success).to.be.true;
            // Test the result coming back
            result.forEach((result, uid) => {
                const actionResult = result.status.actionResult;
                if (uid === 'com.ti.fake.devices__1.00.00.00' ||
                    uid === 'com.ti.fake.devtools__1.00.00.00') {
                    (0, chai_1.expect)(actionResult).to.equal("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */);
                }
                else {
                    (0, chai_1.expect)(actionResult).to.equal("succeeded" /* PackageRefreshResult.SUCCEEDED */);
                }
            });
            // Test for some of the expected refresh db files on the file system
            const dirContents = fs.readdirSync(path.join(dbBasePath, 'overviews_split.db'));
            const dbSuffixes = ['', '.index', '.filter.index', '.search.index'];
            result.forEach((_result, uid) => {
                dbSuffixes.forEach(suffix => {
                    const index = dirContents.findIndex(item => item === uid + suffix);
                    if (uid === 'com.ti.fake.devices__1.00.00.00' ||
                        uid === 'com.ti.fake.devtools__1.00.00.00') {
                        (0, chai_1.expect)(index).to.equal(-1);
                    }
                    else {
                        (0, chai_1.expect)(index).to.not.equal(-1);
                    }
                });
            });
        });
        it('Refresh with 2 versions of the same hardware package: Disallow add/replace an older version', async () => {
            // add an older hardware package both at the start and the end of list to cover both
            // executions paths; also make one a device and the other a devtool package to make
            // sure they are handled the same
            peb = [
                createPackageEntryRefreshReq({
                    id: devtoolsId,
                    version: devtoolsVersion1,
                    content: ['tirex-product-tree/Fdevtools_1_00_00_00/'],
                    operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */ // specifically request add or replace
                })
            ];
            peb.push(...createFullListForRefresh("addPackage" /* RefreshOperation.ADD_PACKAGE */));
            peb.push(createPackageEntryRefreshReq({
                id: devicesId,
                version: devicesVersion1,
                content: ['tirex-product-tree/Fdevices_1_00_00_00/'],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */ // specifically request add or replace
            }));
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            (0, chai_1.expect)(success).to.be.false;
            // Test the result coming back
            result.forEach((result, uid) => {
                const actionResult = result.status.actionResult;
                if (uid === 'com.ti.fake.devices__1.00.00.00' ||
                    uid === 'com.ti.fake.devtools__1.00.00.00') {
                    (0, chai_1.expect)(actionResult).to.equal("failed" /* PackageRefreshResult.FAILED */);
                }
                else {
                    (0, chai_1.expect)(actionResult).to.equal("not started" /* PackageRefreshResult.NOTSTARTED */);
                }
            });
        });
        it('Check db backup folder got deleted', async () => {
            // Test that the backup db folder has been removed
            if (fs.existsSync((0, dbBuilder_1.getDbBackupBasePath)(dbBasePath))) {
                throw new Error('db backup dir found, not expected');
            }
        });
    });
    describe(`Add`, async () => {
        it('Add 1 Device package', async () => {
            changePackageOperation(devicesId, devicesVersion2, "addPackage" /* RefreshOperation.ADD_PACKAGE */, peb, 'tirex-product-tree/Fdevices_2_00_00_00');
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error();
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, packageids, result);
            await verifyDevDBsGenerated();
        });
        it('Add 1 Devtool package', async () => {
            changePackageOperation(devtoolsId, devtoolsVersion2, "addPackage" /* RefreshOperation.ADD_PACKAGE */, peb, 'tirex-product-tree/Fdevtools_2_00_00_00');
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            // TODO do this where it is needed for other tests as well
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, packageids, result);
            await verifyOperation("addPackage" /* RefreshOperation.ADD_PACKAGE */, [devtoolsId + '__' + devtoolsVersion2], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return pkgUId !== devtoolsId + '__' + devtoolsVersion2;
            });
            await verifyOperation("updatedPackage" /* RefreshOperation.UPDATED_PACKAGE */, packageidsSub, result);
            await verifyDevDBsGenerated();
        });
        it('Add Attempt 1 software package', async () => {
            const spp = addOnSoftwarePackages[0];
            peb.push(createPackageEntryRefreshReq({
                id: spp.id,
                version: spp.version,
                content: ['Fnon_existent_folder'],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found folder should not result in err != null');
            }
            const success = Result.success;
            const result = Result.result;
            if (success) {
                throw new Error('Refresh should have failed for non existent folder');
            }
            await verifyResult("not found" /* PackageRefreshResult.NOTFOUND */, [spp.id + '__' + spp.version], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return pkgUId !== spp.id + '__' + spp.version;
            });
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageidsSub, result);
        });
        it('Add 1 independent software package', async () => {
            const spp = addOnSoftwarePackages[0];
            peb.push(createPackageEntryRefreshReq({
                id: spp.id,
                version: spp.version,
                content: [spp.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [spp.id + '__' + spp.version], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return pkgUId !== spp.id + '__' + spp.version;
            });
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageidsSub, result);
        });
        it('Add 1 sdk software package', async () => {
            const sppSDK = addOnSDKPackage;
            peb.push(createPackageEntryRefreshReq({
                id: sppSDK.id,
                version: sppSDK.version,
                content: [sppSDK.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error();
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [sppSDK.id + '__' + sppSDK.version], result);
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids.filter(pkgUId => {
                return pkgUId !== sppSDK.id + '__' + sppSDK.version;
            }), result);
        });
        // NOTE: the code in processRootCategory prevents the sla from being submitted alone
        it('Add Attempt 1 sla software package', async () => {
            const sppSLA = addOnSLAPackage;
            peb.push(createPackageEntryRefreshReq({
                id: sppSLA.id,
                version: sppSLA.version,
                content: [sppSLA.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (success) {
                throw new Error('Refresh should have failed, but passed');
            }
            await verifyResult("failed" /* PackageRefreshResult.FAILED */, [sppSLA.id + '__' + sppSLA.version], result);
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids.filter(pkgUId => {
                return pkgUId !== sppSLA.id + '__' + sppSLA.version;
            }), result);
            // TODO test for critical
        });
        it('Add 1 sla & 1 sdk software package', async () => {
            const sppSDK = addOnSDKPackage;
            const sppSLA = addOnSLAPackage;
            peb.push(createPackageEntryRefreshReq({
                id: sppSLA.id,
                version: sppSLA.version,
                content: [sppSLA.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            peb.push(createPackageEntryRefreshReq({
                id: sppSDK.id,
                version: sppSDK.version,
                content: [sppSDK.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [sppSLA.id + '__' + sppSLA.version, sppSDK.id + '__' + sppSDK.version], result);
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids.filter(pkgUId => {
                return !(pkgUId === sppSDK.id + '__' + sppSDK.version ||
                    pkgUId === sppSLA.id + '__' + sppSLA.version);
            }), result);
        });
        it('Add new version of sdk software package which has pre-existing SLA', async () => {
            const sppSDK = addOnTestpackageSdkVersion3;
            const existingSLA = softwarePackages[2];
            peb.push(createPackageEntryRefreshReq({
                id: sppSDK.id,
                version: sppSDK.version,
                content: [sppSDK.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [sppSDK.id + '__' + sppSDK.version], result);
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids.filter(pkgUId => {
                return !(pkgUId === sppSDK.id + '__' + sppSDK.version);
            }), result);
            await verifyDependencyToSLA(sppSDK, existingSLA);
        });
        it('Add later version of SLA software package', async () => {
            const sppSDK = softwarePackages[1];
            const existingSLA = softwarePackages[2];
            const laterSLA = addOnTestpackageSlaVersion6;
            await verifyDependencyToSLA(sppSDK, existingSLA);
            peb.push(createPackageEntryRefreshReq({
                id: laterSLA.id,
                version: laterSLA.version,
                content: [laterSLA.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [laterSLA.id + '__' + laterSLA.version], result);
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids.filter(pkgUId => {
                return !(pkgUId === laterSLA.id + '__' + laterSLA.version);
            }), result);
            await verifyDependencyToSLA(sppSDK, laterSLA);
        });
    });
    describe(`Delete`, async () => {
        it('Delete Attempt 1 independent software package (The UId cannot be found: should do nothing )', async () => {
            const spp = softwarePackages[0];
            peb[0] = createPackageEntryRefreshReq({
                id: spp.id,
                version: '9.00.00.00',
                content: [spp.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found UId should not result in err != null');
            }
            const success = Result.success;
            const result = Result.result;
            if (!success) {
                throw new Error('Refresh should have succeeded, but failed');
            }
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids, result);
        });
        it('Delete Attempt 1 independent software package (the package is not loaded in the database: should do nothing)', async () => {
            const spp = addOnSoftwarePackages[0];
            peb.push(createPackageEntryRefreshReq({
                id: spp.id,
                version: spp.version,
                content: [spp.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have succeeded, but failed');
            }
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids, result);
        });
        it('Delete 1 independent software package', async () => {
            const spp = softwarePackages[0];
            peb[0] = createPackageEntryRefreshReq({
                id: spp.id,
                version: spp.version,
                content: [spp.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [spp.id + '__' + spp.version], result);
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids.filter(pkgUId => pkgUId !== spp.id + '__' + spp.version), result);
            // TODO verify content of software package
        });
        it('Delete 1 sla software package which supplements 1 sdk package', async () => {
            // NOTE: Deleting the sdk and leaving the sla orphaned is allowed
            const sppSDK = softwarePackages[1];
            const sppSLA = softwarePackages[2];
            peb[1] = createPackageEntryRefreshReq({
                id: sppSDK.id,
                version: sppSDK.version,
                content: [sppSDK.folder],
                operation: "doNothing" /* RefreshOperation.DO_NOTHING */
            });
            peb[2] = createPackageEntryRefreshReq({
                id: sppSLA.id,
                version: sppSLA.version,
                content: [sppSLA.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [sppSLA.id + '__' + sppSLA.version], result);
            await verifyDependencyToSLA(sppSDK, null);
        });
        it('Delete 1 sdk software package which currently has 0 sla dependencies', async () => {
            const sppSDK = softwarePackages[1];
            peb[1] = createPackageEntryRefreshReq({
                id: sppSDK.id,
                version: sppSDK.version,
                content: [sppSDK.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error();
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [sppSDK.id + '__' + sppSDK.version], result);
        });
        it('Delete Attempt 1 Device package (package path does not exist and package not in DB: should still delete package)', async () => {
            changePackageOperation(devicesId, devicesVersion2, "removePackage" /* RefreshOperation.REMOVE_PACKAGE */, peb, 'tirex-product-tree/devices_2_00_00_00' // non-existent path
            );
            changePackagePropertyVersion(devicesId, devicesVersion2, peb, '9.00.00.00');
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found package should not result in err != null');
            }
            const success = Result.success;
            const result = Result.result;
            if (!success) {
                throw new Error('Refresh should have succeeded, but failed');
            }
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids, result);
        });
        it('Delete Attempt 1 Devtool package (package path does not exist and package not in DB: should still delete package)', async () => {
            changePackageOperation(devtoolsId, devtoolsVersion2, "removePackage" /* RefreshOperation.REMOVE_PACKAGE */, peb, 'tirex-product-tree/devtools_1_00_00_00');
            changePackagePropertyVersion(devtoolsId, devtoolsVersion2, peb, '9.00.00.00');
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found package should not result in err != null');
            }
            const success = Result.success;
            const result = Result.result;
            if (!success) {
                throw new Error('Refresh should have succeeded, but failed');
            }
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageids, result);
        });
        it('Delete 1 Device package', async () => {
            changePackageOperation(devicesId, devicesVersion2, "removePackage" /* RefreshOperation.REMOVE_PACKAGE */, peb, 'tirex-product-tree/Fdevices_2_00_00_00');
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, packageids, result);
            await verifyDevDBsGenerated();
            // TODO verify content of device package
        });
        it('Delete 1 Devtool package', async () => {
            changePackageOperation(devtoolsId, devtoolsVersion2, "removePackage" /* RefreshOperation.REMOVE_PACKAGE */, peb, 'tirex-product-tree/Fdevtools_2_00_00_00');
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, packageids, result);
            await verifyDevDBsGenerated();
            // TODO verify content of devtool package
        });
    });
    describe(`Replace`, async () => {
        it('Replace Attempt 1 independent software package, folder not found', async () => {
            const replacementSoftwarePackage = {
                folder: 'Ftestpackage_replacement_1_23_45_00',
                id: 'com.ti.testpackage1',
                version: '1.23.45.00'
            };
            generateSoftwarePackageMetadataContent(replacementSoftwarePackage, contentBasePath);
            peb.push(createPackageEntryRefreshReq({
                id: replacementSoftwarePackage.id,
                version: replacementSoftwarePackage.version,
                content: ['non_existent_folder'],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found folder should not result in err != null');
            }
            const result = Result.result;
            const success = Result.success;
            if (success) {
                throw new Error('Refresh should have failed but passed');
            }
            await verifyResult("not found" /* PackageRefreshResult.NOTFOUND */, [replacementSoftwarePackage.id + '__' + replacementSoftwarePackage.version], result);
        });
        it('Replace Attempt 1 independent software package, id does not match', async () => {
            const replacementSoftwarePackage = {
                folder: 'Ftestpackage_replacement_1_23_45_00',
                id: 'com.ti.testpackage1',
                version: '1.23.45.00'
            };
            generateSoftwarePackageMetadataContent(replacementSoftwarePackage, contentBasePath);
            peb.push(createPackageEntryRefreshReq({
                id: 'notfound.id',
                version: replacementSoftwarePackage.version,
                content: [`Ftestpackage_replacement_notfound_id_1_23_45_00`],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found folder should not result in err != null');
            }
            const result = Result.result;
            const success = Result.success;
            if (success) {
                throw new Error('Refresh should have failed but passed');
            }
            await verifyResult("not found" /* PackageRefreshResult.NOTFOUND */, ['notfound.id' + '__' + replacementSoftwarePackage.version], result);
        });
        it('Replace Attempt 1 independent software package, replace entry and do nothing entry exist for the same UId', async () => {
            const replacementSoftwarePackage = {
                folder: 'Ftestpackage_replacement_1_23_45_00',
                id: 'com.ti.testpackage1',
                version: '1.23.45.00'
            };
            generateSoftwarePackageMetadataContent(replacementSoftwarePackage, contentBasePath);
            peb.push(createPackageEntryRefreshReq({
                id: replacementSoftwarePackage.id,
                version: replacementSoftwarePackage.version,
                content: [replacementSoftwarePackage.folder],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (success) {
                throw new Error('Refresh should have failed but passed');
            }
        });
        it('Replace 1 independent software package', async () => {
            const replacementSoftwarePackage = {
                folder: 'Ftestpackage_replacement_1_23_45_00',
                id: 'com.ti.testpackage1',
                version: '1.23.45.00'
            };
            generateSoftwarePackageMetadataContent(replacementSoftwarePackage, contentBasePath);
            peb[0] = createPackageEntryRefreshReq({
                id: replacementSoftwarePackage.id,
                version: replacementSoftwarePackage.version,
                content: [replacementSoftwarePackage.folder],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            const packageidsSub = packageids.filter(item => {
                return (item ===
                    replacementSoftwarePackage.id + '__' + replacementSoftwarePackage.version);
            });
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, packageidsSub, result);
        });
    });
    describe(`Combos`, () => {
        it('Combo Add 1, Delete 1 independent software package', async () => {
            const spp = softwarePackages[0];
            peb[0] = createPackageEntryRefreshReq({
                id: spp.id,
                version: spp.version,
                content: [spp.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            peb.push(createPackageEntryRefreshReq({
                id: addOnSoftwarePackages[0].id,
                version: addOnSoftwarePackages[0].version,
                content: [addOnSoftwarePackages[0].folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [
                addOnSoftwarePackages[0].id + '__' + addOnSoftwarePackages[0].version,
                spp.id + '__' + spp.version
            ], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return !(pkgUId ===
                    addOnSoftwarePackages[0].id + '__' + addOnSoftwarePackages[0].version ||
                    pkgUId === spp.id + '__' + spp.version);
            });
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageidsSub, result);
        });
        it('Combo Add 1, Replace 1 independent software package', async () => {
            peb.push(createPackageEntryRefreshReq({
                id: addOnSoftwarePackages[0].id,
                version: addOnSoftwarePackages[0].version,
                content: [addOnSoftwarePackages[0].folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            const replacementSoftwarePackage = {
                folder: 'Ftestpackage_replacement_1_23_45_00',
                id: 'com.ti.testpackage1',
                version: '1.23.45.00'
            };
            generateSoftwarePackageMetadataContent(replacementSoftwarePackage, contentBasePath);
            peb[0] = createPackageEntryRefreshReq({
                id: replacementSoftwarePackage.id,
                version: replacementSoftwarePackage.version,
                content: [replacementSoftwarePackage.folder],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [
                addOnSoftwarePackages[0].id + '__' + addOnSoftwarePackages[0].version,
                replacementSoftwarePackage.id + '__' + replacementSoftwarePackage.version
            ], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return !(pkgUId ===
                    addOnSoftwarePackages[0].id + '__' + addOnSoftwarePackages[0].version ||
                    pkgUId ===
                        replacementSoftwarePackage.id + '__' + replacementSoftwarePackage.version);
            });
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageidsSub, result);
        });
        it('Combo Delete 1, Replace 1 independent software package', async () => {
            const spp = softwarePackages[0];
            peb[0] = createPackageEntryRefreshReq({
                id: spp.id,
                version: spp.version,
                content: [spp.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            const replacementSoftwarePackage = {
                folder: 'Ftestpackage_replacement_1_23_45_00',
                id: 'com.ti.testpackage1',
                version: '1.23.45.00'
            };
            generateSoftwarePackageMetadataContent(replacementSoftwarePackage, contentBasePath);
            peb[0] = createPackageEntryRefreshReq({
                id: replacementSoftwarePackage.id,
                version: replacementSoftwarePackage.version,
                content: [replacementSoftwarePackage.folder],
                operation: "replacePackage" /* RefreshOperation.REPLACE_PACKAGE */
            });
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            const { result, success } = await refreshManager.individualRefresh(peb, contentBasePath, false);
            if (!success) {
                throw new Error('Refresh should have passed, but failed');
            }
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [
                spp.id + '__' + spp.version,
                replacementSoftwarePackage.id + '__' + replacementSoftwarePackage.version
            ], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return !(pkgUId === spp.id + '__' + spp.version ||
                    pkgUId ===
                        replacementSoftwarePackage.id + '__' + replacementSoftwarePackage.version);
            });
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageidsSub, result);
        });
        it('Combo: Delete Attempt 1 independent software package, Add 1 independent s/w package', async () => {
            const spp = softwarePackages[0];
            peb[0] = createPackageEntryRefreshReq({
                id: spp.id,
                version: '9.00.00.00',
                content: [spp.folder],
                operation: "removePackage" /* RefreshOperation.REMOVE_PACKAGE */
            });
            const aspp = addOnSoftwarePackages[0];
            peb.push(createPackageEntryRefreshReq({
                id: aspp.id,
                version: aspp.version,
                content: [aspp.folder],
                operation: "addPackage" /* RefreshOperation.ADD_PACKAGE */
            }));
            packageids = peb.map(pkg => {
                return pkg.uid;
            });
            try {
                Result = await refreshManager.individualRefresh(peb, contentBasePath, false);
            }
            catch (err) {
                throw new Error('Not found UId should not result in err != null');
            }
            const result = Result.result;
            const success = Result.success;
            if (!success) {
                throw new Error('Refresh should have succeeded, but failed');
            }
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, [spp.id + '__' + '9.00.00.00'], result);
            await verifyResult("succeeded" /* PackageRefreshResult.SUCCEEDED */, [aspp.id + '__' + aspp.version], result);
            const packageidsSub = packageids.filter(pkgUId => {
                return !(pkgUId === spp.id + '__' + '9.00.00.00' ||
                    pkgUId === aspp.id + '__' + aspp.version);
            });
            await verifyResult("not applicable" /* PackageRefreshResult.NOTAPPLICABLE */, packageidsSub, result);
        });
    });
});
// ----------------------------------------------------------------------------------------------------------------------------------
async function verifyResult(actionResult, packageids, result) {
    // Test the result comming back
    await Promise.all(packageids.map(async (packageid) => {
        if (result.has(packageid) &&
            result.get(packageid).status.actionResult === actionResult) {
        }
        else {
            throw new Error(`${packageid} does not have action result value '${actionResult}' but '${result.get(packageid).status.actionResult}'`);
        }
    }));
}
async function verifyOperation(operation, packageids, result) {
    await Promise.all(packageids.map(async (packageid) => {
        if (!(result.has(packageid) && result.get(packageid).package.operation === operation)) {
            throw new Error(packageid +
                ' Operation in .package.oper field does not match expected value ' +
                operation);
        }
    }));
}
async function verifyDevDBsGenerated() {
    try {
        await fs.stat(path.join(dbBasePath, 'devices.db'));
        await fs.stat(path.join(dbBasePath, 'devtools.db'));
    }
    catch (err) {
        (0, chai_1.expect)(err, 'Refresh did not generate devices.db/devtools.db').to.not.exist;
    }
}
async function verifyDependencyToSLA(sdk, sla // null means no dependencies expected
) {
    const dbOverviews = new rexdb_split_1.RexDBSplit(defaultLogger, path.join(dbBasePath, 'overviews_split.db'));
    await dbOverviews.useAllAsync();
    const packageOverview = await dbOverviews.findOneAsync({
        id: sdk.id,
        version: sdk.version,
        resourceType: 'packageOverview'
    });
    (0, chai_1.expect)(packageOverview).to.exist;
    const dependencies = packageOverview.dependencies;
    if (sla) {
        (0, chai_1.expect)(dependencies).to.have.deep.members([
            {
                refId: sla.id,
                versionRange: sla.version,
                require: 'optional',
                // for b/w compatibility:
                semver: (0, versioning_1.convertToSemver)(sla.version),
                version: sla.version
            }
        ]);
    }
    else {
        (0, chai_1.expect)(dependencies).to.be.empty;
    }
}
function generateMetadataContent(contentBasePath) {
    const devicesFolder = path.join(contentBasePath, 'tirex-product-tree', 'Fdevices_1_00_00_00', '.metadata', '.tirex');
    const devicesFolder2 = path.join(contentBasePath, 'tirex-product-tree', 'Fdevices_2_00_00_00', '.metadata', '.tirex');
    const devtoolsFolder = path.join(contentBasePath, 'tirex-product-tree', 'Fdevtools_1_00_00_00', '.metadata', '.tirex');
    const devtoolsFolder2 = path.join(contentBasePath, 'tirex-product-tree', 'Fdevtools_2_00_00_00', '.metadata', '.tirex');
    // 1st device hardware package
    const devices = [
        (0, content_utils_1.generateDeviceContent)('DEVICE1', 'id.device1'),
        (0, content_utils_1.generateDeviceContent)('DEVICE2', 'id.device2')
    ];
    fs.mkdirpSync(devicesFolder);
    fs.writeFileSync(path.join(devicesFolder, 'devices.tirex.json'), JSON.stringify(devices, null, 3));
    const devicesPackageOverviewContent = [
        (0, content_utils_1.generatePackageOverviewContent)('device Hardware Package', devicesId, devicesVersion1, 'devices')
    ];
    fs.writeFileSync(path.join(devicesFolder, vars_1.Vars.PACKAGE_TIREX_JSON), JSON.stringify(devicesPackageOverviewContent, null, 3));
    // 2nd device hardware package
    const devices2 = [
        (0, content_utils_1.generateDeviceContent)('DEVICE3', 'id.device3'),
        (0, content_utils_1.generateDeviceContent)('DEVICE4', 'id.device4')
    ];
    fs.mkdirpSync(devicesFolder2);
    fs.writeFileSync(path.join(devicesFolder2, 'devices.tirex.json'), JSON.stringify(devices2, null, 3));
    const devicesPackageOverviewContent2 = [
        (0, content_utils_1.generatePackageOverviewContent)('device2 Hardware Pacakge', devicesId, devicesVersion2, 'devices')
    ];
    fs.writeFileSync(path.join(devicesFolder2, vars_1.Vars.PACKAGE_TIREX_JSON), JSON.stringify(devicesPackageOverviewContent2, null, 3));
    // 1st devtool hardware package
    const devtools = [(0, content_utils_1.generateDevtoolContent)('BOARD1', 'id.board1')];
    fs.mkdirpSync(devtoolsFolder);
    fs.writeFileSync(path.join(devtoolsFolder, 'devtools.tirex.json'), JSON.stringify(devtools, null, 3));
    const devtoolsPackageOverviewContent = [
        (0, content_utils_1.generatePackageOverviewContent)('devtool Hardware Pacakge', devtoolsId, devtoolsVersion1, 'devtools')
    ];
    fs.writeFileSync(path.join(devtoolsFolder, vars_1.Vars.PACKAGE_TIREX_JSON), JSON.stringify(devtoolsPackageOverviewContent, null, 3));
    // 2nd devtool hardware package
    const devtools2 = [(0, content_utils_1.generateDevtoolContent)('BOARD1', 'id.board1')];
    fs.mkdirpSync(devtoolsFolder2);
    fs.writeFileSync(path.join(devtoolsFolder2, 'devtools.tirex.json'), JSON.stringify(devtools2, null, 3));
    const devtoolsPackageOverviewContent2 = [
        (0, content_utils_1.generatePackageOverviewContent)('devtool Hardware Package', devtoolsId, devtoolsVersion2, 'devtools')
    ];
    fs.writeFileSync(path.join(devtoolsFolder2, vars_1.Vars.PACKAGE_TIREX_JSON), JSON.stringify(devtoolsPackageOverviewContent2, null, 3));
    // software packages
    for (const packagae of softwarePackages) {
        generateSoftwarePackageMetadataContent(packagae, contentBasePath);
    }
    for (const packagae of addOnSoftwarePackages) {
        generateSoftwarePackageMetadataContent(packagae, contentBasePath);
    }
    generateSoftwarePackageMetadataContent(addOnSDKPackage, contentBasePath);
    generateSoftwarePackageMetadataContent(addOnSLAPackage, contentBasePath);
    generateSoftwarePackageMetadataContent(addOnTestpackageSdkVersion3, contentBasePath);
    generateSoftwarePackageMetadataContent(addOnTestpackageSlaVersion6, contentBasePath);
}
function generateSoftwarePackageMetadataContent(pkg, contentBasePath) {
    const folder = pkg.folder;
    const id = pkg.id;
    const version = pkg.version;
    const dependencies = pkg.dependencies;
    const supplements = pkg.supplements;
    const packageMetadataFolder = path.join(contentBasePath, folder, '.metadata', '.tirex');
    const packageOverviewContent = [
        (0, content_utils_1.generatePackageOverviewContent)(folder, id, version, 'software', dependencies, supplements)
    ];
    fs.mkdirpSync(packageMetadataFolder);
    fs.writeFileSync(path.join(packageMetadataFolder, vars_1.Vars.PACKAGE_TIREX_JSON), JSON.stringify(packageOverviewContent, null, 3));
    const resourceContent = [
        // generateResourceContent('Example Resource 1', ['DEVICE1', 'DEVICE2'], ['BOARD1']),
        // generateResourceContent('Example Resource 2', ['DEVICE1'], ['BOARD1']),
        (0, content_utils_1.generateResourceContent)('Example Resource 3', ['DEVICE1'], ['BOARD1'])
    ];
    fs.mkdirpSync(packageMetadataFolder);
    fs.writeFileSync(path.join(packageMetadataFolder, 'resources.content.tirex.json'), JSON.stringify(resourceContent, null, 3));
}
