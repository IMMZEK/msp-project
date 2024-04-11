'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUrl = exports.waitForPromisesAfterActionToResolve = exports.updateBrowserUrl = exports.getItemById = exports.goToNode = exports.BROWSER_WAIT = exports.clickElement = void 0;
// 3rd party
const _ = require("lodash");
const protractor_1 = require("protractor");
const QueryString = require("query-string");
const browser_scripts_1 = require("../browser-scripts");
const expect_1 = require("../../expect");
const page_1 = require("../../../shared/routes/page");
const routing_helpers_1 = require("../../../frontend/component-helpers/routing-helpers");
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const util_1 = require("../util");
///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
async function clickElement(element) {
    // Must use the following approach to click an element with events for firefox support
    // https://stackoverflow.com/questions/15294630/selenium-firefox-command-click-doesnt-work-with-a-found-element
    // Also prevents issues where we click on something with an animation then continue to do another action but the animation isn't completed
    await protractor_1.browser.executeScript('arguments[0].click();', element);
}
exports.clickElement = clickElement;
exports.BROWSER_WAIT = 2000;
async function goToNode(node, apis) {
    const urlParts = (await protractor_1.browser.getCurrentUrl()).split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    await updateBrowserUrl({ apis, node, urlQuery: (0, routing_helpers_1.getUrlQuery)(queryString) });
}
exports.goToNode = goToNode;
function getItemById(items, id) {
    return Promise.all(items.map(async (item) => {
        const id = await item.getAttribute('id');
        return { id, item };
    })).then(itemsWithIds => {
        const item = itemsWithIds.find(item => item.id === id);
        if (!item) {
            return Promise.reject(new Error(`Could not find item with id ${id}`));
        }
        return item.item;
    });
}
exports.getItemById = getItemById;
async function updateBrowserUrl({ apis, urlQuery, node, page }) {
    const link = node
        ? await (0, util_1.getNodeLinkForTest)(node, urlQuery, apis, page)
        : (0, util_1.getLinkForTest)(urlQuery, page);
    await waitForPromisesAfterActionToResolve(() => (0, browser_scripts_1.updateUrlForTesting)(link));
}
exports.updateBrowserUrl = updateBrowserUrl;
async function waitForPromisesAfterActionToResolve(action) {
    const prevIndicies = await (0, browser_scripts_1.getActivePromiseIndicies)();
    await action();
    const indicies = await (0, browser_scripts_1.getActivePromiseIndicies)();
    await (0, browser_scripts_1.waitForPromisesToResolve)(_.difference(indicies, prevIndicies));
}
exports.waitForPromisesAfterActionToResolve = waitForPromisesAfterActionToResolve;
async function verifyUrl({ apis, urlQuery, node, page = page_1.Page.EXPLORE }) {
    const browserUrl = await protractor_1.browser.getCurrentUrl();
    const prefix = `${test_helpers_1.testingGlobals.remoteserverUrl}/${page}`;
    (0, expect_1.expect)(browserUrl.startsWith(prefix)).to.be.true;
    if (node) {
        const link = await (0, util_1.getNodeLinkForTest)(node, urlQuery, apis, page);
        (0, expect_1.expect)(browserUrl.endsWith(link)).to.be.true;
    }
    else {
        const link = `${prefix}/${page}` + _.isEmpty(urlQuery) ? '' : `?${QueryString.stringify(urlQuery)}`;
        (0, expect_1.expect)(browserUrl.endsWith(link)).to.be.true;
    }
}
exports.verifyUrl = verifyUrl;
