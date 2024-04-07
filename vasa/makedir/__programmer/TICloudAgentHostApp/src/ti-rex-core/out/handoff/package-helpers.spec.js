"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const chai_1 = require("chai");
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT ||
    process.platform !== 'linux' // handoff only runs on linux, and there's lots of paths being compared (\ vs /)
) {
    // @ts-ignore
    return;
}
// our modules
const test_helpers_2 = require("./test-helpers");
const PackageHelpers = require("./package-helpers");
const path_helpers_1 = require("../shared/path-helpers");
const vars_1 = require("../lib/vars");
const util_1 = require("./util");
///////////////////////////////////////////////////////////////////////////////
/// Tests
//////////////////////////////////////////////////////////////////////////////
describe('[handoff] PackageHelpers', function () {
    describe('getPackageFolders', function () {
        it('Should discover a package folder', async function () {
            const folder = (0, test_helpers_1.getUniqueFolderName)();
            const pkg = path.join(folder, 'hi', 'hello');
            await (0, test_helpers_2.createPackages)({ packages: [pkg] });
            const { packageFolders } = await PackageHelpers.getPackageFolders(folder);
            verifyPackageDiscovery(packageFolders, [path_helpers_1.PathHelpers.getRelativePath(pkg, folder)]);
        });
        it('Should discover multiple package folders', async function () {
            const folder = (0, test_helpers_1.getUniqueFolderName)();
            const pkg = path.join(folder, 'hi', 'hello');
            const pkg2 = path.join(folder, 'yo', 'something');
            await (0, test_helpers_2.createPackages)({ packages: [pkg, pkg2] });
            const { packageFolders } = await PackageHelpers.getPackageFolders(folder);
            verifyPackageDiscovery(packageFolders, [pkg, pkg2].map((item) => path_helpers_1.PathHelpers.getRelativePath(item, folder)));
        });
        it('Should handle a package with a metadata folder', async function () {
            const parentFolder = (0, test_helpers_1.getUniqueFolderName)();
            const folder = path.join(parentFolder, 'subfolder');
            await fs.outputFile(path.join(folder, vars_1.Vars.METADATA_DIR, vars_1.Vars.PACKAGE_TIREX_JSON), '');
            const { packageFolders } = await PackageHelpers.getPackageFolders(parentFolder);
            verifyPackageDiscovery(packageFolders, [
                path_helpers_1.PathHelpers.getRelativePath(folder, parentFolder)
            ]);
        });
        it('Should differentiate between package and non package folders', async function () {
            const parentFolder = (0, test_helpers_1.getUniqueFolderName)();
            const pkg = path.join(parentFolder, 'pkgFolder', 'hi', 'hello');
            await (0, test_helpers_2.createPackages)({ packages: [pkg] });
            const someFolder = path.join(parentFolder, 'someFolder');
            const someFile = path.join(someFolder, 'item');
            await fs.outputFile(someFile, '');
            const { packageFolders, nonPackageFolders } = await PackageHelpers.getPackageFolders(parentFolder);
            verifyPackageDiscovery(packageFolders, [
                path_helpers_1.PathHelpers.getRelativePath(pkg, parentFolder)
            ]);
            (0, chai_1.expect)(nonPackageFolders).to.deep.equal([
                path_helpers_1.PathHelpers.getRelativePath(someFolder, parentFolder)
            ]);
        });
        it('Should limit the depth of the search', async function () {
            const folder = (0, test_helpers_1.getUniqueFolderName)();
            const pkg = path.join(folder, 'hi', 'hello');
            const deepPackage = path.join(folder, 'hi', 'hello', 'foo', 'bar', 'baz', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'really', 'deep');
            await (0, test_helpers_2.createPackages)({ packages: [pkg, deepPackage] });
            const { packageFolders } = await PackageHelpers.getPackageFolders(folder);
            verifyPackageDiscovery(packageFolders, [path_helpers_1.PathHelpers.getRelativePath(pkg, folder)]);
        });
        function verifyPackageDiscovery(packageFolders, expectedPackages) {
            const packages = packageFolders.map((pkg) => {
                return path_helpers_1.PathHelpers.normalize(pkg);
            });
            expectedPackages = expectedPackages.map((pkg) => {
                return path_helpers_1.PathHelpers.normalize(pkg);
            });
            (0, chai_1.expect)(packages).to.deep.equal(expectedPackages);
        }
    });
    describe('zipsMirrorPackageFolderStructure', function () {
        it('Should move the zips into the correct location', async function () {
            const downloadFolder = (0, test_helpers_1.getUniqueFolderName)();
            const extractFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zips = [
                { asset: path.join(downloadFolder, 'something.tar.gz'), platform: util_1.Platform.ALL },
                {
                    asset: path.join(downloadFolder, 'foo', 'bar.tar.gz'),
                    platform: util_1.Platform.LINUX
                }
            ];
            const relativePackageFolders = ['path', 'foo/bar2'];
            const packageFolders = relativePackageFolders.map((pkg) => {
                return path.join(extractFolder, pkg);
            });
            await prepareData({
                downloadFolder,
                extractFolder,
                zips,
                packageFolders
            });
            const newZips = await PackageHelpers.zipsMirrorPackageFolderStructure({
                downloadFolder,
                extractFolder,
                zips,
                packageFolders
            });
            const expectedZips = getExpectedZips({
                zips,
                downloadFolder,
                relativePackageFolders
            });
            (0, chai_1.expect)(newZips).to.include.members(expectedZips);
            (0, chai_1.expect)(newZips).to.have.length(expectedZips.length);
            await (0, test_helpers_2.verifyContentAndZipsPresent)({
                contentFolder: '',
                content: [],
                zips: expectedZips,
                // Zips are absolute here
                zipsFolder: ''
            });
        });
        it("Should remove the old zips (they shouldn't exist in the original location)", async function () {
            const downloadFolder = (0, test_helpers_1.getUniqueFolderName)();
            const extractFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zips = [
                { asset: path.join(downloadFolder, 'something.tar.gz'), platform: util_1.Platform.ALL },
                {
                    asset: path.join(downloadFolder, 'foo', 'bar.tar.gz'),
                    platform: util_1.Platform.LINUX
                }
            ];
            const relativePackageFolders = ['path', 'foo/bar2'];
            const packageFolders = relativePackageFolders.map((pkg) => {
                return path.join(extractFolder, pkg);
            });
            await prepareData({
                downloadFolder,
                extractFolder,
                zips,
                packageFolders
            });
            await PackageHelpers.zipsMirrorPackageFolderStructure({
                downloadFolder,
                extractFolder,
                zips,
                packageFolders
            });
            await (0, test_helpers_2.verifyContentAndZipsGone)({
                contentFolder: '',
                content: [],
                zips: zips.map((item) => item.asset),
                // Zips are absolute here
                zipsFolder: ''
            });
        });
        it('Should ignore packages not in the extract folder', async function () {
            const downloadFolder = (0, test_helpers_1.getUniqueFolderName)();
            const extractFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zips = [
                { asset: path.join(downloadFolder, 'something.tar.gz'), platform: util_1.Platform.OSX }
            ];
            const relativePackageFolders = ['path', 'foo/bar2'];
            const packageFolders = relativePackageFolders.map((pkg) => {
                return path.join(extractFolder, pkg);
            });
            packageFolders.push(path.join(downloadFolder, 'hey'));
            await prepareData({
                downloadFolder,
                extractFolder,
                zips,
                packageFolders
            });
            const newZips = await PackageHelpers.zipsMirrorPackageFolderStructure({
                downloadFolder,
                extractFolder,
                zips,
                packageFolders
            });
            const unexpectedZips = getExpectedZips({
                zips,
                downloadFolder,
                relativePackageFolders: ['hey']
            });
            const expectedZips = getExpectedZips({
                zips,
                downloadFolder,
                relativePackageFolders
            });
            (0, chai_1.expect)(newZips).to.include.members(expectedZips);
            (0, chai_1.expect)(newZips).to.have.length(expectedZips.length);
            await Promise.all([
                (0, test_helpers_2.verifyContentAndZipsGone)({
                    zips: unexpectedZips,
                    // Zips are absolute here
                    zipsFolder: '',
                    content: [],
                    contentFolder: ''
                }),
                (0, test_helpers_2.verifyContentAndZipsPresent)({
                    contentFolder: '',
                    content: [],
                    zips: expectedZips,
                    // Zips are absolute here
                    zipsFolder: ''
                })
            ]);
        });
        async function prepareData({ downloadFolder, extractFolder, zips, packageFolders }) {
            await Promise.all([
                fs.ensureDir(downloadFolder),
                fs.ensureDir(extractFolder),
                zips.map((zip) => fs.outputFile(zip.asset, '')),
                (0, test_helpers_2.createPackages)({ packages: packageFolders })
            ]);
        }
        function getExpectedZips({ zips, downloadFolder, relativePackageFolders }) {
            return _.flatten(zips.map((zip) => relativePackageFolders.map((pkg) => path.join(downloadFolder, pkg, zip.platform, path.basename(zip.asset)))));
        }
    });
});
