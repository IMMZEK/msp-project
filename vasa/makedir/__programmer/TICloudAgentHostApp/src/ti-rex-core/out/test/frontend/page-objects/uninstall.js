'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uninstall = void 0;
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
var Uninstall;
(function (Uninstall) {
    // Actions
    async function yes() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.uninstallYesButton)));
    }
    Uninstall.yes = yes;
    async function no() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.uninstallNoButton)));
        // TODO consider verifying modal closed
    }
    Uninstall.no = no;
})(Uninstall || (exports.Uninstall = Uninstall = {}));
