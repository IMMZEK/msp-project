'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wizard = void 0;
// 3rd party
const protractor_1 = require("protractor");
// our modules
const expect_1 = require("../../expect");
const util_1 = require("../../../frontend/component-helpers/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var Wizard;
(function (Wizard) {
    // Actions
    // Verify
    async function verifyNextDisabled() {
        const isNextEnabled = await (0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.wizardNextButton)).isEnabled();
        (0, expect_1.expect)(isNextEnabled).to.be.false;
    }
    Wizard.verifyNextDisabled = verifyNextDisabled;
})(Wizard || (exports.Wizard = Wizard = {}));
