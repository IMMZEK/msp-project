'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
// 3rd party
const protractor_1 = require("protractor");
// our modules
const util_1 = require("../../../frontend/component-helpers/util");
const util_2 = require("./util");
const install_1 = require("./install");
const open_close_helpers_1 = require("./open-close-helpers");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var Import;
(function (Import) {
    // Actions
    async function selectTargetRadio(targetId) {
        const item = await (0, util_2.getItemById)(await getSelectTargetRadio(), util_1.TEST_ID.importSelectTargetRadio(targetId));
        await (0, util_2.clickElement)(item);
    }
    Import.selectTargetRadio = selectTargetRadio;
    async function apply() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.importSelectTargetApply)));
    }
    Import.apply = apply;
    async function cancel() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.importSelectTargetCancel)));
        // TODO consider verifying modal closed
    }
    Import.cancel = cancel;
    async function install() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.installButton)));
        await install_1.Install.next();
        await install_1.Install.verifyInstallConfirmation();
        await install_1.Install.next();
    }
    Import.install = install;
    async function cancelInstall() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.importInstallMissingCancelButton)));
        await verifyNoPackageMissingDialog();
    }
    Import.cancelInstall = cancelInstall;
    async function clickImport() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.importConfrimImportImportButton)));
    }
    Import.clickImport = clickImport;
    async function cancelImport() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.importConfirmImportCancelButton)));
        await verifyNoImportConfirmationDialog();
    }
    Import.cancelImport = cancelImport;
    // Verify
    async function verifySelectTargetDialog() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.importSelectTargetDialog);
    }
    Import.verifySelectTargetDialog = verifySelectTargetDialog;
    async function verifyPackageMissingDialog() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.importInstallMissingDialog);
    }
    Import.verifyPackageMissingDialog = verifyPackageMissingDialog;
    async function verifyImportConfirmationDialog() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.importConfirmImportDialog);
    }
    Import.verifyImportConfirmationDialog = verifyImportConfirmationDialog;
    async function verifyNoPackageMissingDialog() {
        await (0, open_close_helpers_1.waitUntilItemClosed)(util_1.TEST_ID.importInstallMissingDialog);
    }
    async function verifyNoImportConfirmationDialog() {
        await (0, open_close_helpers_1.waitUntilItemClosed)(util_1.TEST_ID.importConfirmImportDialog);
    }
    // Helpers
    async function getSelectTargetRadio() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-import-select-target-radio]')));
        return items;
    }
})(Import || (exports.Import = Import = {}));
