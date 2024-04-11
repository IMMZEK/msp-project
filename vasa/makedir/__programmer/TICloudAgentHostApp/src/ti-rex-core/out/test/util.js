"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.afterTest = exports.verifyError = void 0;
// our modules
const expect_1 = require("../test/expect");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
async function verifyError(promise, errorMessageSubstring) {
    await (0, expect_1.expect)(promise).to.eventually.be.rejectedWith(new RegExp(`.*${errorMessageSubstring}.*`));
}
exports.verifyError = verifyError;
let toCleanup = [];
afterEach(() => {
    // shortcut to keep this fast
    if (toCleanup.length > 0) {
        const promises = toCleanup.map((callback) => callback());
        toCleanup = [];
        return Promise.all(promises);
    }
    return;
});
function afterTest(callback) {
    toCleanup.push(callback);
}
exports.afterTest = afterTest;
