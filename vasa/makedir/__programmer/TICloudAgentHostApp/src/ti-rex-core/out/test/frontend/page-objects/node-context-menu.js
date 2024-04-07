'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeContextMenu = void 0;
// 3rd party
const protractor_1 = require("protractor");
const util_1 = require("./util");
const util_2 = require("../../../frontend/component-helpers/util");
const open_close_helpers_1 = require("./open-close-helpers");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var NodeContextMenu;
(function (NodeContextMenu) {
    // Actions
    async function openInstall(node, apis) {
        // update url to point to package node (so it becomes expanded in tree, so its rendered)
        await (0, util_1.goToNode)(node, apis);
        await openContextMenu(node.nodeDbId);
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.nodeContextMenuInstall)));
    }
    NodeContextMenu.openInstall = openInstall;
    async function openUninstall(node, apis) {
        // update url to point to package node (so it becomes expanded in tree, so its rendered)
        await (0, util_1.goToNode)(node, apis);
        await openContextMenu(node.nodeDbId);
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.nodeContextMenuUninstall)));
    }
    NodeContextMenu.openUninstall = openUninstall;
    async function openManageVersions(node, apis) {
        // update url to point to package node (so it becomes expanded in tree, so its rendered)
        await (0, util_1.goToNode)(node, apis);
        await openContextMenu(node.nodeDbId);
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.nodeContextMenuManageVersions)));
    }
    NodeContextMenu.openManageVersions = openManageVersions;
    async function openDownload(node, apis) {
        // update url to point to package node (so it becomes expanded in tree, so its rendered)
        await (0, util_1.goToNode)(node, apis);
        await openContextMenu(node.nodeDbId);
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.nodeContextMenuDownloadVersion)));
    }
    NodeContextMenu.openDownload = openDownload;
    async function openImport(node, apis) {
        // update url to point to package node (so it becomes expanded in tree, so its rendered)
        await (0, util_1.goToNode)(node, apis);
        await openContextMenu(node.nodeDbId);
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.nodeContextMenuImport)));
    }
    NodeContextMenu.openImport = openImport;
    async function openContextMenu(nodeDbId) {
        const buttonId = util_2.TEST_ID.nodePresentationContextMenuButton(nodeDbId);
        await (0, open_close_helpers_1.waitUntilItemOpen)(buttonId);
        await protractor_1.browser
            .actions()
            .mouseMove((0, protractor_1.element)(protractor_1.by.id(buttonId)))
            .click()
            .perform();
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_2.TEST_ID.nodePresentationContextMenu);
        /*
        // Don't do this for now since we can't click the svg on the browser side and it isn't wrapped in a button
        await openDropdownMenu(
        TEST_IDS.nodePresentationContextMenuButton(nodeDbId),
            TEST_IDS.nodePresentationContextMenu
        );
        */
    }
    NodeContextMenu.openContextMenu = openContextMenu;
    // Verify
    async function verifyDialogOpen() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_2.TEST_ID.nodeContentMenuDialog);
    }
    NodeContextMenu.verifyDialogOpen = verifyDialogOpen;
})(NodeContextMenu || (exports.NodeContextMenu = NodeContextMenu = {}));
