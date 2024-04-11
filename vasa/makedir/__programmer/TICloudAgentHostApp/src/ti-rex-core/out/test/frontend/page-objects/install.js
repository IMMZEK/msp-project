'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Install = void 0;
// 3rd party
const protractor_1 = require("protractor");
const _ = require("lodash");
// our modules
const expect_1 = require("../../expect");
const util_1 = require("../../../frontend/component-helpers/util");
const versioning = require("../../../lib/versioning");
const util_2 = require("./util");
const open_close_helpers_1 = require("./open-close-helpers");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var Install;
(function (Install) {
    // Actions
    /**
     * Use version if it's local / remote, use range if it is unavailable
     *
     */
    async function togglePackageCheckbox(packageId, versionRange) {
        const item = await (0, util_2.getItemById)(await getPackageRowsCheckboxes(), util_1.TEST_ID.installSelectCheckbox(packageId, versionRange));
        await (0, util_2.clickElement)(item);
    }
    Install.togglePackageCheckbox = togglePackageCheckbox;
    async function next() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.installNextButton)));
    }
    Install.next = next;
    async function cancel() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.installCancelButton)));
        // TODO consider verifying modal closed
    }
    Install.cancel = cancel;
    async function openInstallPathsDropdown() {
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_1.TEST_ID.installLocationContextMenuButton)));
    }
    // Verify
    async function verifyInstallDialogOpen() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.installDialog);
    }
    Install.verifyInstallDialogOpen = verifyInstallDialogOpen;
    async function verifyInstallPathsDropdownOpen() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.installLocationContextMenuButton);
    }
    Install.verifyInstallPathsDropdownOpen = verifyInstallPathsDropdownOpen;
    async function verifyPackageRows(pkg, options, allPackages, unsupported) {
        const descriptions = await getPackageRowsDescriptionText();
        const checkboxes = await getPackageRowsCheckboxes();
        const locations = await getPackageRowsLocationText();
        (0, expect_1.expect)(descriptions.length).to.equal(pkg.dependencies.length + 1);
        (0, expect_1.expect)(checkboxes.length).to.equal(pkg.dependencies.length + 1);
        (0, expect_1.expect)(locations.length).to.equal(pkg.dependencies.length + 1);
        // Verify package
        {
            const onlinePkg = allPackages.find(item => item.packagePublicUid === pkg.packagePublicUid);
            const isLocal = !!(options.localPackages || []).find(item => item.packagePublicUid === pkg.packagePublicUid);
            await verifyPackageInner(onlinePkg || null, isLocal, 'Requested package', 0, !!unsupported && !!unsupported[pkg.packagePublicUid]);
        }
        // Verify dependencies
        await Promise.all(pkg.dependencies.map(async (dep, idx) => {
            const onlinePkg = allPackages.find(item => item.packagePublicId === dep.packagePublicId &&
                versioning.satisfies(item.packageVersion, dep.versionRange));
            const isLocal = !!(options.localPackages || []).find(item => item.packagePublicId === dep.packagePublicId &&
                versioning.satisfies(item.packageVersion, dep.versionRange));
            await verifyPackageInner(onlinePkg || null, isLocal, `${dep.dependencyType} dependency`, idx + 1, !!onlinePkg && !!unsupported && !!unsupported[onlinePkg.packagePublicUid]);
        }));
        async function verifyPackageInner(onlinePkg, isLocal, descriptionStartingText, idx, unsupported) {
            // Validate description
            const description = descriptions[idx];
            const expectedDesc = getDescription(descriptionStartingText, !onlinePkg, isLocal, unsupported);
            (0, expect_1.expect)(description).to.deep.equal(expectedDesc);
            // Validate checkbox
            const checkbox = checkboxes[idx];
            const checked = await checkbox.isSelected();
            (0, expect_1.expect)(checked).to.equal(!isLocal && !unsupported && !!onlinePkg);
            // Validate location
            const location = locations[idx];
            const localPackage = !!onlinePkg &&
                (options.localPackages || []).find(item => item.packagePublicUid === onlinePkg.packagePublicUid);
            const expectedLocation = !!localPackage && localPackage.localPackagePath;
            (0, expect_1.expect)(location).to.deep.equal(expectedLocation || '');
            // Ensure a location exists for a local package
            // Validating the location (above) isn't sufficient since the test can forget to
            // add localPackageAdditonalData for that package
            (0, expect_1.expect)(isLocal).to.equal(!!location);
        }
    }
    Install.verifyPackageRows = verifyPackageRows;
    async function verifyInstallPaths(options) {
        await openInstallPathsDropdown();
        await verifyInstallPathsDropdownOpen();
        const paths = await getInstallPaths();
        (0, expect_1.expect)(paths).to.deep.equal(options.installInfo);
    }
    Install.verifyInstallPaths = verifyInstallPaths;
    async function verifyInstallConfirmation() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.installConfirmationDialog);
    }
    Install.verifyInstallConfirmation = verifyInstallConfirmation;
    async function verifyNoInstallConfirmation() {
        await (0, open_close_helpers_1.waitUntilItemClosed)(util_1.TEST_ID.installConfirmationDialog);
    }
    Install.verifyNoInstallConfirmation = verifyNoInstallConfirmation;
    async function verifyNext() {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_1.TEST_ID.installNextButton);
    }
    Install.verifyNext = verifyNext;
    async function verifyNoNext() {
        await (0, open_close_helpers_1.waitUntilItemClosed)(util_1.TEST_ID.installNextButton);
    }
    Install.verifyNoNext = verifyNoNext;
    // Helpers
    async function getPackageRowsDescriptionText() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-install-description-text]')));
        return Promise.all(items.map(async (item) => {
            const text = await item.getText();
            return text;
        }));
    }
    async function getPackageRowsLocationText() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-install-location-text]')));
        return Promise.all(items.map(async (item) => {
            const text = await item.getText();
            return text;
        }));
    }
    async function getPackageRowsCheckboxes() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-install-select-checkbox]')));
        return items;
    }
    async function getInstallPaths() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-install-location-dropdown-elements-menu-item]')));
        return Promise.all(items.map(async (item) => {
            const text = await item.getText();
            return text;
        }));
    }
    function getDescription(startingText, notFound, isLocal, unSupported) {
        if (notFound) {
            return _.capitalize(`package unavailable (${startingText})`);
        }
        else if (isLocal) {
            return _.capitalize(`package already installed (${startingText})`);
        }
        else if (unSupported) {
            return _.capitalize(`package not supported on current platform (${startingText})`);
        }
        else {
            return _.capitalize(startingText);
        }
    }
})(Install || (exports.Install = Install = {}));
