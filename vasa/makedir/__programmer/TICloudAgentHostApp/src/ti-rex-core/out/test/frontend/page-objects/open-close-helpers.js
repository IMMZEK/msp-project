"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openNestedDropdownMenu = exports.waitUntilItemClosed = exports.waitUntilItemOpen = exports.closeItem = exports.openItem = void 0;
const protractor_1 = require("protractor");
// our modules
const util_1 = require("./util");
/**
 * Helpers for opening and closing UI elements
 *
 */
async function openItem(itemButtonId, itemId) {
    await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(itemButtonId)));
    await waitUntilItemOpen(itemId);
}
exports.openItem = openItem;
async function closeItem(itemButtonId, itemId) {
    await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(itemButtonId)));
    await waitUntilItemClosed(itemId);
}
exports.closeItem = closeItem;
async function waitUntilItemOpen(itemId) {
    await protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf((0, protractor_1.element)(protractor_1.by.id(itemId))), util_1.BROWSER_WAIT, 'Item did not open');
}
exports.waitUntilItemOpen = waitUntilItemOpen;
async function waitUntilItemClosed(itemId) {
    // Use element.all since for dropdowns there may be multiple items with this id
    // This is the case for nested dropdowns
    const items = (await protractor_1.element.all(protractor_1.by.id(itemId)));
    await Promise.all(items.map(async (item) => {
        await protractor_1.browser.wait(protractor_1.ExpectedConditions.not(protractor_1.ExpectedConditions.presenceOf(item)), util_1.BROWSER_WAIT, 'Item did not close');
    }));
}
exports.waitUntilItemClosed = waitUntilItemClosed;
async function openNestedDropdownMenu(menuButtonId, _menuId) {
    await protractor_1.browser
        .actions()
        .mouseMove((0, protractor_1.element)(protractor_1.by.id(menuButtonId)))
        .perform();
    // Currently don't have support for nested menus having their own unique ids,
    // so this does not validate anything (cases warning about duplicate items with the id)
    // await expect(element(by.id(menuId)).isPresent()).to.eventually.be.true;
    // Instead just wait for a bit so the menu has time to animate and display
    await protractor_1.browser.sleep(200);
}
exports.openNestedDropdownMenu = openNestedDropdownMenu;
