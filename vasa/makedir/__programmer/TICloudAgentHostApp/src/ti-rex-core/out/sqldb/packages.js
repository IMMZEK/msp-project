"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Packages = void 0;
const types_1 = require("./db/types");
const _ = require("lodash");
const util_1 = require("../shared/util");
class Packages {
    db;
    mysql;
    constructor(db, dinfraLibPath) {
        this.db = db;
        this.mysql = require(dinfraLibPath + '/node_modules/mysql');
    }
    /**
     * Get package overviews
     *
     * @param packageCriteria - package uid, public id, or database id
     * @param groupStates - package group states to filter packages on, defaults to ['published']
     *
     * @returns packages matching the given criteria
     */
    async getOverviews(packageCriteria, groupStates = ['published']) {
        let sql = `select p.*, d.*, a.aliases ` +
            `from ${this.db.tables.packages} p ` +
            `left join ( ` +
            `  select p.id package_id, group_concat(distinct a.alias) aliases ` +
            `  from ${this.db.tables.packages} p ` +
            `    join ${this.db.tables.packageAliases} a on a.package_id = p.id ` +
            `  group by 1 ` +
            `) a on a.package_id = p.id ` +
            `left join ${this.db.tables.packageDepends} d on d.package_id = p.id `;
        const params = [];
        if (!_.isEmpty(groupStates)) {
            sql +=
                `join ${this.db.tables.contentSourcePackages} x on x.package_id = p.id ` +
                    `join ${this.db.tables.contentSources} s ` +
                    `  on s.id = x.content_source_id and s.state in (?) `;
            params.push(groupStates);
        }
        if (packageCriteria) {
            if ('packageUid' in packageCriteria) {
                sql += 'where p.uid = ? ';
                params.push(packageCriteria.packageUid);
            }
            else if ('packagePublicId' in packageCriteria) {
                sql += 'where p.public_id = ? ';
                params.push(packageCriteria.packagePublicId);
            }
            else if ('resourceId' in packageCriteria) {
                sql += `join ${this.db.tables.resources} r on r.package_id = p.id and r.id = ? `;
                params.push(packageCriteria.resourceId);
            }
        }
        // NOTE: Important that we group by id so that child dependency rows are grouped
        sql += 'order by p.ordinal, p.id';
        const rows = await this.db.simpleQuery('get-packages', sql, params, undefined, { nestTables: true });
        const packages = [];
        let pkg;
        for (const row of rows) {
            if (!pkg || pkg.id !== row.p.id) {
                // We have a new package row
                const dbPackage = (0, types_1.rowToPackage)(row.p);
                pkg = {
                    ...dbPackage,
                    aliases: row.a.aliases ? row.a.aliases.split(',') : [],
                    dependencies: [],
                    modules: [],
                    // flip null props to undefined
                    installPath: dbPackage.installPath || undefined,
                    installCommand: dbPackage.installCommand || undefined,
                    installSize: dbPackage.installSize || undefined,
                    subType: dbPackage.subType ? dbPackage.subType : undefined,
                    featureType: dbPackage.featureType ? dbPackage.featureType : undefined,
                    ccsVersion: dbPackage.ccsVersion || undefined,
                    ccsInstallLocation: dbPackage.ccsInstallLocation || undefined,
                    description: dbPackage.description || undefined,
                    image: dbPackage.image || undefined,
                    order: dbPackage.order !== null ? dbPackage.order : undefined,
                    metadataVersion: dbPackage.metadataVersion || undefined,
                    restrictions: dbPackage.restrictions || undefined,
                    license: dbPackage.license || undefined,
                    hideNodeDirPanel: dbPackage.hideNodeDirPanel,
                    hideByDefault: dbPackage.hideByDefault,
                    moduleOf: dbPackage.moduleOf || undefined,
                    moduleGroup: dbPackage.moduleGroup || undefined,
                    devices: dbPackage.devices || undefined,
                    devtools: dbPackage.devtools || undefined
                };
                packages.push(pkg);
            }
            if (row.d.id) {
                const dbPackageDepend = (0, types_1.rowToPackageDepend)(row.d);
                const packageDepend = {
                    refId: dbPackageDepend.refId || undefined,
                    versionRange: dbPackageDepend.versionRange,
                    require: dbPackageDepend.require || undefined,
                    message: dbPackageDepend.message || undefined
                };
                switch (dbPackageDepend.type) {
                    case 'g':
                        if (!pkg.moduleGroups) {
                            pkg.moduleGroups = [];
                        }
                        pkg.moduleGroups.push(packageDepend);
                        break;
                    case 'm':
                        pkg.modules.push(packageDepend);
                        break;
                    case 'd':
                        pkg.dependencies.push(packageDepend);
                        break;
                    default:
                        (0, util_1.assertNever)(dbPackageDepend.type);
                        throw new Error(`Unknown package dependency type: ${dbPackageDepend.type}`);
                }
            }
        }
        return packages;
    }
    /**
     * Get package groups and their content head node IDs
     *
     * @param criteria - Criteria by which to retrieve package groups
     *   criteria.packageGroupUids - Package Groups' versioned public ids; all if empty
     *   criteria.states - States to filter on; defaults to 'published'
     * @param latest - Retreive latest package group per versioned public id; otherwise all
     * @param includeContentNodeHeads - Include content node heads?
     * @returns packageGroups
     */
    async getPackageGroups(criteria, latest = true, includeNodeHeads = true) {
        // TODO: Refactor Manage.getContentSources() so that i can be used here
        // to retrieve everything except for the content head nodes.
        const fullCriteria = {
            states: ['published'],
            ...criteria
        };
        const rows = await this.db.simpleQuery('get-package-groups', 'select s.*' +
            (includeNodeHeads ? ', n.id node_id ' : ' ') +
            `from ${this.db.tables.contentSources} s ` +
            (includeNodeHeads
                ? `left join ${this.db.tables.nodes} n on n.content_source_id = s.id `
                : ' ') +
            'where s.type = "pkggrp" ' +
            (includeNodeHeads ? 'and n.is_content_subtree_head ' : ' ') +
            (_.isEmpty(fullCriteria.packageGroupUids)
                ? ''
                : 'and ( ' +
                    _.map(fullCriteria.packageGroupUids, (uid) => {
                        const { publicId, version } = (0, types_1.stringToVPublicId)(uid);
                        return ('(' +
                            `s.public_id = ${this.mysql.escape(publicId)} and ` +
                            `s.version = ${this.mysql.escape(version)}` +
                            ')');
                    }).join(' or ') +
                    ' ) ') +
            `and s.state in ( ${this.mysql.escape(fullCriteria.states)} ) ` +
            `order by public_id, version, created desc`);
        // Build package groups and their content head node ids from result set.
        const packageGroups = [];
        let packageGroup;
        for (const row of rows) {
            if (!packageGroup || packageGroup.id !== row.id) {
                // We have a new package groups in the results, add it
                packageGroup = {
                    ...dbPackageGroupToPackageGroup((0, types_1.rowToPackageGroup)(row)),
                    headNodeIds: includeNodeHeads ? [] : undefined,
                    packageIds: []
                };
                packageGroups.push(packageGroup);
            }
            if (includeNodeHeads) {
                // Add the content head node id
                packageGroup.headNodeIds.push(row.node_id);
            }
        }
        if (_.isEmpty(packageGroups)) {
            return [];
        }
        else {
            const packageGroupIds = packageGroups.map((group) => group.id);
            const rows = await this.db.simpleQuery('get-package-group-packages', `select content_source_id, package_id ` +
                `from ${this.db.tables.contentSourcePackages} ` +
                `where content_source_id in ( ? ) ` +
                `order by content_source_id, package_id`, [packageGroupIds]);
            // Add package id lists to package groups
            let packageGroup;
            for (const row of rows) {
                if (!packageGroup || packageGroup.id !== row.content_source_id) {
                    // First or new package group, so get it
                    packageGroup = packageGroups.find((g) => g.id === row.content_source_id);
                }
                // Add package id to the package group's package id list
                packageGroup.packageIds.push(row.package_id);
            }
            if (latest) {
                // Remove all package groups with the same versioned public id
                // except for the latest
                // This is dependent on the query result set being ordered on
                // public_id, version, and created, in that order, with
                // created in descending order.
                const latestPackageGroups = [];
                let currentPackageGroup;
                for (const packageGroup of packageGroups) {
                    if (currentPackageGroup === undefined ||
                        currentPackageGroup.publicId !== packageGroup.publicId ||
                        currentPackageGroup.version !== packageGroup.version) {
                        // First or new versioned public id
                        latestPackageGroups.push(packageGroup);
                        currentPackageGroup = packageGroup;
                    }
                }
                return latestPackageGroups;
            }
            else {
                // Otherwise return all of the package groups
                return packageGroups;
            }
        }
    }
}
exports.Packages = Packages;
function dbPackageGroupToPackageGroup(dbPackageGroup) {
    return {
        ...dbPackageGroup,
        // flip null props to undefined
        mainPackageId: dbPackageGroup.mainPackageId || undefined,
        filterDevSetId: dbPackageGroup.filterDevSetId || undefined
    };
}
