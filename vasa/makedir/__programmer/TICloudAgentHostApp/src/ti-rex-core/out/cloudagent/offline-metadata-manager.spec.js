"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const database_utils_1 = require("../test/integration-tests/database-utils");
const expect_1 = require("../test/expect");
const testing_util_1 = require("./testing-util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const package1 = {
    packageOverview: (0, database_utils_1.generatePackageOverview)('package1', '1.0.0.0', {
        dependencies: [
            {
                refId: 'com.ti.DEP',
                require: "mandatory" /* PackageDependencyType.MANDATORY */,
                versionRange: '1.2.3'
            }
        ],
        // @ts-ignore
        localPackagePath: '/home/auser/foobar'
    }),
    overviews: [],
    resources: [],
    simpleCategories: []
};
const package2 = {
    packageOverview: (0, database_utils_1.generatePackageOverview)('package2', '1.0.0.0', {
        // @ts-ignore
        localPackagePath: '/home/auser/ti/'
    }),
    overviews: [],
    resources: [],
    simpleCategories: []
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[cloudagent] OfflineMetadataManager', function () {
    describe('getInstalledPackages', function () {
        it('Should find and list the rex3 packages', async function () {
            // TODO this test is failing because we only write metadata to disk, we don't make a fake package
            // We end up, on startup, detecting it doesn't exist on the fs then proceeding to remove the metadata.
            const rexModule = await (0, testing_util_1.getModule)({
                metadata: {
                    devices: [],
                    devtools: [],
                    packages: [package1, package2]
                }
            });
            const packages = await rexModule.getInstalledPackages();
            verifyPackages(packages, [package1, package2]);
        });
        it('Should return empty array if there are no rex3 packages', async function () {
            const rexModule = await (0, testing_util_1.getModule)({});
            const packages = await rexModule.getInstalledPackages();
            (0, expect_1.expect)(packages).to.be.empty;
        });
    });
    describe.skip('offlinePackageMetadata', async function () { });
    describe.skip('removePackageMetadata', async function () { });
    function verifyPackages(packages, expectedPackages) {
        (0, expect_1.expect)(packages).to.deep.equal(expectedPackages.map((pkg, idx) => {
            const installedPackage = {
                name: packages[idx].name,
                packageVersion: pkg.packageOverview.packageVersion,
                packagePublicId: pkg.packageOverview.packageId,
                packagePublicUid: pkg.packageOverview.packageUId,
                localPackagePath: pkg.packageOverview
                    .localPackagePath,
                subType: null,
                featureType: null,
                ccsVersion: null
            };
            return installedPackage;
        }));
    }
});
