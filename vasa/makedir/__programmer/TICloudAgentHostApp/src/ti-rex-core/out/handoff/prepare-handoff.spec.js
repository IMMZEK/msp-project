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
const vars_1 = require("../lib/vars");
const path_helpers_1 = require("../shared/path-helpers");
const util_1 = require("./util");
const prepare_handoff_1 = require("./prepare-handoff");
const util_2 = require("../test/util");
const refresh_1 = require("../lib/dbBuilder/refresh");
const package_manager_adapter_1 = require("./package-manager-adapter");
const test_helpers_2 = require("./test-helpers");
const errors_1 = require("../shared/errors");
// We could make a testing log to eliminate our dependency on the RexObject (and it being set by the server startup code)
const { log } = (0, rex_1._getRex)();
// Helpers
////////////////////////////////////////////////////////////////////////////////
/// Data - Do not change the values as the tests rely on them
////////////////////////////////////////////////////////////////////////////////
// Note: package-manager-adapter & prepate-handoff share a common set of zips
// Zips
const zip = path.join(vars_1.Vars.ZIPS_FOLDER, 'package-manager-adapter-tests', 'Sitara_1_02_00_00__all.zip');
// Assets
const asset = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/Sitara_1_02_00_00__all.zip`;
const asset2 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/coresdk_msp432_3_01_00_11_eng__all.zip`;
const asset3 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/package_no_base__all.zip`;
const asset4 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/coresdk_msp432_3_01_00_11_eng__linux.zip`;
const asset5 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/coresdk_msp432_3_01_00_11_eng__win.zip`;
const asset6 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/submission_no_package__all.zip`;
const asset7 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/cc13xx_devices_1_10_00_02__all.zip`;
const asset8 = `${scriptsUtil.mochaServer}zips/package-manager-adapter-tests/multiple_package_submission.zip`;
// Installer files
const installerFile1 = 'softwarePackage_linux64.run';
const installerFile3 = 'nonTirexPackage_linux64.run';
const installerFile4 = 'installer4_linux64.run';
const installerFile5 = 'installer5_linux64.run';
const installerFile6 = 'nonSoftwarePackage_linux64.run';
const installerFile7 = 'installer7_linux64.run';
// Installers
const getInstallerPath = (file) => `${scriptsUtil.mochaServer}zips/prepare-handoff-tests/${file}`;
const installer1 = getInstallerPath(installerFile1);
const installer3 = getInstallerPath(installerFile3);
const installer4 = getInstallerPath(installerFile4);
const installer5 = getInstallerPath(installerFile5);
const installer6 = getInstallerPath(installerFile6);
const installer7 = getInstallerPath(installerFile7);
// Installer content (after processing)
const installerContent1 = ['coresdk_msp432_3_01_00_11_eng'];
// const installerContent3 = ['non_tirex_package'];
const installerContent4 = ['coresdk_msp432_3_01_00_11_eng', 'Sitara_1_02_00_00'];
const installerContent5 = ['coresdk_msp432_3_01_00_11_eng', 'non_tirex_package'];
const installerContent6 = [path.join('tirex-product-tree', 'cc13xx_devices')];
const installerContent7 = [path.join('subfolder', 'Sitara_1_02_00_00')];
// Install commands
const getInstallCommand = (file) => `./${file} --prefix @install-location --mode unattended`;
const installCommand1 = {
    [util_1.Platform.LINUX]: getInstallCommand(installerFile1)
};
const installCommand3 = {
    [util_1.Platform.LINUX]: getInstallCommand(installerFile3)
};
const installCommand4 = {
    [util_1.Platform.LINUX]: getInstallCommand(installerFile4)
};
const installCommand5 = {
    [util_1.Platform.LINUX]: getInstallCommand(installerFile5)
};
const installCommand6 = {
    [util_1.Platform.LINUX]: getInstallCommand(installerFile6)
};
const installCommand7 = {
    [util_1.Platform.LINUX]: getInstallCommand(installerFile7)
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[handoff] prepareHandoff - zips', function () {
    this.timeout(10000);
    before(async function () {
        await fs.copy(path.join(scriptsUtil.mochaServerDataFolder, 'zips', 'package-manager-adapter-tests'), path.join(vars_1.Vars.ZIPS_FOLDER, 'package-manager-adapter-tests'));
    });
    it('Should handle an upload', async function () {
        // Setup the zip upload
        const zipFolder = path.join(scriptsUtil.generatedDataFolder, 'zips1');
        await fs.ensureDir(zipFolder);
        await fs.copy(zip, path.join(zipFolder, path.basename(zip)));
        // Make the call and validate
        const { downloadFolder, extractFolder } = await prepareHandoffWrapper({
            assetLinks: {},
            assetUploads: {
                [util_1.Platform.ALL]: {
                    path: path.join(zipFolder, path.basename(zip)),
                    originalname: path.basename(zip)
                }
            }
        });
        await checkSubmissionSuccessful({
            downloadFolder,
            extractFolder,
            expectedPackageFolders: ['Sitara_1_02_00_00'],
            expectedZips: [
                path.join('Sitara_1_02_00_00', util_1.Platform.ALL, 'Sitara_1_02_00_00__all.zip')
            ]
        });
    });
    it('Should handle download links', async function () {
        const { downloadFolder, extractFolder } = await prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.ALL]: asset },
            assetUploads: {}
        });
        await checkSubmissionSuccessful({
            downloadFolder,
            extractFolder,
            expectedPackageFolders: ['Sitara_1_02_00_00'],
            expectedZips: [
                path.join('Sitara_1_02_00_00', util_1.Platform.ALL, 'Sitara_1_02_00_00__all.zip')
            ]
        });
    });
    it('Should handle a submission with only a linux zip (no all zip)', async function () {
        const { downloadFolder, extractFolder } = await prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.LINUX]: asset4 },
            assetUploads: {}
        });
        await checkSubmissionSuccessful({
            downloadFolder,
            extractFolder,
            expectedPackageFolders: ['coresdk_msp432_3_01_00_11_eng'],
            expectedZips: [
                path.join('coresdk_msp432_3_01_00_11_eng', util_1.Platform.LINUX, 'coresdk_msp432_3_01_00_11_eng__linux.zip')
            ]
        });
    });
    it('Should setup the package subfolder for non-software packages', async function () {
        const { downloadFolder, extractFolder } = await prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.ALL]: asset7 },
            assetUploads: {}
        });
        await checkSubmissionSuccessful({
            downloadFolder,
            extractFolder,
            expectedPackageFolders: [path.join('tirex-product-tree', 'cc13xx_devices')],
            expectedZips: [
                path.join('tirex-product-tree', 'cc13xx_devices', util_1.Platform.ALL, 'cc13xx_devices_1_10_00_02__all.zip')
            ]
        });
    });
    it('Should handle a mix of platform dependent and all zips (fail)', async function () {
        await (0, util_2.verifyError)(prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.WINDOWS]: asset5, [util_1.Platform.ALL]: asset2 },
            assetUploads: {}
        }), 'Mix of all & platform specify assets in handoff');
    });
    it('Should handle a submission with no linux or all zip (fail)', async function () {
        await (0, util_2.verifyError)(prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.WINDOWS]: asset5 },
            assetUploads: {}
        }), 'No linux or all asset in handoff');
    });
    it('Should handle a submission with no zips (fail)', async function () {
        await (0, util_2.verifyError)(prepareHandoffWrapper({
            assetLinks: {},
            assetUploads: {}
        }), 'No linux or all asset in handoff');
    });
    it('Should handle a submission with no packages (fail)', async function () {
        await (0, util_2.verifyError)(prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.ALL]: asset6 },
            assetUploads: {}
        }), 'Nothing to handoff');
    });
    it('Should handle a submission with multiple packages (fail)', async function () {
        this.timeout(120000);
        await (0, util_2.verifyError)(prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.ALL]: asset8 },
            assetUploads: {}
        }), 'Multiple packages');
    });
    it('Should handle a submission with no base folder (fail)', async function () {
        await (0, util_2.verifyError)(prepareHandoffWrapper({
            assetLinks: { [util_1.Platform.ALL]: asset3 },
            assetUploads: {}
        }), 'No subfolder');
    });
    it.skip('TODO Should verify no package folders have the same name as the extract folder', async function () { });
    async function prepareHandoffWrapper({ assetLinks, assetUploads }) {
        const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
        const localAssets = {};
        Object.entries(assetUploads).map(([platform, upload]) => {
            localAssets[platform] = path.join('some', 'random', 'path', upload.originalname);
        });
        const { downloadFolder, extractFolder } = await (0, prepare_handoff_1.prepareHandoff)({
            contentFolder,
            assetUploads: Object.values(assetUploads),
            log,
            uploadedEntry: {
                email: '',
                localAssets,
                assets: assetLinks,
                submissionType: "zip" /* SubmissionType.ZIP */
            },
            submissionType: "zip" /* SubmissionType.ZIP */
        });
        return { downloadFolder, extractFolder };
    }
    async function checkSubmissionSuccessful({ downloadFolder, extractFolder, expectedPackageFolders, expectedZips }) {
        await (0, test_helpers_2.verifyContentAndZipsPresent)({
            contentFolder: extractFolder,
            zipsFolder: downloadFolder,
            content: expectedPackageFolders,
            zips: expectedZips
        });
    }
});
describe('[handoff] prepareHandoff - installers', function () {
    this.timeout(30000);
    before(async function () {
        await fs.copy(path.join(scriptsUtil.mochaServerDataFolder, 'zips', 'prepare-handoff-tests'), path.join(vars_1.Vars.ZIPS_FOLDER, 'prepare-handoff-tests'));
    });
    let contentFolder;
    let zipsFolder;
    let packageManagerAdapter;
    beforeEach(async function () {
        ({ contentFolder, zipsFolder, packageManagerAdapter } = await setup());
    });
    it('Should handle an installer', async function () {
        // Installer with a single folder inside which matches the submitted package
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: installCommand1,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent1,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent1[0], util_1.Platform.LINUX, installerFile1)]
        });
    });
    it('Should handle no linux install command (error)', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const promise = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: {
                [util_1.Platform.WINDOWS]: `./softwarePackage_linux64.run --prefix @install-location --mode unattended`
            },
            submittedPackage,
            packageManagerAdapter
        });
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith('Linux install command missing');
    });
    it('Should handle an installer with an invalid install command', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const promise = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: {
                [util_1.Platform.LINUX]: `./softwarePackage_linux64.run --prefix @install --mode unattended`
            },
            submittedPackage,
            packageManagerAdapter
        });
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(new RegExp('Missing @install-location.*'));
    });
    it('Should handle an installer command failing', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const promise = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: {
                [util_1.Platform.LINUX]: `./badgers.run --prefix @install-location --mode unattended`
            },
            submittedPackage,
            packageManagerAdapter
        });
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(new RegExp('Install exited with code.*'));
    });
    it('Should handle an installer with a non-software package', async function () {
        const submittedPackage = { id: 'cc13x0_devices', version: '1.10.00.02' };
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer6,
            installCommand: installCommand6,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent6,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent6[0], util_1.Platform.LINUX, installerFile6)]
        });
    });
    it('Should handle submitted package not in installer', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '1.2.3' };
        const promise = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: installCommand1,
            submittedPackage,
            packageManagerAdapter
        });
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(errors_1.GracefulError);
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(new RegExp('Submitted package not in installer.*'));
    });
    it('Should handle an installer with no package folders inside', async function () {
        const submittedPackage = { id: 'cc13x0_devices', version: '1.10.00.02' };
        const promise = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer3,
            installCommand: installCommand3,
            submittedPackage,
            packageManagerAdapter
        });
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(errors_1.GracefulError);
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith(new RegExp('Submitted package not in installer.*'));
    });
    it('Should handle an installer with a secondary package folder', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer4,
            installCommand: installCommand4,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent4,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent4[0], util_1.Platform.LINUX, installerFile4)]
        });
    });
    it('Should handle an installer with a secondary non tirex package folder', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer5,
            installCommand: installCommand5,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: [installerContent5[0]],
            expectedNonPackageFolders: [installerContent5[1]],
            expectedZips: [path.join(installerContent5[0], util_1.Platform.LINUX, installerFile5)]
        });
    });
    it('Should handle an installer with the install command not in sync between package.tirex.json and handoff.json (fail)', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const promise = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: {
                [util_1.Platform.LINUX]: `./softwarePackage_linux64.run --prefix @install-location --mode unattended`
            },
            submittedPackage,
            packageManagerAdapter,
            checkInstallerInSync: true
        });
        await (0, chai_1.expect)(promise).to.eventually.be.rejectedWith('Install command not in sync');
    });
    // These 3 tests are repeated against a secondary tirex package and secondary non tirex package
    it('Should handle the submitted package existing in the content folder but not in the package manager file', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        await (0, test_helpers_2.createPackages)({
            packages: [path.join(contentFolder, installerContent1[0])],
            packagesJson: [{ ...submittedPackage, type: 'software', name: submittedPackage.id }]
        });
        // This will create an error later, but not in prepareHandoff
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: installCommand1,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent1,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent1[0], util_1.Platform.LINUX, installerFile1)]
        });
    });
    it('Should handle the submitted package existing in the content folder + package manager file', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const packageContent = path.join(contentFolder, installerContent1[0]);
        await (0, test_helpers_2.createPackages)({
            packages: [packageContent],
            packagesJson: [{ ...submittedPackage, type: 'software', name: submittedPackage.id }]
        });
        const entry = {
            ...submittedPackage,
            content: [installerContent1[0]],
            zips: [],
            submissionId: '',
            email: '',
            showEntry: true,
            state: "valid" /* PackageEntryState.VALID */
        };
        await packageManagerAdapter.addPackage({
            entry,
            log
        });
        // This will create an error later, but not in prepareHandoff
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: installCommand1,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent1,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent1[0], util_1.Platform.LINUX, installerFile1)]
        });
    });
    it('Should handle the submitted package already existing in the content folder as a non tirex package', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const packageContent = path.join(contentFolder, installerContent1[0]);
        await fs.ensureDir(packageContent);
        // This will create an error later, but not in prepareHandoff
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer1,
            installCommand: installCommand1,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent1,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent1[0], util_1.Platform.LINUX, installerFile1)]
        });
    });
    // Same 3 tests but against a secondary tirex package
    it('Should handle a secondary tirex package existing in the content folder but not in the package manager file', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const secondaryPackage = { id: 'sitara', version: '1.2.0' };
        await (0, test_helpers_2.createPackages)({
            packages: [path.join(contentFolder, installerContent4[1])],
            packagesJson: [{ ...secondaryPackage, type: 'software', name: submittedPackage.id }]
        });
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer4,
            installCommand: installCommand4,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent4,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent4[0], util_1.Platform.LINUX, installerFile4)]
        });
    });
    it('Should handle a secondary tirex package existing in the content folder +  package manager file', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const secondaryPackage = { id: 'sitara', version: '1.2.0' };
        const packageContent = path.join(contentFolder, installerContent4[1]);
        await (0, test_helpers_2.createPackages)({
            packages: [packageContent],
            packagesJson: [{ ...secondaryPackage, type: 'software', name: secondaryPackage.id }]
        });
        const entry = {
            ...secondaryPackage,
            content: [installerContent4[1]],
            zips: [],
            submissionId: '',
            email: '',
            showEntry: true,
            state: "valid" /* PackageEntryState.VALID */
        };
        await packageManagerAdapter.addPackage({
            entry,
            log
        });
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer4,
            installCommand: installCommand4,
            submittedPackage,
            packageManagerAdapter
        });
        // Should not be included in the list of packageFolders
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: [installerContent4[0]],
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent4[0], util_1.Platform.LINUX, installerFile4)]
        });
    });
    it('Should handle a secondary tirex package existing in the content folder as a non tirex package', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const packageContent = path.join(contentFolder, installerContent4[1]);
        await (0, test_helpers_2.createPackages)({
            packages: [packageContent]
        });
        // empty dir to remove metadata (so it becomes a non-tirex package);
        await fs.emptyDir(packageContent);
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer4,
            installCommand: installCommand4,
            submittedPackage,
            packageManagerAdapter
        });
        // This will create an error later, but not in prepareHandoff
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent4,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent4[0], util_1.Platform.LINUX, installerFile4)]
        });
    });
    // Same 3 tests as above but as a secondary non tirex package
    it('Should handle a secondary non tirex package existing in the content folder but not in the package manager file', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const packageContent = path.join(contentFolder, installerContent5[1]);
        await (0, test_helpers_2.createPackages)({ packages: [packageContent] });
        // empty dir to remove metadata (so it becomes a non-tirex package);
        await fs.emptyDir(packageContent);
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer5,
            installCommand: installCommand5,
            submittedPackage,
            packageManagerAdapter
        });
        // This will create an error later, but not in prepareHandoff
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: [installerContent5[0]],
            expectedNonPackageFolders: [installerContent5[1]],
            expectedZips: [path.join(installerContent5[0], util_1.Platform.LINUX, installerFile5)]
        });
    });
    it('Should handle a secondary non tirex package existing in the content folder + package manager file', async function () {
        const submittedPackage = { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' };
        const packageContent = path.join(contentFolder, installerContent5[1]);
        await (0, test_helpers_2.createPackages)({ packages: [packageContent] });
        // empty dir to remove metadata (so it becomes a non-tirex package);
        await fs.emptyDir(packageContent);
        const entry = {
            ...submittedPackage,
            content: [installerContent5[1]],
            zips: [],
            submissionId: '',
            email: '',
            showEntry: true,
            state: "valid" /* PackageEntryState.VALID */
        };
        await packageManagerAdapter.addPackage({
            entry,
            log
        });
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer5,
            installCommand: installCommand5,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: [installerContent5[0]],
            expectedNonPackageFolders: [installerContent5[1]],
            expectedZips: [path.join(installerContent5[0], util_1.Platform.LINUX, installerFile5)]
        });
    });
    it.skip('Should handle an installer timeout', async function () { });
    it('Should handle an installer with a subfolder', async function () {
        // Note the installer has a subfolder with a tirex package plus an extra sibling folder
        const submittedPackage = { id: 'sitara', version: '1.2.0' };
        const result = prepareHandoffWrapper({
            contentFolder,
            zipsFolder,
            installer: installer7,
            installCommand: installCommand7,
            submittedPackage,
            packageManagerAdapter
        });
        await verifyPrepareHandoff(result, {
            expectedPackageFolders: installerContent7,
            expectedNonPackageFolders: [],
            expectedZips: [path.join(installerContent7[0], util_1.Platform.LINUX, installerFile7)]
        });
    });
    async function setup() {
        const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
        const zipsFolder = (0, test_helpers_1.getUniqueFolderName)();
        const overridesDir = (0, test_helpers_1.getUniqueFolderName)();
        const packageManagerFile = path.join((0, test_helpers_1.getUniqueFolderName)(), 'package-manager.json');
        await fs.outputJson(packageManagerFile, { packages: [] });
        const refreshManager = new refresh_1.RefreshManager(vars_1.Vars.DB_BASE_PATH, log.userLogger);
        const packageManagerAdapter = new package_manager_adapter_1.PackageManagerAdapter({
            refreshManager,
            packageManagerFile,
            contentFolder,
            zipsFolder,
            overridesDir
        });
        return { contentFolder, zipsFolder, packageManagerAdapter };
    }
    async function prepareHandoffWrapper({ contentFolder, packageManagerAdapter, installer, installCommand, submittedPackage, checkInstallerInSync = false }) {
        const installOut = await getInstallOut();
        const uploadedEntry = {
            submissionType: "installer" /* SubmissionType.INSTALLER */,
            installCommand,
            submittedPackage,
            email: '',
            assets: { [util_1.Platform.LINUX]: installer }
        };
        const result = (0, prepare_handoff_1.prepareHandoff)({
            assetUploads: [],
            contentFolder,
            log,
            uploadedEntry,
            submissionType: "installer" /* SubmissionType.INSTALLER */,
            installOut,
            packageManagerAdapter,
            // We do this so we don't need to re-create all the installers
            skipVerifyInstallerInSync: !checkInstallerInSync
        });
        await result;
        await new Promise((resolve) => {
            if (installOut.writable) {
                installOut.end(resolve);
            }
            else {
                resolve();
            }
        });
        return result;
    }
    async function getInstallOut() {
        const file = path.join((0, test_helpers_1.getUniqueFolderName)(), 'install-output.text');
        await fs.ensureFile(file);
        const installOut = fs.createWriteStream(file);
        return new Promise((resolve, reject) => {
            let done = false;
            installOut.once('open', () => {
                if (!done) {
                    resolve(installOut);
                }
                done = true;
            });
            installOut.once('error', (err) => {
                if (!done) {
                    reject(err);
                }
                done = true;
            });
        });
    }
    async function verifyPrepareHandoff(result, { expectedNonPackageFolders, expectedPackageFolders, expectedZips }) {
        const { downloadFolder, extractFolder, packageFolders, nonPackageFolders: unfilteredNonPackageFolders, zips } = await result;
        // Filter out install_logs & uninstallers (we don't care / test for them)
        const nonPackageFolders = unfilteredNonPackageFolders.filter((item) => path.basename(item) !== 'install_logs' && path.basename(item) !== 'uninstallers');
        const relPackageFolders = packageFolders.map((item) => path_helpers_1.PathHelpers.getRelativePath(item, extractFolder));
        const relNonPackageFolders = nonPackageFolders.map((item) => path_helpers_1.PathHelpers.getRelativePath(item, extractFolder));
        const relZips = zips.map((item) => path_helpers_1.PathHelpers.getRelativePath(item, downloadFolder));
        (0, chai_1.expect)(normalizeAndSort(relPackageFolders)).to.deep.equal(normalizeAndSort(expectedPackageFolders));
        (0, chai_1.expect)(normalizeAndSort(relNonPackageFolders)).to.deep.equal(normalizeAndSort(expectedNonPackageFolders));
        (0, chai_1.expect)(normalizeAndSort(relZips)).to.deep.equal(normalizeAndSort(expectedZips));
        await (0, test_helpers_2.verifyContentAndZipsPresent)({
            contentFolder: extractFolder,
            content: [...expectedPackageFolders, ...expectedNonPackageFolders],
            zipsFolder: downloadFolder,
            zips: [...expectedZips]
        });
    }
    function normalizeAndSort(items) {
        return items.map((item) => path_helpers_1.PathHelpers.normalize(item)).sort();
    }
});
