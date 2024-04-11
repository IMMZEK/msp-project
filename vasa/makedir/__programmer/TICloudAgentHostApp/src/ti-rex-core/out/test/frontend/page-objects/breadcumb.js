'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breadcrumb = void 0;
// 3rd party
const protractor_1 = require("protractor");
// our modules
const expect_1 = require("../../expect");
const util_1 = require("./util");
const util_2 = require("../../../frontend/component-helpers/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var Breadcrumb;
(function (Breadcrumb) {
    // Actions
    async function clickBreadcrumbItem(item) {
        await (0, util_1.waitForPromisesAfterActionToResolve)(async () => {
            const element = await (0, util_1.getItemById)(await getBreadcrumbNodes(), util_2.TEST_ID.breadcrumbNode(item.nodeDbId));
            await (0, util_1.clickElement)(element);
        });
    }
    Breadcrumb.clickBreadcrumbItem = clickBreadcrumbItem;
    // Verify
    async function verifyBreadcrumb(path, _selectedItem) {
        const items = await getBreadcrumbNodes();
        const itemIds = await Promise.all(items.map(async (item) => {
            const id = await item.getAttribute('id');
            return id;
        }));
        (0, expect_1.expect)(itemIds).to.deep.equal(path.map(node => util_2.TEST_ID.breadcrumbNode(node.nodeDbId)));
    }
    Breadcrumb.verifyBreadcrumb = verifyBreadcrumb;
    // Helpers
    async function getBreadcrumbNodes() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-breadcrumb-node]')));
        return items;
    }
})(Breadcrumb || (exports.Breadcrumb = Breadcrumb = {}));
