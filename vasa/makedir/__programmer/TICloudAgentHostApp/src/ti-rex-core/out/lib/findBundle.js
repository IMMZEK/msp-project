"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLatestBundle = void 0;
const versioning = require("./versioning");
/**
 * Find latest bundle/package within the given version range
 *
 * versionRange can be
 *  - a semver range or specific version: NOTE that all candidate bundle versions a force-converted
 *  to semver in this case
 *  - a 4-digit specific version
 */
async function findLatestBundle(id, versionRange, dbOverviews, dbPureBundles, dbResources) {
    const query = { id };
    let foundBundle;
    let db;
    for (db of [dbOverviews, dbPureBundles, dbResources]) {
        if (db) {
            const candidates = await db.findAsync(query);
            const latestVersion = versioning.maxSatisfying(candidates.map((candidate) => candidate.version), versionRange);
            foundBundle = candidates.find((candidate) => candidate.version === latestVersion);
        }
        if (foundBundle) {
            break;
        }
    }
    return foundBundle;
}
exports.findLatestBundle = findLatestBundle;
