"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const chai_1 = require("chai");
const path = require("path");
const fs = require("fs-extra");
// tslint:disable-next-line:no-submodule-imports
const uuid = require("uuid/v4");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
// our modules
const rex_1 = require("../lib/rex");
const test_helpers_2 = require("./test-helpers");
const package_manager_adapter_1 = require("./package-manager-adapter");
const prepare_handoff_1 = require("./prepare-handoff");
const util_1 = require("../test/util");
const util_2 = require("./util");
const refresh_1 = require("../lib/dbBuilder/refresh");
// Once we have a reusable setupTirex function use that instead of relying on these being set by the server at startup
const { log, vars } = (0, rex_1._getRex)();
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
////////////////////////////////////////////////////////////////////////////////
/// Data - Do not change the values as the tests rely on them
////////////////////////////////////////////////////////////////////////////////
// Note: package-manager-adapter & prepate-handoff share a common set of zips
const asset = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/Sitara_1_02_00_00__all.zip`;
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[handoff] PackageManagerAdapter', function () {
    this.timeout(10000);
    before(async function () {
        await fs.copy(path.join(scriptsUtil.mochaServerDataFolder, 'zips', 'package-manager-adapter-tests'), path.join(vars.zipsFolder, 'package-manager-adapter-tests'));
    });
    describe('stageAddPackage', function () {
        it('Should stage a valid package', async function () {
            const { packageManagerAdapter, packageFolders, zips, downloadFolder, extractFolder, submissionId, email, contentFolder, zipsFolder } = await setupSubmission({ [util_2.Platform.ALL]: asset }, {});
            const entry = await packageManagerAdapter.stageAddPackage({
                packageFolders,
                zips,
                downloadFolder,
                extractFolder,
                submissionId,
                email,
                log,
                showEntry: true
            });
            (0, chai_1.expect)(entry).to.deep.equal({
                ...entry,
                state: "staged" /* PackageEntryState.STAGED */,
                submissionId
            });
            await (0, test_helpers_2.verifyContentAndZipsPresent)({
                contentFolder,
                zipsFolder,
                zips: entry.zips,
                content: entry.content
            });
        });
        it('Should handle an attempt to stage package folders which already exist in the content folder (fail)', async function () {
            const { packageManagerAdapter, packageFolders, zips, downloadFolder, extractFolder, submissionId, email, contentFolder } = await setupSubmission({ [util_2.Platform.ALL]: asset }, {});
            await fs.ensureDir(path.join(contentFolder, 'Sitara_1_02_00_00'));
            await (0, util_1.verifyError)(packageManagerAdapter.stageAddPackage({
                packageFolders,
                zips,
                downloadFolder,
                extractFolder,
                submissionId,
                email,
                log,
                showEntry: true
            }), 'already exist');
        });
    });
});
///////////////////////////////////////////////////////////////////////////////
/// Test Helpers
///////////////////////////////////////////////////////////////////////////////
async function preparePackageManagerAdapter() {
    const packageManagerFile = path.join(scriptsUtil.generatedDataFolder, (0, test_helpers_1.getUniqueFileName)());
    const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
    const zipsFolder = (0, test_helpers_1.getUniqueFolderName)();
    const overridesDir = (0, test_helpers_1.getUniqueFolderName)();
    await fs.writeJson(packageManagerFile, { packages: [] });
    const refreshManager = new refresh_1.RefreshManager(vars.dbBasePath, log.userLogger);
    const packageManagerAdapter = new package_manager_adapter_1.PackageManagerAdapter({
        refreshManager,
        packageManagerFile,
        contentFolder,
        zipsFolder,
        overridesDir
    });
    return { packageManagerAdapter, contentFolder, zipsFolder, overridesDir };
}
async function setupSubmission(assetLinks, assetUploads) {
    const submissionId = uuid();
    const email = '';
    const handoffChecklist = {};
    const { packageManagerAdapter, contentFolder, zipsFolder } = await preparePackageManagerAdapter();
    const localAssets = {};
    Object.entries(assetUploads).map(([platform, upload]) => {
        localAssets[platform] = path.join('some', 'random', 'path', upload.originalname);
    });
    const { packageFolders, zips, downloadFolder, extractFolder } = await (0, prepare_handoff_1.prepareHandoff)({
        contentFolder,
        assetUploads: Object.values(assetUploads),
        uploadedEntry: {
            email: '',
            localAssets,
            handoffChecklist,
            assets: assetLinks,
            submissionType: "zip" /* SubmissionType.ZIP */
        },
        log,
        submissionType: "zip" /* SubmissionType.ZIP */
    });
    return {
        packageManagerAdapter,
        contentFolder,
        zipsFolder,
        packageFolders,
        zips,
        downloadFolder,
        extractFolder,
        email,
        handoffChecklist,
        submissionId
    };
}
