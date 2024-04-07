"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const chai_1 = require("chai");
const path = require("path");
const fs = require("fs-extra");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
// our modules
const rex_1 = require("../lib/rex");
const util_1 = require("./util");
const refresh_1 = require("../lib/dbBuilder/refresh");
const package_manager_adapter_1 = require("./package-manager-adapter");
const test_helpers_2 = require("./test-helpers");
const errors_1 = require("../shared/errors");
const process_modules_1 = require("./process-modules");
// We could make a testing log to eliminate our dependency on the Rex Object (and it being set by the server startup code)
const { log, vars } = (0, rex_1._getRex)();
////////////////////////////////////////////////////////////////////////////////
/// Data - Do not change the values as the tests rely on them
////////////////////////////////////////////////////////////////////////////////
// Pkgs
const corePackage = {
    packageFolderName: 'corePackage',
    packageInfo: { name: 'corePkg', id: 'corePackageId', version: '1.1.1', type: 'software' },
    zipFileName: 'corePackage.zip'
};
const corePackage2 = {
    packageFolderName: 'corePackage2',
    packageInfo: { name: 'corePkg2', id: 'corePackage2Id', version: '2.1.1', type: 'software' },
    zipFileName: 'corePackage2.zip'
};
const module1 = {
    packageFolderName: 'module1',
    packageInfo: {
        name: 'module1',
        id: 'module1Id',
        version: '1.3.1',
        type: 'software',
        moduleOf: {
            packageId: corePackage.packageInfo.id,
            semver: corePackage.packageInfo.version
        }
    },
    zipFileName: 'module1Zip.zip',
    modulePrefix: 'modulePrefix1'
};
const module2 = {
    packageFolderName: 'module2',
    packageInfo: {
        name: 'module2',
        id: 'module2Id',
        version: '3.4.5',
        type: 'software',
        moduleOf: {
            packageId: corePackage.packageInfo.id,
            semver: corePackage.packageInfo.version
        }
    },
    zipFileName: 'module2Zip.zip',
    modulePrefix: 'modulePrefix2'
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[handoff] process Modules', function () {
    this.timeout(10000);
    it('Should handle a new core package with modules', async function () {
        const submittedItems = await generateSubmittedItems([corePackage, module1, module2]);
        const innerContetnt = [
            path.join(submittedItems[1].packageFolders[0], 'insideContent1.txt'),
            path.join(submittedItems[2].packageFolders[0], 'insideContent2.txt')
        ];
        await Promise.all(innerContetnt.map((item) => fs.ensureFile(item)));
        const { packageManagerAdapter, contentFolder, zipsFolder } = await preparePackageManagerAdapter();
        const processedSubmittedItems = await (0, process_modules_1.processModules)(submittedItems, packageManagerAdapter, contentFolder, zipsFolder, log);
        const { downloadFolder, extractFolder, uploadedEntry } = processedSubmittedItems[0];
        const expectedSubmittedItems = [
            {
                downloadFolder,
                extractFolder,
                uploadedEntry,
                packageFolders: [path.join(extractFolder, corePackage.packageFolderName)],
                nonPackageFolders: [],
                zips: [
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage.packageFolderName, plat, corePackage.zipFileName)),
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage.packageFolderName, 'modules', `${module1.packageInfo.id}__${module1.packageInfo.version}`, plat, module1.zipFileName)),
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage.packageFolderName, 'modules', `${module2.packageInfo.id}__${module2.packageInfo.version}`, plat, module2.zipFileName))
                ].sort(),
                handoffChecklistValid: false
            }
        ];
        (0, chai_1.expect)(processedSubmittedItems.map((item) => ({ ...item, zips: item.zips.sort() }))).to.deep.equal(expectedSubmittedItems);
        const innerCorePackageContent = await fs.readdir(path.join(extractFolder, corePackage.packageFolderName));
        innerContetnt.map((item) => (0, chai_1.expect)(innerCorePackageContent).contains(path.basename(item)));
    });
    it('Should handle a submission with both an independent package & a core package with modules', async function () {
        const submittedItems = await generateSubmittedItems([
            corePackage,
            corePackage2,
            module1,
            module2
        ]);
        const innerContetnt = [
            path.join(submittedItems[2].packageFolders[0], 'insideContent1.txt'),
            path.join(submittedItems[3].packageFolders[0], 'insideContent2.txt')
        ];
        await Promise.all(innerContetnt.map((item) => fs.ensureFile(item)));
        const { packageManagerAdapter, contentFolder, zipsFolder } = await preparePackageManagerAdapter();
        const processedSubmittedItems = await (0, process_modules_1.processModules)(submittedItems, packageManagerAdapter, contentFolder, zipsFolder, log);
        let expectedSubmittedItem1;
        {
            const { downloadFolder, extractFolder, uploadedEntry } = processedSubmittedItems[0];
            expectedSubmittedItem1 = {
                downloadFolder,
                extractFolder,
                uploadedEntry,
                packageFolders: [path.join(extractFolder, corePackage.packageFolderName)],
                nonPackageFolders: [],
                zips: [
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage.packageFolderName, plat, corePackage.zipFileName)),
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage.packageFolderName, 'modules', `${module1.packageInfo.id}__${module1.packageInfo.version}`, plat, module1.zipFileName)),
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage.packageFolderName, 'modules', `${module2.packageInfo.id}__${module2.packageInfo.version}`, plat, module2.zipFileName))
                ],
                handoffChecklistValid: false
            };
        }
        let expectedSubmittedItem2;
        {
            const { downloadFolder, extractFolder, uploadedEntry } = processedSubmittedItems[1];
            expectedSubmittedItem2 = {
                downloadFolder,
                extractFolder,
                uploadedEntry,
                packageFolders: [path.join(extractFolder, corePackage2.packageFolderName)],
                nonPackageFolders: [],
                zips: [
                    ...[util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((plat) => path.join(downloadFolder, corePackage2.packageFolderName, plat, corePackage2.zipFileName))
                ],
                handoffChecklistValid: false
            };
        }
        const expectedSubmittedItems = [
            expectedSubmittedItem1,
            expectedSubmittedItem2
        ];
        (0, chai_1.expect)(processedSubmittedItems).to.deep.equal(expectedSubmittedItems);
        const innerCorePackageContent = await fs.readdir(path.join(processedSubmittedItems[0].extractFolder, corePackage.packageFolderName));
        innerContetnt.map((item) => (0, chai_1.expect)(innerCorePackageContent).contains(path.basename(item)));
    });
    it.skip('Should support a submission with a module, not including the core package', async function () {
        // Include a module with the current core package so we test merging too
    });
    it('Should not allow submitting a module whose core package is not available', async function () {
        const submittedItems = await generateSubmittedItems([module1]);
        const { packageManagerAdapter, contentFolder, zipsFolder } = await preparePackageManagerAdapter();
        const promise = (0, process_modules_1.processModules)(submittedItems, packageManagerAdapter, contentFolder, zipsFolder, log);
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(errors_1.GracefulError);
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(new RegExp('corePackage for.*does not exist on the server.*'));
    });
    it.skip('Should handle a module replacement', async function () {
        // Solo submit a module
        // Put an item inside the module to replace that does not exist in the new version
    });
    it.skip('Should not allow installer modules', async function () { });
    it.skip('Should allow installer for corePacakge', async function () { });
    async function generateSubmittedItems(data) {
        return Promise.all(data.map(async ({ packageFolderName, packageInfo, zipFileName, uploadedEntry, modulePrefix }) => {
            const downloadFolder = (0, test_helpers_1.getUniqueFolderName)();
            const extractFolder = (0, test_helpers_1.getUniqueFolderName)();
            const packageFolders = [path.join(extractFolder, packageFolderName)];
            await (0, test_helpers_2.createPackages)({
                packages: packageFolders,
                packagesJson: [packageInfo],
                packageJsonPrefix: modulePrefix
            });
            const zips = [util_1.Platform.LINUX, util_1.Platform.WINDOWS].map((platform) => path.join(downloadFolder, packageFolderName, platform, zipFileName));
            await Promise.all(zips.map((zip) => fs.ensureFile(zip)));
            const submittedItem = {
                downloadFolder,
                extractFolder,
                packageFolders,
                nonPackageFolders: [],
                zips,
                uploadedEntry: uploadedEntry || {
                    email: 'placeholder',
                    submissionType: "zip" /* SubmissionType.ZIP */
                },
                handoffChecklistValid: false
            };
            return submittedItem;
        }));
    }
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
});
