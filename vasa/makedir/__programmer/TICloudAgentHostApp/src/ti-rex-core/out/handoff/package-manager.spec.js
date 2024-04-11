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
const rex_1 = require("../lib/rex");
const test_helpers_2 = require("./test-helpers");
const util_1 = require("../shared/util");
const util_2 = require("../test/util");
// We could make a testing log to eliminate our dependency on the RexObject (and it being set by the server startup code)
const { log } = (0, rex_1._getRex)();
////////////////////////////////////////////////////////////////////////////////
/// Data - Do not change the values as the tests rely on them (i.e same id / version)
////////////////////////////////////////////////////////////////////////////////
const entry1 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'hello',
    version: '6_5_0',
    content: [],
    zips: []
});
const entry2 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'goodbye',
    version: '0.10.26',
    content: [],
    zips: []
});
const entry3 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'goodbye',
    version: '0.10.27',
    content: [],
    zips: ['something/hi']
});
const entry4 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'goodbye',
    version: '0.10.27',
    content: ['hello/goodbye'],
    zips: []
});
const entry5 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'goodbye',
    version: '0.10.27',
    content: ['hello/howdy', 'foo/bar'],
    zips: ['I/am/a/foo.tar.gz', 'I/am/bar.tar.gz']
});
const entry7 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'goodbye',
    version: '0.10.26',
    content: ['baz/fuz'],
    zips: []
});
const entry8 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'howdy',
    version: '8',
    content: ['howdy_8_0_0', 'another'],
    zips: ['howdy_8_0_0__all.zip']
});
const entry9 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'howdy',
    version: '8',
    content: ['later_8_0_0', 'something'],
    zips: ['later_8_0_0__all.zip']
});
const entry10 = (0, test_helpers_2.createPackageEntryValid)({
    id: 'howdy',
    version: '8',
    content: ['howdy_8_0_0', 'something'],
    zips: ['howdy_8_0_0__all.zip']
});
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[handoff] PackageManager', function () {
    describe('getPackageEntry', function () {
        it('Should get a valid entry from the file', async function () {
            const { pm } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1, entry2]
                }
            });
            const { entry, idx } = await pm.getEntryFromPackagesFile({
                id: entry1.id,
                version: entry1.version,
                log
            });
            (0, chai_1.expect)(idx).to.not.equal(-1);
            (0, chai_1.expect)(entry).to.contain.all.keys(entry1);
        });
        it('Should handle a request for a package that does not exist', async function () {
            const { pm } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1, entry2]
                }
            });
            const { entry, idx } = await pm.getEntryFromPackagesFile({
                id: 'howdy',
                version: '0.10.26',
                log
            });
            (0, chai_1.expect)(idx).to.equal(-1);
            (0, chai_1.expect)(entry).to.not.exist;
        });
        it('Should handle a request for a package version that does not exist (the package does)', async function () {
            const { pm } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1, entry2]
                }
            });
            const { entry, idx } = await pm.getEntryFromPackagesFile({
                id: entry1.id,
                version: '3.2',
                log
            });
            (0, chai_1.expect)(idx).to.equal(-1);
            (0, chai_1.expect)(entry).to.not.exist;
        });
    });
    describe('stageAddPackage', () => {
        it('Should handle new packages', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1]
                }
            });
            // Stage the entry
            {
                const entry = entry2;
                const { oldEntry } = await pm._stagePackagesFileAndBackupAssets({
                    entry,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.not.exist;
                await (0, test_helpers_2.prepareContentAndZips)({
                    contentFolder,
                    zipsFolder,
                    zips: entry2.zips,
                    content: entry2.content
                });
            }
            // Make sure the stage entry is there / updated
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry2.id,
                    version: entry2.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry2,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder
                });
            }
        });
        it('Should not allow staging a staged package', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                contentFolder: (0, test_helpers_1.getUniqueFolderName)(),
                packageManagerFileJson: {
                    packages: [entry1]
                }
            });
            // Stage the entry
            {
                const { oldEntry } = await pm._stagePackagesFileAndBackupAssets({
                    entry: entry2,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.not.exist;
                await (0, test_helpers_2.prepareContentAndZips)({
                    contentFolder,
                    zipsFolder,
                    zips: entry2.zips,
                    content: entry2.content
                });
            }
            // Make sure the staged entry is there / updated
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry2.id,
                    version: entry2.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry2,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder
                });
            }
            // Stage again
            await (0, util_2.verifyError)(pm._stagePackagesFileAndBackupAssets({
                entry: entry7,
                log
            }), 'already staged');
        });
        it('Should backup a valid entry', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1]
                }
            });
            // Add entry
            {
                const { oldEntry } = await pm._stagePackagesFileAndBackupAssets({
                    entry: entry8,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.not.exist;
                await (0, test_helpers_2.prepareContentAndZips)({
                    contentFolder,
                    zipsFolder,
                    zips: entry8.zips,
                    content: entry8.content
                });
                await pm._updatePackagesFileAndRemoveOldAssets({ entry: entry8, log });
            }
            // Make sure the valid entry is there
            {
                const { idx } = await pm.getEntryFromPackagesFile({
                    id: entry8.id,
                    version: entry8.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
            }
            // Stage the entry
            {
                const { oldEntry } = await pm._stagePackagesFileAndBackupAssets({
                    entry: entry9,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.exist;
                await (0, test_helpers_2.prepareContentAndZips)({
                    contentFolder,
                    zipsFolder,
                    zips: entry9.zips,
                    content: entry9.content
                });
            }
            // Make sure the staged entry is there / updated
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry9.id,
                    version: entry9.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry9,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder,
                    isUpdate: true,
                    prevContent: entry8.content,
                    prevZips: entry8.zips
                });
            }
        });
        it('Should handle some content / zips in the same location as the old entry', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1]
                }
            });
            // Update the entry
            {
                const { oldEntry } = await pm._stagePackagesFileAndBackupAssets({
                    entry: entry8,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.not.exist;
                await pm._updatePackagesFileAndRemoveOldAssets({
                    entry: entry8,
                    log
                });
                await (0, test_helpers_2.prepareContentAndZips)({
                    contentFolder,
                    zipsFolder,
                    zips: entry8.zips,
                    content: entry8.content
                });
            }
            // Make sure the valid entry is there
            {
                const { idx } = await pm.getEntryFromPackagesFile({
                    id: entry8.id,
                    version: entry8.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
            }
            // Stage the entry
            {
                await pm._stagePackagesFileAndBackupAssets({
                    entry: entry10,
                    log
                });
                await (0, test_helpers_2.prepareContentAndZips)({
                    contentFolder,
                    zipsFolder,
                    zips: entry10.zips,
                    content: entry10.content
                });
            }
            // Make sure the staged entry is there / updated
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry10.id,
                    version: entry10.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry10,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder,
                    isUpdate: true,
                    prevContent: entry8.content,
                    prevZips: entry8.zips
                });
            }
        });
        async function verifyEntry({ insertedEntry, resultEntry, contentFolder, zipsFolder, isUpdate = false, prevContent, prevZips }) {
            const { id, version, content, zips } = insertedEntry;
            if (isUpdate) {
                (0, chai_1.expect)(resultEntry).to.deep.equal({
                    ...resultEntry,
                    id,
                    version,
                    content,
                    zips,
                    state: "staged" /* PackageEntryState.STAGED */
                });
                if (resultEntry.state === "staged" /* PackageEntryState.STAGED */) {
                    if ((!prevContent || !prevZips) &&
                        (resultEntry.backupContent.length > 0 || resultEntry.backupZips.length > 0)) {
                        throw new Error('Backup content and/or zips exist but prev content / zips not passed in');
                    }
                    else if (!prevContent || !prevZips) {
                        return;
                    }
                    (0, chai_1.expect)(resultEntry.backupContent).to.have.length(prevContent.length);
                    (0, chai_1.expect)(resultEntry.backupZips).to.have.length(prevZips.length);
                    await (0, test_helpers_2.verifyContentAndZipsPresent)({
                        // Backup zips are relative to the content folder
                        content: [...resultEntry.backupContent, ...resultEntry.backupZips],
                        zips: [],
                        contentFolder,
                        zipsFolder
                    });
                }
                await Promise.all([
                    (0, test_helpers_2.verifyContentAndZipsGone)({
                        content: prevContent
                            ? prevContent.filter((content) => !insertedEntry.content.includes(content))
                            : [],
                        zips: prevZips
                            ? prevZips.filter((zip) => !insertedEntry.zips.includes(zip))
                            : [],
                        contentFolder,
                        zipsFolder
                    }),
                    (0, test_helpers_2.verifyContentAndZipsPresent)({
                        content: insertedEntry.content,
                        zips: insertedEntry.zips,
                        contentFolder,
                        zipsFolder
                    })
                ]);
            }
            else {
                (0, chai_1.expect)(resultEntry).to.deep.equal({
                    ...resultEntry,
                    id,
                    version,
                    content,
                    zips,
                    state: "staged" /* PackageEntryState.STAGED */
                });
            }
        }
    });
    describe('addPackage', function () {
        it('Should handle new packages', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry1]
                }
            });
            // Update the entry
            {
                const entry = entry2;
                const { oldEntry } = await pm._updatePackagesFileAndRemoveOldAssets({
                    entry,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.not.exist;
            }
            // Make sure the new version is there
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry2.id,
                    version: entry2.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry2,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder,
                    checkFs: false
                });
            }
        });
        it('Should handle adding new versions to an existing package', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry2]
                }
            });
            // Update the entry
            {
                const entry = entry3;
                const { oldEntry } = await pm._updatePackagesFileAndRemoveOldAssets({
                    entry,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.not.exist;
            }
            // Make sure the new package version is there
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry3.id,
                    version: entry3.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry3,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder,
                    checkFs: false
                });
            }
            // Make sure the old package version is still there
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry2.id,
                    version: entry2.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry2,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder,
                    checkFs: false
                });
            }
        });
        it('Should update the entry in the file', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry3]
                }
            });
            // Update the entry
            {
                const entry = entry4;
                const { oldEntry } = await pm._updatePackagesFileAndRemoveOldAssets({
                    entry,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.exist;
            }
            // Make sure the new package version is there
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry4.id,
                    version: entry4.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await verifyEntry({
                    insertedEntry: entry4,
                    resultEntry: entry,
                    contentFolder,
                    zipsFolder,
                    checkFs: false
                });
            }
        });
        it("Should remove the old entries' associated content and zips", async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: {
                    packages: [entry5]
                }
            });
            // Update the entry
            {
                const entry = entry4;
                const { oldEntry } = await pm._updatePackagesFileAndRemoveOldAssets({
                    entry,
                    log
                });
                (0, chai_1.expect)(oldEntry).to.exist;
            }
            // Make sure the new package version is there & the old content & zips are gone
            {
                const { entry, idx } = await pm.getEntryFromPackagesFile({
                    id: entry4.id,
                    version: entry4.version,
                    log
                });
                (0, chai_1.expect)(idx).to.not.equal(-1);
                if (!entry) {
                    throw new Error('Entry is null');
                }
                await Promise.all([
                    verifyEntry({
                        insertedEntry: entry4,
                        resultEntry: entry,
                        contentFolder,
                        zipsFolder,
                        checkFs: false
                    }),
                    (0, test_helpers_2.verifyContentAndZipsGone)({
                        zipsFolder,
                        contentFolder,
                        zips: entry5.zips,
                        content: entry5.content
                    })
                ]);
            }
        });
        async function verifyEntry({ insertedEntry, resultEntry, contentFolder, zipsFolder, checkFs }) {
            const { id, version, content, zips } = insertedEntry;
            (0, chai_1.expect)(resultEntry).to.deep.equal({
                ...resultEntry,
                id,
                version,
                content,
                zips,
                state: "valid" /* PackageEntryState.VALID */
            });
            if (checkFs) {
                await (0, test_helpers_2.verifyContentAndZipsPresent)({
                    content: insertedEntry.content,
                    zips: insertedEntry.zips,
                    contentFolder,
                    zipsFolder
                });
            }
        }
    });
    describe('rollbackPackage', function () {
        // These tests test both stageRollbackPackage and rollbackPackage
        const entry1 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '1.2.3',
            content: [path.join('Content1', 'foo'), path.join('Content2', 'bar')],
            zips: [path.join('zip1', 'foo.zip'), path.join('bar.zip')]
        });
        const entry2 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '1.2.3',
            content: [path.join('Content11', 'foo'), path.join('Content2', 'bar')],
            zips: [path.join('zip1', 'foo.zip'), path.join('bar2.zip')]
        });
        it('Should rollback a staged package', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: { packages: [entry1] }
            });
            const stagedEntry = await pm.stagePackagesFileAndBackupOldAssets({
                entry: entry2,
                log
            });
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder,
                zipsFolder,
                zips: stagedEntry.zips,
                content: stagedEntry.content,
                contentJson: stagedEntry.content.map(() => ({
                    name: stagedEntry.id,
                    id: stagedEntry.id,
                    version: stagedEntry.version,
                    type: 'software'
                }))
            });
            const originalEntry = await pm.stageRollbackPackage({
                id: stagedEntry.id,
                version: stagedEntry.version,
                submissionId: stagedEntry.submissionId,
                log
            });
            if (!originalEntry) {
                throw new Error('No rollbackEntry');
            }
            const rollbackEntry = await pm.rollbackPackage({ entry: originalEntry, log });
            await verifyRollbackSuccessful({
                entry: rollbackEntry.entry,
                previousEntry: entry1,
                stagedEntry,
                contentFolder,
                zipsFolder
            });
        });
        it('Should handle trying to rollback a non-staged package', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: { packages: [entry1] }
            });
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder,
                zipsFolder,
                zips: entry2.zips,
                content: entry2.content,
                contentJson: entry2.content.map(() => ({
                    name: entry2.id,
                    id: entry2.id,
                    version: entry2.version,
                    type: 'software'
                }))
            });
            await (0, util_2.verifyError)(pm.stageRollbackPackage({
                id: entry2.id,
                version: entry2.version,
                submissionId: entry2.submissionId,
                log
            }), 'not staged');
            await (0, test_helpers_2.verifyContentAndZipsPresent)({
                content: entry1.content,
                zips: entry1.zips,
                contentFolder,
                zipsFolder
            });
        });
        it('Should handle an entry with no backup (delete)', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({});
            const stagedEntry = await pm.stagePackagesFileAndBackupOldAssets({
                entry: entry2,
                log
            });
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder,
                zipsFolder,
                zips: stagedEntry.zips,
                content: stagedEntry.content,
                contentJson: stagedEntry.content.map(() => ({
                    name: stagedEntry.id,
                    id: stagedEntry.id,
                    version: stagedEntry.version,
                    type: 'software'
                }))
            });
            const rollbackEntry = await pm.stageRollbackPackage({
                id: stagedEntry.id,
                version: stagedEntry.version,
                submissionId: stagedEntry.submissionId,
                log
            });
            (0, chai_1.expect)(rollbackEntry).to.be.null;
        });
        it('Should handle some of the backup missing (delete)', async function () {
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: { packages: [entry1] }
            });
            const stagedEntry = await pm.stagePackagesFileAndBackupOldAssets({
                entry: entry2,
                log
            });
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder,
                zipsFolder,
                zips: stagedEntry.zips,
                content: stagedEntry.content,
                contentJson: stagedEntry.content.map(() => ({
                    name: stagedEntry.id,
                    id: stagedEntry.id,
                    version: stagedEntry.version,
                    type: 'software'
                }))
            });
            await Promise.all([stagedEntry.backupContent[1], stagedEntry.backupZips[0]].map((item) => fs.remove(path.join(contentFolder, item))));
            const rollbackEntry = await pm.stageRollbackPackage({
                id: stagedEntry.id,
                version: stagedEntry.version,
                submissionId: stagedEntry.submissionId,
                log
            });
            (0, chai_1.expect)(rollbackEntry).to.be.null;
        });
        function verifyRollbackSuccessful({ entry, previousEntry, stagedEntry, contentFolder, zipsFolder }) {
            (0, util_1.getObjectKeys)(entry).map((key) => {
                (0, chai_1.expect)(previousEntry[key]).to.deep.equal(entry[key]);
            });
            return Promise.all([
                (0, test_helpers_2.verifyContentAndZipsGone)({
                    content: stagedEntry.content.filter((item) => !previousEntry.content.includes(item)),
                    zips: stagedEntry.zips.filter((item) => !previousEntry.zips.includes(item)),
                    contentFolder,
                    zipsFolder
                }),
                (0, test_helpers_2.verifyContentAndZipsPresent)({
                    content: previousEntry.content,
                    zips: previousEntry.zips,
                    contentFolder,
                    zipsFolder
                })
            ]).then(() => { });
        }
    });
    describe('deletePackage', () => {
        // These tests test both stageDeletePackage and deletePackage
        const entry1 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '1.2.3',
            content: [path.join('Content1', 'foo'), path.join('Content2', 'bar')],
            zips: [path.join('zip1', 'foo.zip'), path.join('bar.zip')]
        });
        const entry2 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '1.2.3',
            content: [path.join('Content11', 'foo'), path.join('Content2', 'bar')],
            zips: [path.join('zip1', 'foo.zip'), path.join('bar2.zip')]
        });
        const entry3 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'foo',
            version: '1.2.4',
            content: [path.join('Content3', 'foo'), path.join('Content4', 'bar')],
            zips: [path.join('zip3', 'foo.zip'), path.join('bar3.zip')]
        });
        const entry4 = (0, test_helpers_2.createPackageEntryValid)({
            id: 'hello',
            version: '1.2.4',
            content: [path.join('foo'), path.join('bar')],
            zips: [path.join('foo.zip')]
        });
        it('Should delete a valid package', async function () {
            const entry = entry1;
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: { packages: [entry] }
            });
            await pm.stageDeletePackage({ id: entry.id, version: entry.version, log });
            await pm.deletePackage({ id: entry.id, version: entry.version, log });
            await verifyDeleteSuccessful({ entry, packageManager: pm, contentFolder, zipsFolder });
        });
        it('Should delete a staged apackage', async function () {
            const entry = (0, test_helpers_2.createPackageEntryStaged)({
                id: entry1.id,
                version: entry1.version,
                content: entry1.content,
                zips: entry1.zips
            });
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: { packages: [entry] }
            });
            await pm.stageDeletePackage({ id: entry.id, version: entry.version, log });
            await pm.deletePackage({ id: entry.id, version: entry.version, log });
            await verifyDeleteSuccessful({ entry, packageManager: pm, contentFolder, zipsFolder });
        });
        it('Should handle a request to delete all versions of a package', async function () {
            const entry = entry3;
            const { pm, contentFolder, zipsFolder } = await (0, test_helpers_2.preparePackageManager)({
                packageManagerFileJson: { packages: [entry2, entry3, entry4] }
            });
            await pm.stageDeletePackage({ id: entry.id, version: 'all', log });
            await pm.deletePackage({ id: entry.id, version: 'all', log });
            await Promise.all([
                Promise.all([entry2, entry3].map((entry) => verifyDeleteSuccessful({
                    entry,
                    packageManager: pm,
                    contentFolder,
                    zipsFolder
                }))),
                // make sure it just deletes all versions of a particular package; not all packages
                verifyDeleteUnSuccessful({
                    entry: entry4,
                    packageManager: pm,
                    contentFolder,
                    zipsFolder
                })
            ]);
        });
        it('Should handle a non-existing package', async function () {
            const entry = entry1;
            const { pm } = await (0, test_helpers_2.preparePackageManager)({});
            const body = async () => {
                await pm.stageDeletePackage({ id: entry.id, version: entry.version, log });
                await pm.deletePackage({ id: entry.id, version: entry.version, log });
            };
            await (0, util_2.verifyError)(body(), 'No entry');
        });
        async function verifyDeleteSuccessful({ entry, packageManager, contentFolder, zipsFolder }) {
            const [{ entry: pmEntry }] = await Promise.all([
                packageManager.getEntryFromPackagesFile({ ...entry, log }),
                (0, test_helpers_2.verifyContentAndZipsGone)({
                    contentFolder,
                    zipsFolder,
                    zips: entry.zips,
                    content: entry.content
                })
            ]);
            (0, chai_1.expect)(pmEntry).to.not.exist;
        }
        async function verifyDeleteUnSuccessful({ entry, packageManager, contentFolder, zipsFolder }) {
            const [{ entry: pmEntry }] = await Promise.all([
                packageManager.getEntryFromPackagesFile({ ...entry, log }),
                (0, test_helpers_2.verifyContentAndZipsPresent)({
                    contentFolder,
                    zipsFolder,
                    zips: entry.zips,
                    content: entry.content
                })
            ]);
            (0, chai_1.expect)(pmEntry).to.exist;
        }
    });
});
