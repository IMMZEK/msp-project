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
const CreatePackageEntries = require("./create-package-entries");
const PackageHelpers = require("./package-helpers");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[handoff] CreatePackageEntries', function () {
    describe('deduceZips', function () {
        it('Should handle a package with 1 content folder and 1 zip', async function () {
            const entry = (0, test_helpers_2.createPackageEntryValid)({
                id: 'hello',
                version: '6',
                content: ['foo/bar'],
                zips: ['foo/bar/hello__all.zip']
            });
            await testCommon(entry);
        });
        it('Should handle a package with no zips', async function () {
            const entry = (0, test_helpers_2.createPackageEntryValid)({
                id: 'hello',
                version: '6',
                content: ['foo/bar'],
                zips: []
            });
            await testCommon(entry);
        });
        it('Should handle a package with multiple content folders', async function () {
            // 3 content folders (1 has 2 zips, 1 has 1, 1 has 0)
            const entry = (0, test_helpers_2.createPackageEntryValid)({
                id: 'hello',
                version: '6',
                content: ['foo/bar', 'me', 'fee'],
                zips: ['foo/bar/hello__all.zip', 'foo/bar/hello__win.zip', 'me/hello__linux.zip']
            });
            await testCommon(entry);
        });
        async function testCommon(entry) {
            const { zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry]
                }
            });
            const zips = await CreatePackageEntries._deduceZips({
                id: entry.id,
                version: entry.version,
                content: entry.content,
                isNonTirexPackage: false
            }, zipsFolder);
            (0, chai_1.expect)(zips).to.deep.equal(entry.zips);
        }
    });
    describe('getMissingPackages', () => {
        const entry1 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'goodbye',
            version: '0.10.27',
            content: ['hello/howdy'],
            zips: []
        });
        const entry2 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'goodbye',
            version: '0.10.28',
            content: ['hello/goodbye'],
            zips: []
        });
        const entry3 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '0.10.28',
            content: ['goodbye/sometimes'],
            zips: []
        });
        const entry4 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '0.10.28',
            content: ['foo_0_10_28'],
            zips: []
        });
        it('Should handle a single missing package', async function () {
            await testCommon({
                entries: [entry1, entry2],
                knownEntries: [entry2],
                missingEntries: [entry1]
            });
        });
        it('Should handle multiple missing packages', async function () {
            await testCommon({
                entries: [entry1, entry2, entry3],
                knownEntries: [entry1],
                missingEntries: [entry2, entry3]
            });
        });
        it('Should handle no packages missing', async function () {
            await testCommon({
                entries: [entry1, entry2],
                knownEntries: [entry1, entry2],
                missingEntries: []
            });
        });
        it('Should handle some packages in entries not in packageFolders (nothing should be missing)', async function () {
            const entries = [entry1, entry2];
            const knownEntries = [entry1, entry2];
            const missingEntries = [];
            // Setup
            const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zipsFolder = (0, test_helpers_1.getUniqueFolderName)();
            const overridesDir = (0, test_helpers_1.getUniqueFolderName)();
            const packages = _.flatten(entries.map((item) => item.content));
            const packagesJson = entries.map(({ id, version }) => ({
                name: id,
                id,
                version,
                type: 'software'
            }));
            // Run
            await (0, test_helpers_2.createPackages)({
                packages: packages.map((pkg) => path.join(contentFolder, pkg)),
                packagesJson
            });
            const missingPackageInfos = await CreatePackageEntries._getMissingPackages({
                entries: knownEntries,
                packageFolders: entry1.content,
                nonPackageFolders: [],
                contentFolder,
                zipsFolder,
                overridesDir
            });
            // Validate
            (0, chai_1.expect)(missingPackageInfos).to.deep.equal(missingEntries.map((entry) => ({
                id: entry.id,
                version: entry.version,
                content: entry.content
            })));
        });
        it('Should handle a package folder whose content does not exist (skip)', async function () {
            // Entry 3s content does not exist
            const entries = [entry1, entry2, entry3];
            const knownEntries = [entry1, entry2];
            const missingEntries = [];
            // Setup
            const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zipsFolder = (0, test_helpers_1.getUniqueFolderName)();
            const overridesDir = (0, test_helpers_1.getUniqueFolderName)();
            const packages = _.flatten(entries.map((item) => item.content));
            const packagesJson = entries.map(({ id, version }) => ({
                name: id,
                id,
                version,
                type: 'software'
            }));
            await Promise.all(entry3.content.map((item) => fs.remove(item)));
            // Run
            await (0, test_helpers_2.createPackages)({
                packages: packages.map((pkg) => path.join(contentFolder, pkg)),
                packagesJson
            });
            const missingPackageInfos = await CreatePackageEntries._getMissingPackages({
                entries: knownEntries,
                packageFolders: entry1.content,
                nonPackageFolders: [],
                contentFolder,
                zipsFolder,
                overridesDir
            });
            // Validate
            (0, chai_1.expect)(missingPackageInfos).to.deep.equal(missingEntries.map((entry) => ({
                id: entry.id,
                version: entry.version,
                content: entry.content
            })));
        });
        it('Should handle a packageFolder pointing to a package in entries but with a different content folder (ignore it)', async function () {
            await testCommon({
                entries: [entry1, entry3, entry4],
                knownEntries: [entry1, entry3],
                missingEntries: []
            });
        });
        it('Should handle two packageFolders both pointing to the same missing package (make a single entry for both)', async function () {
            await testCommon({
                entries: [entry1, entry3, entry4],
                knownEntries: [entry1],
                missingEntries: [{ ...entry3, content: [...entry3.content, ...entry4.content] }]
            });
        });
        async function testCommon({ entries, knownEntries, missingEntries }) {
            // Setup
            const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zipsFolder = (0, test_helpers_1.getUniqueFolderName)();
            const overridesDir = (0, test_helpers_1.getUniqueFolderName)();
            const packages = _.flatten(entries.map((item) => item.content));
            const packagesJson = entries.map(({ id, version }) => ({
                name: id,
                id,
                version,
                type: 'software'
            }));
            // Run
            await (0, test_helpers_2.createPackages)({
                packages: packages.map((pkg) => path.join(contentFolder, pkg)),
                packagesJson
            });
            const missingPackageInfos = await CreatePackageEntries._getMissingPackages({
                entries: knownEntries,
                packageFolders: packages,
                nonPackageFolders: [],
                contentFolder,
                zipsFolder,
                overridesDir
            });
            // Validate
            (0, chai_1.expect)(missingPackageInfos).to.deep.equal(missingEntries.map((entry) => ({
                id: entry.id,
                version: entry.version,
                content: entry.content,
                isNonTirexPackage: false
            })));
        }
    });
    describe('getMissingNonPackageFolders', async function () {
        const entry1 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'goodbye',
            version: '0.10.27',
            content: ['hello/howdy'],
            zips: []
        });
        const entry2 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'goodbye',
            version: '0.10.28',
            content: ['hello/goodbye'],
            zips: []
        });
        const entry3 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '0.10.28',
            content: ['goodbye/sometimes'],
            zips: []
        });
        it('Should get a missing non package folder', async function () {
            const entries = [entry1, entry2];
            const knownEntries = [entry1, entry2];
            const nonPackageFolderEntries = [
                {
                    ...entry3,
                    ...PackageHelpers.getPlaceholderPackageInfo('goodbye'),
                    content: ['goodbye']
                }
            ];
            await testCommon({ entries, knownEntries, nonPackageFolderEntries });
        });
        it('Should handle no missing non package folders', async function () {
            const entries = [entry1, entry2];
            const knownEntries = [entry1, entry2];
            const nonPackageFolderEntries = [];
            await testCommon({ entries, knownEntries, nonPackageFolderEntries });
        });
        async function testCommon({ entries, knownEntries, nonPackageFolderEntries }) {
            // Setup
            const contentFolder = (0, test_helpers_1.getUniqueFolderName)();
            const zipsFolder = (0, test_helpers_1.getUniqueFolderName)();
            const overridesDir = (0, test_helpers_1.getUniqueFolderName)();
            const packages = _.flatten(entries.map((item) => item.content));
            const packagesJson = entries.map(({ id, version }) => ({
                name: id,
                id,
                version,
                type: 'software'
            }));
            // Run
            await (0, test_helpers_2.createPackages)({
                packages: packages.map((pkg) => path.join(contentFolder, pkg)),
                packagesJson
            });
            await Promise.all(_.flatten(nonPackageFolderEntries.map((item) => item.content)).map((item) => fs.ensureDir(path.join(contentFolder, item))));
            const args = {
                entries: knownEntries,
                packageFolders: packages,
                nonPackageFolders: _.flatten(nonPackageFolderEntries.map((item) => item.content)),
                contentFolder,
                zipsFolder,
                overridesDir
            };
            const missingNonPackageFoldersInfo = await CreatePackageEntries._getMissingNonPackageFolders(args);
            // Validate
            (0, chai_1.expect)(missingNonPackageFoldersInfo).to.deep.equal(nonPackageFolderEntries.map((entry) => ({
                id: entry.id,
                version: entry.version,
                content: entry.content,
                isNonTirexPackage: true
            })));
        }
    });
});
