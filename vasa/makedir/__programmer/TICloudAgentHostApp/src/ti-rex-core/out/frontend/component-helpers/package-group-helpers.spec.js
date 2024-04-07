"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const PackageGroupHelpers = require("./package-group-helpers");
const Data = require("../../test/server-harness/server-harness-data");
const util_1 = require("./util");
const util_2 = require("../../test/frontend/util");
const create_app_props_1 = require("../testing-helpers/create-app-props");
const page_1 = require("../../shared/routes/page");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Package Nodes
packageNode2, packageNode3, packageNode4, 
// PackageGroups
packageGroup2, packageGroup3, packageGroup4, 
// Packages
package2, package3, package4 } = Data;
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package3],
        packageGroups: [packageGroup2, packageGroup3]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode3].map(item => item.nodeDbId)
    },
    nodeData: {}
};
const data2 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package4],
        packageGroups: [packageGroup2, packageGroup4]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode4].map(item => item.nodeDbId)
    },
    nodeData: {}
};
const data3 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package3, package4],
        packageGroups: [packageGroup2, packageGroup3, packageGroup4]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode3, packageNode4].map(item => item.nodeDbId)
    },
    nodeData: {}
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] PackageGroupHelpers', function () {
    before(() => (0, browser_emulator_1.browserEmulator)());
    describe('isLatest', function () {
        afterEach(function () {
            (0, util_2.cleanupEnzymeTest)();
        });
        it('Should be truthy for latest package', async function () {
            const params = {};
            const args = await callMethod({ group: packageGroup2, params, data: data1 });
            (0, expect_1.expect)(args).to.be.true;
        });
        it('Should be falsey for not latest package', async function () {
            const params = {};
            const args = await callMethod({ group: packageGroup3, params, data: data1 });
            (0, expect_1.expect)(args).be.false;
        });
        it('Should be falsey for the newest version of a package which is explictly added (as not latest)', async function () {
            const params = {
                a: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.false;
        });
        it('Should be falsey for the newest version of a package which is explictly added as a range', async function () {
            const params = {
                a: [`${packageGroup2.packageGroupPublicId}__^${packageGroup2.packageGroupVersion}`]
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.false;
        });
        it('Should handle an invalid package (garbage key)', async function () {
            const params = {
                a: ['bla']
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.true;
        });
        it('Should handle an invalid package (correct format, unknown package id)', async function () {
            const params = {
                a: ['foo__1.2.3']
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.true;
        });
        it('Should handle an invalid package (correct format, unknown package version)', async function () {
            const params = {
                a: [`${packageGroup2.packageGroupPublicId}__9.8.7`]
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.true;
        });
        it('Should handle an invalid package (correct format, invalid semver)', async function () {
            const params = {
                a: [`${packageGroup2.packageGroupPublicId}__foo`]
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.true;
        });
        it('Should handle a mix of valid and invalid packages in the url query', async function () {
            const params = {
                a: [
                    `${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`,
                    'foo'
                ]
            };
            const args = await callMethod({ group: packageGroup2, params, data: data2 });
            (0, expect_1.expect)(args).to.be.false;
        });
        async function callMethod({ group, params, data }) {
            await (0, util_2.setupEnzymeTest)({ data });
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            const allGroups = await appProps.apis.getPackageGroups();
            return PackageGroupHelpers.isLatest(group, params, allGroups);
        }
    });
    describe.skip('TODO isHighestVersion', function () { });
    describe('getPackageGroups', function () {
        before(async function () {
            await (0, util_2.setupEnzymeTest)({ data: data3 });
        });
        after(function () {
            (0, util_2.cleanupEnzymeTest)();
        });
        it('Should get all packages provided', async function () {
            const args = await callMethod([
                `${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`,
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`
            ]);
            validateResult([packageGroup2, packageGroup3], args);
        });
        it('Should handle a package with the "latest" label', async function () {
            const args = await callMethod([`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]);
            validateResult([{ ...packageGroup2, isLatest: true }], args);
        });
        it('Should handle a package with a range specified', async function () {
            const args = await callMethod([`${packageGroup2.packageGroupPublicId}__*`]);
            validateResult([packageGroup2], args);
        });
        it('Should handle an invalid package (garbage key)', async function () {
            const args = await callMethod(['bla']);
            validateResult([], args);
        });
        it('Should handle an invalid package (correct format, unknown package id)', async function () {
            const args = await callMethod(['foo__1.2.3']);
            validateResult([], args);
        });
        it('Should handle an invalid package (correct format, unknown package version)', async function () {
            const args = await callMethod([`${packageGroup2.packageGroupPublicId}__9.8.7`]);
            validateResult([], args);
        });
        it('Should handle a mix of valid and invalid packages in the url query', async function () {
            const args = await callMethod([
                `${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`,
                'foo'
            ]);
            validateResult([packageGroup2], args);
        });
        async function callMethod(groups) {
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: page_1.Page.EXPLORE,
                urlQuery: {}
            });
            const allGroups = await appProps.apis.getPackageGroups();
            return PackageGroupHelpers.getPackageGroups(groups, allGroups);
        }
    });
});
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
function validateResult(inputGroups, outputGroups) {
    (0, expect_1.expect)(outputGroups).to.exist;
    (0, expect_1.expect)(outputGroups.length).to.equal(inputGroups.length);
    outputGroups.map((outputGroup, idx) => {
        (0, expect_1.expect)(outputGroup).to.deep.equal({ ...inputGroups[idx], isLatest: outputGroup.isLatest });
        if (inputGroups[idx].isLatest) {
            (0, expect_1.expect)(outputGroup.isLatest).to.equal(inputGroups[idx].isLatest);
        }
    });
}
