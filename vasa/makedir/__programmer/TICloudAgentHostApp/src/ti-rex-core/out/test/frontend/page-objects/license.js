'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.License = void 0;
// 3rd party
const protractor_1 = require("protractor");
// our modules
const util_1 = require("../../../frontend/component-helpers/util");
const util_2 = require("./util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var License;
(function (License) {
    // Actions
    async function accept() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.licenseAcceptButton)));
    }
    License.accept = accept;
    async function decline() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.licenseDeclineButton)));
    }
    License.decline = decline;
    // Verify
    async function verifyLicense() {
        await protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.licenseDialog))), 200, 'License did not show up');
    }
    License.verifyLicense = verifyLicense;
    async function verifyNoLicense() {
        await protractor_1.browser.wait(protractor_1.ExpectedConditions.not(protractor_1.ExpectedConditions.presenceOf((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.licenseDialog)))), 200, 'License should not be present');
    }
    License.verifyNoLicense = verifyNoLicense;
})(License || (exports.License = License = {}));
