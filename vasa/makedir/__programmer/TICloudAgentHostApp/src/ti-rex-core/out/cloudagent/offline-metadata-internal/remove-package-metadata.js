"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePackageMetadataNoQ = void 0;
/**
 *
 * @param packageUid
 * @param logger
 * @param onProgressUpdate
 */
async function removePackageMetadataNoQ(packagePublicUid, dbResources, dbOverviews, dbPureBundles, onProgressUpdate) {
    onProgressUpdate({
        progressType: "Indefinite" /* ProgressType.INDEFINITE */,
        name: 'Removing metadata'
    });
    await dbResources.useAsync([packagePublicUid]); // needed for remove to work
    await Promise.all([
        dbResources.removeAsync({ packageUId: packagePublicUid }),
        dbOverviews.removeAsync({ packageUId: packagePublicUid }),
        dbPureBundles.removeAsync({ packageUId: packagePublicUid })
    ]);
    return Promise.all([
        dbResources.saveAsync(),
        dbOverviews.saveAsync(),
        dbPureBundles.saveAsync()
    ]);
}
exports.removePackageMetadataNoQ = removePackageMetadataNoQ;
