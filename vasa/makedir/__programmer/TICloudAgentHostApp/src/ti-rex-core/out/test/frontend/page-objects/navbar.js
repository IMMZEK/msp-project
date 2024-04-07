'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Navbar = void 0;
// our modules
const util_1 = require("../../../frontend/component-helpers/util");
const open_close_helpers_1 = require("./open-close-helpers");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
var Navbar;
(function (Navbar) {
    // Actions
    async function openMenu() {
        await (0, open_close_helpers_1.openItem)(util_1.TEST_ID.navbarMenuButton, util_1.TEST_ID.navbarMenu);
    }
    Navbar.openMenu = openMenu;
    async function closeMenu() {
        await (0, open_close_helpers_1.closeItem)(util_1.TEST_ID.navbarMenuButton, util_1.TEST_ID.navbarMenu);
    }
    Navbar.closeMenu = closeMenu;
})(Navbar || (exports.Navbar = Navbar = {}));
