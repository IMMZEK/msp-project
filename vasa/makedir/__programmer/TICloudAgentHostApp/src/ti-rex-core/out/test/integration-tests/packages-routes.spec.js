"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const database_utils_1 = require("./database-utils");
const expect_1 = require("../expect");
const dbBuilderUtils_1 = require("../../lib/dbBuilder/dbBuilderUtils");
const assert = require("assert");
const nodes_utils_1 = require("./nodes-utils");
// allow expect(blah).to.exist
// tslint:disable:no-unused-expression
describe('DB Package/Package Group APIs', () => {
    let packagesMetadata;
    before(async () => {
        const metadata = generateMetadata();
        await (0, nodes_utils_1.updateDatabase)(metadata);
        packagesMetadata = metadata.packages;
    });
    describe("api/packages" /* API.GET_PACKAGES */, () => {
        let packages;
        before(async () => {
            packages = await makeApiRequest("api/packages" /* API.GET_PACKAGES */);
        });
        it('should have a valid entry for each package', async () => {
            (0, expect_1.expect)(packages.length).to.equal(packagesMetadata.length);
            for (const pkg of packagesMetadata) {
                const { packageOverview } = pkg;
                const packageData = packages.find(p => p.name === packageOverview.name &&
                    p.packageVersion === packageOverview.version);
                (0, expect_1.expect)(packageData).to.exist;
                (0, expect_1.expect)(packageData.packagePublicId).to.equal(packageOverview.packageId);
                (0, expect_1.expect)(packageData.packagePublicUid).to.equal(packageOverview.packageUId);
                // These are public ids.... this check doesn't make sense
                // packageData.packageGroupPublicUids.map(id => expectValidDbId(id))
                (0, expect_1.expect)(packageData.licenses).to.deep.equal(['content/path/to/license/file']);
                if (!pkg.packageOverview.supplements) {
                    (0, expect_1.expect)(packageData.packageType).to.equal("MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */);
                }
                else {
                    (0, expect_1.expect)(packageData.packageType).to.equal("SubPackage" /* Nodes.PackageType.SUB_PACKAGE */);
                }
            }
        });
        it('should have unique package group db ids', async () => {
            const packageGroupDbIds = packages.map(p => p.packageGroupPublicUids);
            (0, expect_1.expect)(_.uniq(packageGroupDbIds).length).to.equal(packageGroupDbIds.length);
        });
        it('should return packages without duplicates and sorted', async () => {
            const uids = packages.map(p => p.packagePublicUid);
            // Alphabetically, then newest to oldest
            const expectedOrder = [
                'com.ti.A_SUPPLEMENTAL_PACKAGE__1.23.45.00',
                'com.ti.PACKAGEA__1.23.45.00',
                'com.ti.PACKAGEB__1.23.46.00',
                'com.ti.PACKAGEB__1.23.45.01',
                'com.ti.PACKAGEB__1.23.45.00',
                'com.ti.PACKAGEC__1.23.45.00',
                'com.ti.SUPPLEMENTAL_PACKAGE_WITH_MULTIPLE_PARENTS__2.34.56.00' // should not occur duplicated
            ];
            (0, expect_1.expect)(uids).to.deep.equal(expectedOrder);
        });
    });
    describe("api/packageGroups" /* API.GET_PACKAGE_GROUPS */, () => {
        let packageGroups;
        let mainPackageOverviewsMetadata;
        before(async () => {
            packageGroups = await makeApiRequest("api/packageGroups" /* API.GET_PACKAGE_GROUPS */);
            mainPackageOverviewsMetadata = packagesMetadata
                .filter(p => !p.packageOverview.supplements)
                .map(p => p.packageOverview);
        });
        it('should return the same number of package groups as main packages', async () => {
            (0, expect_1.expect)(packageGroups.length).to.equal(mainPackageOverviewsMetadata.length);
        });
        specify("a package group has (a) the id of main package prefixed with 'grp_', (b) the same version and hide-by-default as the main package", async () => {
            for (const mainPackageOverviewMetadata of mainPackageOverviewsMetadata) {
                const packageGroup = packageGroups.find(pg => pg.packageGroupPublicUid ===
                    nodes_utils_1.GROUP_ID_PREFIX + mainPackageOverviewMetadata.packageUId);
                (0, expect_1.expect)(packageGroup).to.exist;
                (0, expect_1.expect)(packageGroup.packageGroupPublicId).to.equal((0, dbBuilderUtils_1.encodePackageGroupPublicId)(nodes_utils_1.GROUP_ID_PREFIX + mainPackageOverviewMetadata.packageId));
                (0, expect_1.expect)(packageGroup.packageGroupVersion).to.equal(mainPackageOverviewMetadata.version);
                (0, expect_1.expect)(packageGroup.mainPackagePublicUid).to.equal(mainPackageOverviewMetadata.packageUId);
                (0, expect_1.expect)(packageGroup.hideByDefault).to.equal(mainPackageOverviewMetadata.hideByDefault || false);
            }
        });
        it('should return package groups sorted by the order of their respective main packages', async () => {
            const uids = packageGroups.map(p => p.packageGroupPublicUid);
            // Alphabetically, then newest to oldest
            const expectedOrder = [
                nodes_utils_1.GROUP_ID_PREFIX + 'com.ti.PACKAGEA__1.23.45.00',
                nodes_utils_1.GROUP_ID_PREFIX + 'com.ti.PACKAGEB__1.23.46.00',
                nodes_utils_1.GROUP_ID_PREFIX + 'com.ti.PACKAGEB__1.23.45.01',
                nodes_utils_1.GROUP_ID_PREFIX + 'com.ti.PACKAGEB__1.23.45.00',
                nodes_utils_1.GROUP_ID_PREFIX + 'com.ti.PACKAGEC__1.23.45.00'
            ];
            (0, expect_1.expect)(uids).to.deep.equal(expectedOrder);
        });
        specify('a package group lists the UIDs of the packages it contains', async () => {
            for (const mainPackageOverviewMetadata of mainPackageOverviewsMetadata) {
                const packageGroup = packageGroups.find(pg => pg.packageGroupPublicUid ===
                    nodes_utils_1.GROUP_ID_PREFIX + mainPackageOverviewMetadata.packageUId);
                if (!mainPackageOverviewMetadata.dependencies ||
                    !mainPackageOverviewMetadata.dependencies.length) {
                    (0, expect_1.expect)(packageGroup.packagesPublicUids.length).to.equal(1);
                    (0, expect_1.expect)(packageGroup.packagesPublicUids[0]).to.equal(mainPackageOverviewMetadata.packageUId);
                }
                else {
                    // must have main and supplemental packages
                    (0, expect_1.expect)(packageGroup.packagesPublicUids.length).to.equal(2);
                    (0, expect_1.expect)(packageGroup.packagesPublicUids).to.include(mainPackageOverviewMetadata.packageUId);
                    (0, expect_1.expect)(packageGroup.packagesPublicUids).to.include((0, dbBuilderUtils_1.formUid)(mainPackageOverviewMetadata.dependencies[0].refId, mainPackageOverviewMetadata.dependencies[0].versionRange));
                }
            }
        });
        it(`should return a group's package list sorted in the same order as returned by ${"api/packages" /* API.GET_PACKAGES */}`, async () => {
            // Alphabetically, then newest to oldest
            const expectedOrder = [
                'com.ti.A_SUPPLEMENTAL_PACKAGE__1.23.45.00',
                'com.ti.PACKAGEA__1.23.45.00'
            ];
            (0, expect_1.expect)(packageGroups[0].packagesPublicUids).to.deep.equal(expectedOrder);
        });
        specify.skip('a device/devtool package group should not have a main package', async () => { });
    });
});
function generateMetadata() {
    const device = (0, database_utils_1.generateDevice)('DEVICE', 'device');
    const devtool = (0, database_utils_1.generateDevtool)('DEVTOOL', 'devtool');
    // create some packages that differ only by version, and some others by name
    // make sure we have at least one supplemental package
    const packages = [
        createPackage('PackageA', '1.23.45.00', true),
        createPackage('PackageB', '1.23.45.00', false),
        createPackage('PackageB', '1.23.45.01', true),
        createPackage('PackageB', '1.23.46.00'),
        createPackage('PackageC', '1.23.45.00') // 4
    ];
    packages.push(createSupplementalPackage('A_Supplemental_Package', '1.23.45.00', [
        packages[0].packageOverview // NOTE: name is specifically chosen to alphabetically come before 'PackageA'
    ]) // 5
    );
    packages.push(createSupplementalPackage('Supplemental_Package_With_Multiple_Parents', '2.34.56.00', [
        packages[1].packageOverview,
        packages[2].packageOverview
    ]) // 6
    );
    // shuffle packages to test sorting
    // TODO: DB does some of its own sorting which messes with this order ... - should do a unit test too
    const shuffledPackages = [
        packages[2],
        packages[6],
        packages[4],
        packages[0],
        packages[3],
        packages[5],
        packages[1]
    ];
    return {
        devices: [device],
        devtools: [devtool],
        packages: shuffledPackages
    };
    function createPackage(name, version, hideByDefault) {
        const packageOverview = (0, database_utils_1.generatePackageOverview)(name, version, { hideByDefault });
        const overviews = [];
        return {
            packageOverview,
            resources: [(0, database_utils_1.generateResource)('resource', packageOverview, device, devtool)],
            overviews,
            simpleCategories: []
        };
    }
    function createSupplementalPackage(name, version, parentPackages) {
        const supplementalPackage = createPackage(name, version);
        // check that parent packages all have the same packageId
        const parentPackageId = parentPackages[0].packageId;
        parentPackages.forEach(pkg => {
            assert(pkg.packageId === parentPackageId, 'all parent packages of a supplemental package must have the same packageIds');
        });
        const parentVersionRange = parentPackages.map(pkg => pkg.version).join('||');
        supplementalPackage.packageOverview.supplements = {
            packageId: parentPackageId,
            versionRange: parentVersionRange
        };
        supplementalPackage.packageOverview.semver = version;
        parentPackages.forEach(parentPackage => {
            parentPackage.dependencies = [
                {
                    refId: supplementalPackage.packageOverview.id,
                    versionRange: supplementalPackage.packageOverview.version
                }
            ];
        });
        return supplementalPackage;
    }
}
async function makeApiRequest(api) {
    try {
        const result = await expect_1.chai.request(scriptsUtil.mochaServer).get(api);
        const rawData = JSON.parse(result.text);
        const { sessionId } = rawData.sideBand;
        (0, expect_1.expect)(sessionId).to.not.be.undefined;
        (0, expect_1.expect)(parseInt(sessionId)).to.be.lessThan(new Date().getTime());
        return rawData.payload;
    }
    catch (e) {
        if (e.message && e.response) {
            e.message = `${e.message} (${e.response.text})`;
        }
        throw e;
    }
}
