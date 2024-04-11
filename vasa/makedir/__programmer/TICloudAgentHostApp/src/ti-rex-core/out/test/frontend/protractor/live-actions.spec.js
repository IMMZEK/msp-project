'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const protractor_1 = require("protractor");
// determine if we want to run this test
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E) {
    // @ts-ignore
    return;
}
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const util_3 = require("../../../shared/util");
const response_data_1 = require("../../../shared/routes/response-data");
const util_4 = require("../../../frontend/component-helpers/util");
const expect_1 = require("../../expect");
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
packageNode2, packageNode4, folderNode2, 
// PackageGroups
packageGroup2, packageGroup4, 
// Packages
package2, package4, 
// Devices
device1 } = Data;
const softwareFolder = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: 'softwareFolder',
    nodePublicId: 'publicSoftwareFolder',
    name: 'Software',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: null,
    packageGroupPublicUid: null,
    filterData: {
        filterPackageGroup: []
    }
};
const leafNodeLiveAction = {
    nodeType: response_data_1.Nodes.NodeType.LEAF_NODE,
    nodeDbId: 'liveAction',
    nodePublicId: 'publicLiveAction',
    name: 'Live action leaf',
    descriptor: {
        icon: "Document" /* Nodes.Icon.DOCUMENT */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: package4.packagePublicUid,
    packageGroupPublicUid: packageGroup4.packageGroupPublicUid,
    filterData: {
        filterPackageGroup: []
    },
    description: 'this is a description',
    link: 'content/liveAction/Documentation_Overview.html'
};
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        devices: [device1],
        packages: [package2, package4],
        packageGroups: [packageGroup2, packageGroup4]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [softwareFolder.nodeDbId],
        [softwareFolder.nodeDbId]: [packageNode2.nodeDbId, packageNode4.nodeDbId],
        [packageNode2.nodeDbId]: [folderNode2.nodeDbId],
        [packageNode4.nodeDbId]: [leafNodeLiveAction.nodeDbId]
    },
    nodeData: (0, util_3.objectFromKeyValuePairs)([packageNode2, packageNode4, leafNodeLiveAction, softwareFolder, folderNode2].map(node => ({
        key: node.nodeDbId,
        value: node
    })))
};
const liveActionJumpToNodeIds = {
    SAME_PACKAGE: 'test-id-jump-to-node-same-package',
    ANOTHER_PACKAGE: 'test-id-jump-to-node-other-package',
    OUTSIDE_PACKAGE: 'test-id-jump-to-node-outside-package',
    WITH_CHAPTER: 'test-id-jump-to-node-with-chapter',
    INVALID_NODE: 'test-id-jump-to-node-invalid-node',
    INVALID_GROUP: 'test-id-jump-to-node-invalid-group',
    INVALID_PUBLIC_ID: 'test-id-jump-to-node-invalid-public-id'
};
const liveActionJumpToNodeInCurrentPackage = {
    SAME_PACKAGE: 'test-id-jump-to-node-in-current-package-same-package',
    ANOTHER_PACKAGE: 'test-id-jump-to-node-in-current-package-other-package',
    WITH_CHAPTER: 'test-id-jump-to-node-in-current-package-with-chapter',
    INVALID_NODE: 'test-id-jump-to-node-in-current-package-invalid-node'
};
describe('[frontend] LiveActions - REX-2608#1', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    const apis = new apis_1.APIs();
    describe('jumpToNode', function () {
        beforeEach(async function () {
            await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
        });
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
        });
        it('Should jump to node in the same package', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.SAME_PACKAGE);
            await (0, util_2.verifyUrl)({ apis, urlQuery: {}, node: packageNode4 });
        });
        it('Should jump to node with a filter set', async function () {
            const urlQuery = {
                a: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
            };
            await (0, util_2.updateBrowserUrl)({ apis, urlQuery });
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.SAME_PACKAGE);
            await (0, util_2.verifyUrl)({ apis, urlQuery, node: packageNode4 });
        });
        it('Should jump to node in another package', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.ANOTHER_PACKAGE);
            await (0, util_2.verifyUrl)({ apis, urlQuery: {}, node: folderNode2 });
        });
        it('Should jump to node outside a package', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.OUTSIDE_PACKAGE);
            await (0, util_2.verifyUrl)({ apis, urlQuery: {}, node: softwareFolder });
        });
        it('Should jump to node with chapter', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.WITH_CHAPTER);
            await (0, util_2.verifyUrl)({ apis, urlQuery: { chapter: 'test-chapter' }, node: folderNode2 });
        });
        it('Should handle an invalid node', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.INVALID_NODE);
            const text = await getMessageText();
            (0, expect_1.expect)(text).to.contain('This resource does not exist');
        });
        it('Should handle an invalid group', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.INVALID_GROUP);
            const text = await getMessageText();
            (0, expect_1.expect)(text).to.contain('This resource does not exist');
        });
        it('Should handle an invalid public id', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeIds.INVALID_PUBLIC_ID);
            const text = await getMessageText();
            (0, expect_1.expect)(text).to.contain('This resource does not exist');
        });
    });
    describe('jumpToNodeInCurrentPackage', function () {
        beforeEach(async function () {
            await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
        });
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
        });
        it('Should jump to node in the same package', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeInCurrentPackage.SAME_PACKAGE);
            await (0, util_2.verifyUrl)({ apis, urlQuery: {}, node: packageNode4 });
        });
        it('Should jump to node with a filter set', async function () {
            const urlQuery = {
                a: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
            };
            await (0, util_2.updateBrowserUrl)({ apis, urlQuery });
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeInCurrentPackage.SAME_PACKAGE);
            await (0, util_2.verifyUrl)({ apis, urlQuery, node: packageNode4 });
        });
        it.skip('Should jump to node with chapter', async function () { });
        it('Should handle trying to jump to node in another package (error)', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeInCurrentPackage.ANOTHER_PACKAGE);
            const text = await getMessageText();
            (0, expect_1.expect)(text).to.contain('This resource does not exist');
        });
        it('Should handle an invalid node', async function () {
            await (0, util_2.goToNode)(leafNodeLiveAction, apis);
            await clickInIframe(liveActionJumpToNodeInCurrentPackage.INVALID_NODE);
            const text = await getMessageText();
            (0, expect_1.expect)(text).to.contain('This resource does not exist');
        });
    });
    describe.skip('importProject', function () { });
    describe.skip('importProjectInCurrentPacakge', function () { });
    /**
     * Note: this frame doesn't have our test helper scripts, promise sync, etc.
     * Need to be careful about what we do here.
     *
     */
    async function clickInIframe(linkId) {
        await protractor_1.browser.switchTo().frame((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.iframeElement)).getWebElement());
        await protractor_1.browser.executeScript('arguments[0].click();', (0, protractor_1.element)(protractor_1.by.id(linkId)));
        await protractor_1.browser.switchTo().defaultContent();
    }
    async function getMessageText() {
        const message = (0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.messageText));
        return message.getText();
    }
});
