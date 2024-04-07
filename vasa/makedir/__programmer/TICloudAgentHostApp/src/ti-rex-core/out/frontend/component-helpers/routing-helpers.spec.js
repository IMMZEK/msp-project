"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryString = require("query-string");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const create_app_props_1 = require("../testing-helpers/create-app-props");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const RoutingHelpers = require("./routing-helpers");
const Data = require("../../test/server-harness/server-harness-data");
const util_1 = require("./util");
const util_2 = require("../../test/frontend/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Package Nodes
packageNode2, packageNode3, packageNode8, 
// PackageGroups
packageGroup2, packageGroup3, packageGroup8, 
// Packages
package2, package3, package8 } = Data;
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package3, package8],
        packageGroups: [packageGroup2, packageGroup3, packageGroup8]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2.nodeDbId, packageNode3.nodeDbId, packageNode8.nodeDbId]
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode3.nodeDbId]: packageNode3,
        [packageNode8.nodeDbId]: packageNode8
    }
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] RoutingHelpers', function () {
    before(async () => {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_2.setupEnzymeTest)({ data: data1 });
    });
    after(() => {
        (0, util_2.cleanupEnzymeTest)();
    });
    describe('getDefaultNodeLink', function () {
        it('Should get the default node link when we have a query', async function () {
            const args = await callMethod({
                a: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
            });
            const prefix = RoutingHelpers.getLinkPrefix();
            (0, expect_1.expect)(args).to.deep.equal(`${prefix}/${util_1.Page.EXPLORE}/node?a=${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`);
        });
        it('Should get the default node link when we have no query', async function () {
            const args = await callMethod({});
            const prefix = RoutingHelpers.getLinkPrefix();
            (0, expect_1.expect)(args).to.deep.equal(`${prefix}/${util_1.Page.EXPLORE}/node`);
        });
        it(`Should handle a link to ${util_1.Page.NODE_CONTENT}`, async function () {
            const args = await callMethod({}, util_1.Page.NODE_CONTENT);
            const prefix = RoutingHelpers.getLinkPrefix();
            (0, expect_1.expect)(args).to.deep.equal(`${prefix}/${util_1.Page.NODE_CONTENT}`);
        });
        async function callMethod(params, page = util_1.Page.EXPLORE) {
            const appProps = await (0, create_app_props_1.createAppProps)({
                page,
                urlQuery: params
            });
            return RoutingHelpers.getDefaultNodeLink(appProps);
        }
    });
    describe.skip('TODO getLinkPrefix', function () { });
    describe.skip('TODO getNodeLink', function () {
        // Indirectly testing via getNodeLinkFromNode
    });
    describe('getNodeLinkFromNode', function () {
        const urlQuery = {
            a: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        const id = `${packageNode2.nodePublicId}__${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`;
        it('Should get a node link when we have a query', async function () {
            const result = await callMethod(urlQuery, packageNode2);
            const prefix = RoutingHelpers.getLinkPrefix();
            const query = { ...urlQuery, node: id };
            (0, expect_1.expect)(result).to.deep.equal(`${prefix}/${util_1.Page.EXPLORE}/node?${QueryString.stringify(query)}`);
        });
        it('Should get a node link when we have no query', async function () {
            const result = await callMethod({}, packageNode2);
            const prefix = RoutingHelpers.getLinkPrefix();
            (0, expect_1.expect)(result).to.deep.equal(`${prefix}/${util_1.Page.EXPLORE}/node?node=${id}`);
        });
        async function callMethod(params, node) {
            const appProps = await (0, create_app_props_1.createAppProps)({
                page: util_1.Page.EXPLORE,
                urlQuery: params
            });
            const [nodeInner] = await appProps.apis.getNodes([node.nodeDbId]);
            return RoutingHelpers.getNodeLinkFromNode(nodeInner, appProps);
        }
    });
    describe('getUrlQuery', function () {
        it('Should get url query', async function () {
            const query = '?search=test';
            const expectedParams = {
                search: 'test'
            };
            const args = RoutingHelpers.getUrlQuery(query);
            (0, expect_1.expect)(args).to.deep.equal(expectedParams);
        });
        it('Should handle an empty url query', async function () {
            const query = '';
            const expectedParams = {};
            const args = RoutingHelpers.getUrlQuery(query);
            (0, expect_1.expect)(args).to.deep.equal(expectedParams);
        });
        it('Should handle unknown items in the url query', async function () {
            const query = '?search=test&foo=bar';
            const expectedParams = {
                search: 'test'
            };
            const args = RoutingHelpers.getUrlQuery(query);
            (0, expect_1.expect)(args).to.deep.equal(expectedParams);
        });
    });
    describe.skip('TODO updateUrl', function () { });
});
