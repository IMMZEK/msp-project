"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContentMap = void 0;
const fs = require("fs-extra");
const path = require("path");
const appConfig_1 = require("./appConfig");
const vars_1 = require("./vars");
const sqldbImporter_1 = require("./dbImporter/sqldbImporter");
const dbBuilderUtils_1 = require("./dbBuilder/dbBuilderUtils");
const public_id_helpers_1 = require("../frontend/component-helpers/public-id-helpers");
/**
 * Maps /tirex/content routes that were indexed by Google in the past (but shouldn't have been) to the
 * /tirex/explore/node in the latest package group. If the node public id doesn't exist anymore it will
 * result in a 404 which is intentional. We could have mapped it to the older version where it still
 * exists but users should not be able to access out-of-date- resources through Google. Also, Google
 * somehow managed to index links under tirex/content that don't belong to any resources. These links are
 * mapped to the welcome page tirex/explore.
 *
 * NOTE: This is a one-time generation of the map file to re-route content links that were
 * mistakenly allowed to be crawled by Google in the past. Further crawling has been blocked now in robots.txt.
 * So ideally this script will never need to be run again... As the map file is static and will never
 * change it is stored in ti-rex-core/config instead of ccs-cloud-storage.
 */
async function createContentMap(args) {
    const dinfraPath = args.dinfra;
    const dconfigPath = args.dconfig;
    const appconfigPath = args.appconfig;
    console.log(`Start: ${new Date().toISOString()}`);
    console.log('Start creating content map');
    console.log(`Using dinfra at ${dinfraPath}`);
    console.log(`Using dconfig at ${dconfigPath}`);
    console.log(`Using appconfig at ${appconfigPath}`);
    const { dinfra } = await (0, appConfig_1.configureDinfraAndVars)(dinfraPath, dconfigPath, appconfigPath);
    dinfra.dlog.console();
    // content_roues.json was obtained as follows: Go to the following link, click the execute
    // button and save the resulting JSON
    // https://developers.google.com/webmaster-tools/search-console-api-original/v3/searchanalytics/query?apix_params=%7B%22siteUrl%22%3A%22dev.ti.com%2Ftirex%22%2C%22resource%22%3A%7B%22startDate%22%3A%222020-01-01%22%2C%22endDate%22%3A%222020-04-07%22%2C%22dimensions%22%3A%5B%22page%22%5D%2C%22dimensionFilterGroups%22%3A%5B%7B%22filters%22%3A%5B%7B%22dimension%22%3A%22page%22%2C%22operator%22%3A%22contains%22%2C%22expression%22%3A%22content%2F%22%7D%5D%7D%5D%2C%22rowLimit%22%3A25000%7D%7D
    const inputFile = path.join(vars_1.Vars.PROJECT_ROOT, 'config/seo/content_routes.json');
    const outputFile = path.join(vars_1.Vars.PROJECT_ROOT, 'config/seo/ContentToExploreRouteMap.json');
    const contentRoutesJSON = await fs.readJSON(inputFile);
    const contentHostname = RegExp('http://dev.ti.com/tirex/.*content/');
    let contentLinkToUrlMap = {};
    contentRoutesJSON.rows.forEach((row) => {
        const link = row.keys[0].replace(contentHostname, '');
        // set the default to the tirex welcome page for /content links are not in the DB at all
        // but that Google still managed to crawl
        contentLinkToUrlMap[link] = '/explore';
    });
    contentLinkToUrlMap = await fillInLatestUrlForContentLinks(contentLinkToUrlMap);
    await fs.writeFile(outputFile, JSON.stringify(contentLinkToUrlMap, null, 2));
    process.exit();
}
exports.createContentMap = createContentMap;
async function fillInLatestUrlForContentLinks(contentLinkToUrlMap) {
    const { packageGroupsDef } = await (0, sqldbImporter_1.discoverPackageGroups)(vars_1.Vars.DB_BASE_PATH);
    const mapResourceLinksToLatestUrl = (records, encodedPkgGroupUidLatest) => {
        for (const record of records) {
            if (record.link && contentLinkToUrlMap[record.link]) {
                const publicId = (0, public_id_helpers_1.getPublicIdFromMinimalIds)({
                    nodePublicId: record.fullPathsPublicIds[0],
                    packagePublicId: record.packageId,
                    packageGroupPublicId: encodedPkgGroupUidLatest.split('__')[0],
                    packageGroupVersion: 'LATEST'
                });
                contentLinkToUrlMap[record.link] = `/explore/node?node=${publicId}`;
            }
        }
    };
    for (const packageGroup of packageGroupsDef) {
        const [pgId] = packageGroup.uid.split('__');
        // force all content links to map to the latest version of the package group
        const encodedPgUidLatest = `${(0, dbBuilderUtils_1.encodePackageGroupPublicId)(pgId)}__LATEST`;
        for (const pkg of packageGroup.packages) {
            const resourcesPath = path.join(vars_1.Vars.DB_BASE_PATH, 'resources_full.db', pkg);
            const overviewsPath = path.join(vars_1.Vars.DB_BASE_PATH, 'overviews_split.db', pkg);
            if (await fs.pathExists(resourcesPath)) {
                mapResourceLinksToLatestUrl(await fs.readJSON(resourcesPath), encodedPgUidLatest);
            }
            if (await fs.pathExists(overviewsPath)) {
                mapResourceLinksToLatestUrl(await fs.readJson(overviewsPath), encodedPgUidLatest);
            }
        }
    }
    return contentLinkToUrlMap;
}
