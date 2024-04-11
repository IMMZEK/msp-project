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
const create_app_props_1 = require("../testing-helpers/create-app-props");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const PublicIdHelpers = require("./public-id-helpers");
const Data = require("../../test/server-harness/server-harness-data");
const util_1 = require("./util");
const errors_1 = require("../../shared/errors");
const util_2 = require("../../test/frontend/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Folder Nodes
folderNodeWithValidGroup, folderNodeNoGroup, 
// PackageGroups
packageGroup2, 
// Packages
package2 } = Data;
// Data
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2],
        packageGroups: [packageGroup2]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [folderNodeWithValidGroup, folderNodeNoGroup].map(item => item.nodeDbId)
    },
    nodeData: {
        [folderNodeWithValidGroup.nodeDbId]: folderNodeWithValidGroup,
        [folderNodeNoGroup.nodeDbId]: folderNodeNoGroup
    }
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] PublicIdHelpers', function () {
    before(async () => {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_2.setupEnzymeTest)({ data: data1 });
    });
    after(() => {
        (0, util_2.cleanupEnzymeTest)();
    });
    describe('getNodeDbIdFromPublicId', function () {
        it('Should handle a node with no group', async function () {
            const dbId = await callMethod(folderNodeNoGroup, null, null);
            (0, expect_1.expect)(dbId).to.deep.equal(folderNodeNoGroup.nodeDbId);
        });
        it('Should handle a node with a group (group is LATEST)', async function () {
            const dbId = await callMethod(folderNodeWithValidGroup, packageGroup2.packageGroupPublicId, util_1.LATEST);
            (0, expect_1.expect)(dbId).to.deep.equal(folderNodeWithValidGroup.nodeDbId);
        });
        it('Should handle a node with a group (group is not LATEST)', async function () {
            const dbId = await callMethod(folderNodeWithValidGroup, packageGroup2.packageGroupPublicId, packageGroup2.packageGroupVersion);
            (0, expect_1.expect)(dbId).to.deep.equal(folderNodeWithValidGroup.nodeDbId);
        });
        it('Should handle an incorrect group being passed in', async function () {
            const dbId = await callMethod(folderNodeWithValidGroup, 'foo', util_1.LATEST);
            (0, expect_1.expect)(dbId).to.equal(null);
        });
        it('Should handle a node with a group but no group provided', async function () {
            return (0, expect_1.expect)(callMethod(folderNodeWithValidGroup, null, util_1.LATEST))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '400');
        });
        async function callMethod(node, packageGroupPublicId, packageGroupVersion) {
            const publicId = packageGroupPublicId && packageGroupVersion
                ? `${node.nodePublicId}__${packageGroupPublicId}__${packageGroupVersion}`
                : node.nodePublicId;
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: util_1.Page.EXPLORE,
                urlQuery: {}
            });
            return PublicIdHelpers.getNodeDbIdFromPublicId(publicId, appProps.packageGroups, appProps.urlQuery, appProps.apis);
        }
    });
    describe('getPublicIdFromIds', function () {
        it('Should handle a node with no group', async function () {
            const node = folderNodeNoGroup;
            const publicId = await callMethod(node);
            (0, expect_1.expect)(publicId).to.deep.equal(node.nodePublicId);
        });
        it('Should handle a node with a group (group is LATEST)', async function () {
            const node = folderNodeWithValidGroup;
            const group = packageGroup2;
            const publicId = await callMethod(node);
            (0, expect_1.expect)(publicId).to.deep.equal(`${node.nodePublicId}__${group.packageGroupPublicId}__${util_1.LATEST}`);
        });
        it('Should handle a node with a group (group is not LATEST)', async function () {
            const node = folderNodeWithValidGroup;
            const group = packageGroup2;
            const publicId = await callMethod(node, {
                a: [`${group.packageGroupPublicId}__${group.packageGroupVersion}`]
            });
            (0, expect_1.expect)(publicId).to.deep.equal(`${node.nodePublicId}__${group.packageGroupPublicId}__${group.packageGroupVersion}`);
        });
        async function callMethod(node, urlQuery = {}) {
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: util_1.Page.EXPLORE,
                urlQuery
            });
            const [nodeReal] = await appProps.apis.getNodes([node.nodeDbId]);
            return PublicIdHelpers.getPublicIdFromIds({
                ...nodeReal,
                allGroups: appProps.packageGroups,
                allPackages: appProps.packages,
                urlQuery: appProps.urlQuery
            });
        }
    });
});
