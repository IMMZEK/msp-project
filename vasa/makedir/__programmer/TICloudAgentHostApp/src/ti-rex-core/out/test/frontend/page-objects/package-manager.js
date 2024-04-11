'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageManager = void 0;
const protractor_1 = require("protractor");
const expect_1 = require("../../expect");
const util_1 = require("./util");
const open_close_helpers_1 = require("./open-close-helpers");
const util_2 = require("../../../frontend/component-helpers/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var PackageManager;
(function (PackageManager) {
    // Actions
    async function toggleAll() {
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.packageManagerShowInTreeAllCheckbox)));
    }
    PackageManager.toggleAll = toggleAll;
    async function toggleVersionCheckbox(packageUid, isLatest) {
        const item = await (0, util_1.getItemById)(await getVersionRowsCheckboxes(), util_2.TEST_ID.packageManagerShowInTreeCheckbox(packageUid, isLatest));
        await (0, util_1.clickElement)(item);
    }
    PackageManager.toggleVersionCheckbox = toggleVersionCheckbox;
    async function openActionsMenu(packageUid) {
        await (0, open_close_helpers_1.openItem)(util_2.TEST_ID.packageManagerActionsMenuButton(packageUid), util_2.TEST_ID.packageManagerActionsMenu);
    }
    PackageManager.openActionsMenu = openActionsMenu;
    async function closeActionsMenu(packageUid) {
        await (0, open_close_helpers_1.closeItem)(util_2.TEST_ID.packageManagerActionsMenuButton(packageUid), util_2.TEST_ID.packageManagerActionsMenu);
    }
    PackageManager.closeActionsMenu = closeActionsMenu;
    async function apply() {
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.packageManagerApplyButton)));
    }
    PackageManager.apply = apply;
    async function cancel() {
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.packageManagerCancelButton)));
    }
    PackageManager.cancel = cancel;
    async function openDetailedView(packageId) {
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.packageManagerMoreInfoButton(packageId))));
    }
    PackageManager.openDetailedView = openDetailedView;
    async function openSummaryView() {
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.packageManagerSummaryButton)));
    }
    PackageManager.openSummaryView = openSummaryView;
    // Verify
    async function verifyPackageSummaryRows(expectedPackages) {
        const packageNames = await getPackageNamesText();
        (0, expect_1.expect)(packageNames.length).to.equal(expectedPackages.length);
        await Promise.all(expectedPackages.map(async (expected, idx) => {
            const pkgName = packageNames[idx];
            (0, expect_1.expect)(pkgName).to.deep.equal(expected.expectedPkg.name);
        }));
    }
    PackageManager.verifyPackageSummaryRows = verifyPackageSummaryRows;
    async function verifyPackageDetailedRows(expectedPackages) {
        const packageNames = await getPackageNamesText();
        (0, expect_1.expect)(packageNames.length).to.equal(expectedPackages.length);
        const versions = await getVersionRowsText();
        (0, expect_1.expect)(versions.length).to.equal(expectedPackages.length);
        const checkboxes = await getVersionRowsCheckboxes();
        let checkboxesState = await Promise.all(checkboxes.map(async (item) => {
            const isSelected = await item.isSelected();
            return isSelected;
        }));
        {
            (0, expect_1.expect)(checkboxesState.length).to.equal(expectedPackages.filter(item => item.hasCheckbox).length);
            let i = 0;
            checkboxesState = expectedPackages.map(item => {
                return item.hasCheckbox && checkboxesState[i++];
            });
        }
        await Promise.all(expectedPackages.map(async (expected, idx) => {
            const version = versions[idx];
            const checkboxState = checkboxesState[idx];
            if (expected.isLatest != null) {
                if (expected.isLatest) {
                    (0, expect_1.expect)(version).to.contain('Latest');
                }
                else {
                    (0, expect_1.expect)(version).to.not.contain('Latest');
                }
            }
            (0, expect_1.expect)(checkboxState).to.equal(expected.isSelected);
            (0, expect_1.expect)(version).to.contain(expected.expectedPkg.packageVersion);
        }));
    }
    PackageManager.verifyPackageDetailedRows = verifyPackageDetailedRows;
    async function verifySelectAll(checked) {
        const checkbox = (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.packageManagerShowInTreeAllCheckbox));
        const isSelected = await checkbox.isSelected();
        (0, expect_1.expect)(isSelected).to.equal(checked);
    }
    PackageManager.verifySelectAll = verifySelectAll;
    async function verifyApply(expectedUrlQuery, apis) {
        await (0, util_1.verifyUrl)({ apis, urlQuery: expectedUrlQuery });
    }
    PackageManager.verifyApply = verifyApply;
    async function verifyCancel(expectedUrlQuery, apis) {
        await (0, util_1.verifyUrl)({ apis, urlQuery: expectedUrlQuery });
    }
    PackageManager.verifyCancel = verifyCancel;
    // Helpers
    async function getPackageNamesText() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-package-manager-name-text]')));
        return Promise.all(items.map(async (item) => {
            const text = await item.getText();
            return text;
        }));
    }
    async function getVersionRowsText() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-package-manager-version-text]')));
        return Promise.all(items.map(async (item) => {
            const text = await item.getText();
            return text;
        }));
    }
    async function getVersionRowsCheckboxes() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-package-manager-show-in-tree-checkbox]')));
        return items;
    }
})(PackageManager || (exports.PackageManager = PackageManager = {}));
