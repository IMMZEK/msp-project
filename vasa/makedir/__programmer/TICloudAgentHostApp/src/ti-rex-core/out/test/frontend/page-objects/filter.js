'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeywordInput = exports.BoardDeviceInput = exports.Filter = void 0;
const protractor_1 = require("protractor");
// our modules
const expect_1 = require("../../expect");
const util_1 = require("./util");
const util_2 = require("../../../frontend/component-helpers/util");
const open_close_helpers_1 = require("./open-close-helpers");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var Filter;
(function (Filter) {
    // Actions
    async function openAllFiltersPopup() {
        await (0, util_1.waitForPromisesAfterActionToResolve)(() => (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.filterAllFiltersButton))));
    }
    Filter.openAllFiltersPopup = openAllFiltersPopup;
    // Verify
    async function verifyRadioButtonPresence(key, publicId) {
        const isRadioButtonDisplayed = await (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.filterRadioButton(key, publicId))).isPresent();
        (0, expect_1.expect)(isRadioButtonDisplayed).to.equal(true);
    }
    Filter.verifyRadioButtonPresence = verifyRadioButtonPresence;
    async function verifyRadioButtonValue(key, publicId, value) {
        const selected = await (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.filterRadioButton(key, publicId))).isSelected();
        (0, expect_1.expect)(selected).to.equal(value);
    }
    Filter.verifyRadioButtonValue = verifyRadioButtonValue;
})(Filter || (exports.Filter = Filter = {}));
class FilterInput {
    static async click() {
        await this.getInput().click();
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_2.TEST_ID.suggestionsList);
    }
    static async clickSuggestion(id) {
        await (0, util_1.waitForPromisesAfterActionToResolve)(() => (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.suggestionsItem(id)))));
    }
    static async enterText(text) {
        await (0, util_1.waitForPromisesAfterActionToResolve)(() => {
            // Need to cast due to use of protractor's internal promise type
            return this.getInput().sendKeys(text);
        });
    }
    static async getValue() {
        return this.getInput().getAttribute('value');
    }
    static getInput() {
        throw new Error('Did not implement getInput');
    }
}
class BoardDeviceInput extends FilterInput {
    static getInput() {
        return (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.filterBoardDeviceFilter)).element(protractor_1.by.css('input'));
    }
}
exports.BoardDeviceInput = BoardDeviceInput;
class KeywordInput extends FilterInput {
    static getInput() {
        return (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.filterKeywordsFilter)).element(protractor_1.by.css('input'));
    }
}
exports.KeywordInput = KeywordInput;
