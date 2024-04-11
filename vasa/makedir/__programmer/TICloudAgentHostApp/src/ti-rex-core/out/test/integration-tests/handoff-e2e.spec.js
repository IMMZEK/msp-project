"use strict";
// 3rd party
// import { promisify } from 'util';
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
// our modules
// import { API } from '../../shared/routes/apis';
// import { GracefulError } from '../../shared/errors';
// import { chai, expect } from '../../test/expect';
// import * as helpersNode from '../../shared/helpers-node';
// import { _getRex } from '../../lib/rex';
// import { assertNever } from '../../shared/util';
// import { PackageEntry, PackageEntryState, ignoreError } from '../../handoff/util';
// Once we have a reusable setupTirex function use that instead of relying on these being set by the server at startup
// const { handoffManager, refreshManager, vars } = _getRex();
// const sendEmail = promisify(helpersNode.sendEmail);
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
describe.skip('Handoff end-to-end', function () {
    describe('Initial content setup', function () {
        it('should scan, refresh & import packages in the content folder', function () {
            // verification steps:
            // 1. tirex3 and tirex4 have no content
            // 2. npm run db-refresh-all
            // 3. npm run db-import -- --skipContent
            // 4. npm run db-import -- --switchTablePrefix
            // 5. cp -r db-staged db
            // 6. dcontrol start tirex4  tirex3
            // 7. verify at least one node in each added package exists in tirex3 and tirex4
        });
    });
    describe('Add new packages to existing ones', function () {
        it('should successfully add a software package');
        it('should successfully add a supplemental package');
        it('should successfully add a hardware package');
        // pre-import some packages, then add packages
        // verify at least one node in each added package exists in tirex3 and tirex4
    });
    describe('Replace packages', function () {
        it('should successfully replace a software package');
        it('should successfully replace a supplemental package');
        it('should successfully replace a hardware package');
        // pre-import some packages, then replace packages
        // verify at least one significant node in each added package in both tirex3 and tirex4
    });
    describe('Delete packages', function () {
        it('should successfully delete a software package');
        it('should successfully delete a supplemental package');
        it('should successfully delete a hardware package');
        // pre-import some packages, then delete packages
        // verify at least one significant node in each added package in both tirex3 and tirex4 no longer exists
    });
    describe('Error Handling', function () {
        it('should not allow replace of non-existing package');
        // handle gracefully, don't go into maintenance mode
        it('should handle incorrect zip file extensions');
        it('should handle refresh error in package');
        it('should handle critical-level refresh error and abortion of package');
        it('should handle emergency-level refresh error and abortion of entire refresh');
        it('should handle error during DB import'); // what error?
    });
    describe('Other', function () {
        it('should be able to exclude packages from refresh');
    });
});
