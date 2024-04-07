"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExcludedExternalSites = exports.sortPackageGroups = exports.getLatestPackageGroups = exports.writeOverviewToSitemap = exports.writeResourcesToSitemap = exports.writePackageSitemap = exports.getDuplicateLinks = exports.createSitemap = void 0;
// native modules
const path = require("path");
// 3rd party
const fs = require("fs-extra");
// our modules
const appConfig_1 = require("./appConfig");
const vars_1 = require("./vars");
const sqldbImporter_1 = require("./dbImporter/sqldbImporter");
const dbBuilderUtils_1 = require("./dbBuilder/dbBuilderUtils");
const versioning = require("./versioning");
const public_id_helpers_1 = require("../frontend/component-helpers/public-id-helpers");
const path_helpers_1 = require("../shared/path-helpers");
const exploreUrl = `https://dev.ti.com/tirex/explore/`;
async function createSitemap(args) {
    console.time('duration');
    const dinfraPath = args.dinfra;
    const dconfigPath = args.dconfig;
    const appconfigPath = args.appconfig;
    const appconfigCmdlineOverrides = {
        dbTablePrefix: args.dbTablePrefix
    };
    console.log(`Start: ${new Date().toISOString()}`);
    console.log('Start creating sitemap');
    console.log(`Using dinfra at ${dinfraPath}`);
    console.log(`Using dconfig at ${dconfigPath}`);
    console.log(`Using appconfig at ${appconfigPath}`);
    const { dinfra } = await (0, appConfig_1.configureDinfraAndVars)(dinfraPath, dconfigPath, appconfigPath, appconfigCmdlineOverrides);
    dinfra.dlog.console();
    await fs.emptyDir(vars_1.Vars.SEO_PATH);
    const { packageGroupsDef } = await (0, sqldbImporter_1.discoverPackageGroups)(vars_1.Vars.DB_BASE_PATH);
    const latestPackageGroups = getLatestPackageGroups(packageGroupsDef);
    for (const packageGroup of latestPackageGroups) {
        for (const pkg of packageGroup.packages) {
            const resources = await readJsonIfExists(path.join(vars_1.Vars.DB_BASE_PATH, 'resources_full.db', pkg));
            if (resources) {
                const duplicateResourceLinks = getDuplicateLinks(resources);
                await writeDuplicatesToFile(duplicateResourceLinks, pkg, vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX);
            }
            const overviews = await readJsonIfExists(path.join(vars_1.Vars.DB_BASE_PATH, 'overviews_split.db', pkg));
            if (overviews) {
                const duplicateOverviewLinks = getDuplicateLinks(overviews);
                await writeDuplicatesToFile(duplicateOverviewLinks, pkg, vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX);
            }
        }
    }
    const sitemapIndex = fs.createWriteStream(path.join(vars_1.Vars.SEO_PATH, 'sitemap.xml'));
    sitemapIndex.write('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');
    const linkSummary = {
        total: 0,
        software: 0,
        ti: 0,
        external: 0
    };
    for (const packageGroup of latestPackageGroups) {
        for (const pkg of packageGroup.packages) {
            // not all packages have resources
            if ((await fs.pathExists(path.join(vars_1.Vars.DB_BASE_PATH, 'resources_full.db', pkg))) &&
                packageGroup.uid) {
                await writePackageSitemap(packageGroup.uid, encodeURIComponent(pkg), sitemapIndex, linkSummary);
            }
        }
    }
    sitemapIndex.write('</sitemapindex>\n');
    sitemapIndex.end();
    sitemapIndex.on('finish', () => {
        console.log('Finish generating sitemaps');
        console.log(`Total added links: ${linkSummary.total}; Total ti.com links: ${linkSummary.ti}; Total software-dl links: ${linkSummary.software}; Total external links: ${linkSummary.external}`);
        process.exit();
    });
}
exports.createSitemap = createSitemap;
function isOverview(e) {
    return e.resourceType === 'packageOverview' || e.resourceType === 'overview';
}
function getDuplicateLinks(items) {
    const resourceLinks = {};
    for (const item of items) {
        if (!isOverview(item) && item.doNotCount) {
            continue;
        }
        if (!item.linkType || !item.link || isExcludedExternalSites(item.linkType, item.link)) {
            continue;
        }
        item.link = path_helpers_1.PathHelpers.cleanFilePathWithQueryValues(item.link);
        if (!resourceLinks[item.link]) {
            resourceLinks[item.link] = {
                name: item.name,
                duplicatePaths: {},
                frontTrim: '',
                backTrim: ''
            };
        }
        const paths = item.fullPathsPublicIds.length !== 1 || item.fullPathsPublicIds[0] !== ''
            ? item.fullPathsPublicIds
            : [(0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(item.name)];
        paths.forEach((path, i) => {
            resourceLinks[item.link].duplicatePaths[path] = item.fullPaths[i].join('/');
        });
    }
    const duplicateLinksJSON = {};
    for (const link of Object.keys(resourceLinks)) {
        const linkObj = resourceLinks[link];
        if (Object.keys(linkObj.duplicatePaths).length > 1) {
            duplicateLinksJSON[link] = resourceLinks[link];
        }
    }
    return trimPaths(duplicateLinksJSON);
}
exports.getDuplicateLinks = getDuplicateLinks;
function trimPaths(duplicateLinksJSON) {
    for (const link of Object.keys(duplicateLinksJSON)) {
        const linkObj = duplicateLinksJSON[link];
        const keys = Object.keys(linkObj.duplicatePaths);
        let frontTrim = linkObj.duplicatePaths[keys[0]].split('/');
        let backTrim = linkObj.duplicatePaths[keys[0]].split('/');
        // Iterate through each of the links and get a prefix and postfix common to all of the fullpaths
        for (let keyIndex = 1; keyIndex < keys.length; keyIndex++) {
            const key = keys[keyIndex];
            const path = linkObj.duplicatePaths[key].split('/');
            let frontIndex = frontTrim.length - 1;
            let backIndex = backTrim.length - 1;
            // Get the prefix
            for (let depth = 0; depth <= path.length; depth++) {
                if (depth <= frontIndex && frontTrim.length !== 0) {
                    if (frontTrim[depth] !== path[depth]) {
                        frontTrim = path.slice(0, depth);
                        break;
                    }
                }
            }
            // Get the postfix
            for (let depth = 0; depth <= path.length; depth++) {
                if (depth <= backIndex && backTrim.length !== 0) {
                    if (backTrim[backTrim.length - depth - 1] !== path[path.length - depth - 1]) {
                        backTrim = path.slice(path.length - depth, path.length);
                        break;
                    }
                }
            }
            if (frontTrim.length + backTrim.length >= path.length) {
                backIndex === 0 ? frontIndex-- : backIndex--;
            }
        }
        linkObj.frontTrim = frontTrim.join('/');
        if (frontTrim.length) {
            linkObj.frontTrim += '/';
        }
        linkObj.backTrim = backTrim.join('/');
        if (backTrim.length) {
            linkObj.backTrim = '/' + backTrim;
        }
        for (const path of Object.keys(linkObj.duplicatePaths)) {
            const endIndex = linkObj.duplicatePaths[path].length - linkObj.backTrim.length;
            const trimmedPath = duplicateLinksJSON[link].duplicatePaths[path].substring(linkObj.frontTrim.length, endIndex);
            linkObj.duplicatePaths[path] = trimmedPath;
        }
    }
    return duplicateLinksJSON;
}
async function writeDuplicatesToFile(links, pkg, pathSuffix) {
    if (Object.keys(links).length > 0) {
        await fs.writeJSON(path.join(vars_1.Vars.SEO_PATH, `${pkg + pathSuffix}`), links, { spaces: 4 });
    }
}
async function writePackageSitemap(packageGroupUid, pkg, sitemapIndex, linkSummary) {
    const [publicIdForEncode] = packageGroupUid.split('__');
    const packageGroupPublicIdEncoded = (0, dbBuilderUtils_1.encodePackageGroupPublicId)(publicIdForEncode);
    const resources = await fs.readJson(path.join(vars_1.Vars.DB_BASE_PATH, 'resources_full.db', pkg));
    const overviews = await fs.readJson(path.join(vars_1.Vars.DB_BASE_PATH, 'overviews_split.db', pkg));
    const sitemapLocation = path.join(vars_1.Vars.SEO_PATH, `${pkg}_sitemap.xml`);
    const sitemap = fs.createWriteStream(sitemapLocation);
    sitemap.write(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`);
    const addedResources = await writeResourcesToSitemap(resources, path.join(vars_1.Vars.SEO_PATH, `${pkg + vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX}`), packageGroupPublicIdEncoded, pkg.split('__')[0], sitemap, linkSummary);
    const addedOverview = await writeOverviewToSitemap(overviews, path.join(vars_1.Vars.SEO_PATH, `${pkg + vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX}`), packageGroupPublicIdEncoded, pkg.split('__')[0], sitemap, linkSummary);
    sitemap.write('</urlset>\n');
    sitemap.end();
    if (addedOverview || addedResources) {
        sitemapIndex.write(`<sitemap><loc>${exploreUrl}${pkg}_sitemap.xml</loc></sitemap>\n`);
    }
    else {
        await fs.unlink(sitemapLocation);
    }
}
exports.writePackageSitemap = writePackageSitemap;
async function writeResourcesToSitemap(resources, duplicateLinkFilepath, packageGroupPublicIdEncoded, packagePublicId, writeBuffer, linkSummary) {
    let wroteData = false;
    const packageContainsDuplicates = await fs.pathExists(duplicateLinkFilepath);
    let duplicateLinks = {};
    if (packageContainsDuplicates) {
        duplicateLinks = await fs.readJSON(duplicateLinkFilepath);
    }
    for (const resource of resources) {
        // Other than sites hosted by www.ti.com and software-dl.ti.com, external inks are excluded for now.
        // Source code files (files that have the doNotCount property set to true) are excluded due to the
        // large number of duplicate sources.
        if (resource.doNotCount || isExcludedExternalSites(resource.linkType, resource.link)) {
            continue;
        }
        else if (!resource.linkType && !resource.shortDescription) {
            continue;
        }
        else if (packageContainsDuplicates) {
            if (duplicateLinks[resource.link]) {
                continue;
            }
        }
        if (resource.linkType === 'external') {
            if (resource.link.includes('www.ti.com')) {
                linkSummary.ti++;
                linkSummary.external++;
            }
            else if (resource.link.includes('software-dl.ti.com')) {
                linkSummary.software++;
                linkSummary.external++;
            }
        }
        const fullPathsPublicIds = resource.fullPathsPublicIds;
        for (const fullPathsPublicId of fullPathsPublicIds) {
            wroteData = true;
            const publicId = (0, public_id_helpers_1.getPublicIdFromMinimalIds)({
                nodePublicId: fullPathsPublicId,
                packagePublicId: resource.packageId,
                packageGroupPublicId: packageGroupPublicIdEncoded,
                packageGroupVersion: 'LATEST'
            });
            writeBuffer.write(`<url><loc>${exploreUrl}node?node=${publicId}</loc></url>\n`);
            linkSummary.total++;
        }
    }
    if (packageContainsDuplicates) {
        for (const link of Object.keys(duplicateLinks)) {
            if (link.includes('www.ti.com')) {
                linkSummary.ti++;
                linkSummary.external++;
            }
            else if (link.includes('software-dl.ti.com')) {
                linkSummary.software++;
                linkSummary.external++;
            }
            wroteData = true;
            const publicId = (0, public_id_helpers_1.getPublicIdFromMinimalIds)({
                nodePublicId: Object.keys(duplicateLinks[link].duplicatePaths)[0],
                packageGroupPublicId: packageGroupPublicIdEncoded,
                packageGroupVersion: 'LATEST',
                packagePublicId
            });
            writeBuffer.write(`<url><loc>${exploreUrl}node?node=${publicId}</loc></url>\n`);
            linkSummary.total++;
        }
    }
    return wroteData;
}
exports.writeResourcesToSitemap = writeResourcesToSitemap;
async function writeOverviewToSitemap(overviews, duplicateLinkFilepath, packageGroupPublicIdEncoded, packagePublicId, writeBuffer, linkSummary) {
    let wroteData = false;
    const packageContainsDuplicates = await fs.pathExists(duplicateLinkFilepath);
    let duplicateLinks = {};
    if (packageContainsDuplicates) {
        duplicateLinks = await fs.readJSON(duplicateLinkFilepath);
    }
    for (const overview of overviews) {
        if (duplicateLinks[overview.link]) {
            continue;
        }
        else if ((overview.link && overview.linkType === 'local') || overview.shortDescription) {
            const fullPathsPublicIds = overview.fullPathsPublicIds;
            if (fullPathsPublicIds.length !== 1 || fullPathsPublicIds[0] !== '') {
                for (const fullPathsPublicId of fullPathsPublicIds) {
                    wroteData = true;
                    const publicId = (0, public_id_helpers_1.getPublicIdFromMinimalIds)({
                        nodePublicId: fullPathsPublicId,
                        packageGroupPublicId: packageGroupPublicIdEncoded,
                        packageGroupVersion: 'LATEST',
                        packagePublicId
                    });
                    writeBuffer.write(`<url><loc>${exploreUrl}node?node=${publicId}</loc></url>\n`);
                    linkSummary.total++;
                }
            }
            else {
                const nodePublicId = (0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(overview.name);
                wroteData = true;
                const publicId = (0, public_id_helpers_1.getPublicIdFromMinimalIds)({
                    nodePublicId,
                    packageGroupPublicId: packageGroupPublicIdEncoded,
                    packageGroupVersion: 'LATEST',
                    packagePublicId
                });
                writeBuffer.write(`<url><loc>${exploreUrl}node?node=${publicId}</loc></url>\n`);
                linkSummary.total++;
            }
        }
    }
    return wroteData;
}
exports.writeOverviewToSitemap = writeOverviewToSitemap;
function getLatestPackageGroups(packageGroups) {
    const sortedPackageGroups = sortPackageGroups(packageGroups);
    // now we have blocks of package records with the same id and the latest version first
    const latestPackageGroups = [];
    for (const pkgGroup of sortedPackageGroups) {
        if (latestPackageGroups.length === 0) {
            latestPackageGroups.push(pkgGroup);
            continue;
        }
        const [pkgName] = pkgGroup.uid.split('__');
        if (pkgName !== latestPackageGroups[latestPackageGroups.length - 1].uid.split('__')[0]) {
            latestPackageGroups.push(pkgGroup);
        }
    }
    return latestPackageGroups;
}
exports.getLatestPackageGroups = getLatestPackageGroups;
function sortPackageGroups(packageGroups) {
    // sort by id first, then version to get blocks of package records with the same id and the
    // latest version first
    packageGroups.sort((pg1, pg2) => {
        const [pg1Id, pg1Version] = pg1.uid.split('__');
        const [pg2Id, pg2Version] = pg2.uid.split('__');
        if (pg1Id > pg2Id) {
            return 1;
        }
        else if (pg1Id < pg2Id) {
            return -1;
        }
        else {
            return versioning.rcompare(pg1Version, pg2Version);
        }
    });
    return packageGroups;
}
exports.sortPackageGroups = sortPackageGroups;
// We are going to exclude external links that are not hosted by
// www.ti.com and software-dl.ti.com, since dev.ti.com cannot claim ownership
// of non-TI content. All external links which are not hosted by www.ti.com
// and software-dl.ti.com send a 404 (not found) status to googlebot.
function isExcludedExternalSites(linkType, link) {
    if (linkType === 'external' &&
        !link.includes('www.ti.com') &&
        !link.includes('software-dl.ti.com')) {
        return true;
    }
    return false;
}
exports.isExcludedExternalSites = isExcludedExternalSites;
async function readJsonIfExists(filePath) {
    if (await fs.pathExists(filePath)) {
        return fs.readJson(filePath);
    }
    return null;
}
