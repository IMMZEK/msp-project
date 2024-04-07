"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resources = void 0;
const types_1 = require("./db/types");
const _ = require("lodash");
class Resources {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Get node's resource
     *
     * @param nodeId - the node's id
     * @returns resource
     */
    async getOnNode(nodeId) {
        const rows = await this.db.simpleQuery('get-node-resource', `select r.* ` +
            `from ${this.db.tables.resources} r ` +
            `join ${this.db.tables.nodes} n on r.id = n.resource_id ` +
            `where n.id = ?`, [nodeId]);
        return _.isEmpty(rows) ? null : dbResourceToResource((0, types_1.rowToResource)(rows[0]));
    }
    /**
     * Get resource's parent resource
     *
     * @param resourceId - the resource's id
     * @returns parent resource
     */
    async getParent(resourceId) {
        const rows = await this.db.simpleQuery('get-resource-parent', `select r2.* ` +
            `from ${this.db.tables.resources} r1 ` +
            `  join ${this.db.tables.resources} r2 ` +
            `    on r2.id = r1.parent_id ` +
            `where r1.id = ?`, [resourceId]);
        return _.isEmpty(rows) ? null : dbResourceToResource((0, types_1.rowToResource)(rows[0]));
    }
    /**
     * Get resource's child resources
     *
     * @param resourceId - the id of the resource
     * @returns child resources
     */
    async getChildren(resourceId) {
        return _.map(await this.db.simpleQuery('get-resource-children', 'select r2.* ' +
            `from ${this.db.tables.resources} r1 ` +
            `join ${this.db.tables.resources} r2 on r2.parent_id = r1.id ` +
            'where r1.id = ?', [resourceId]), (row) => dbResourceToResource((0, types_1.rowToResource)(row)));
    }
    /**
     * Get all overviews belonging to a given package
     *
     * @param packageId - the package's id
     * @returns overviews
     */
    async getOverviewsOnPackage(packageId) {
        return _.map(await this.db.simpleQuery('get-resource-overviews-on-package', `select r.* ` +
            `from ${this.db.tables.resources} r ` +
            `where ` +
            `    r.type = "overview" ` +
            `    and r.package_id = ? `, [packageId]), (row) => dbResourceToResource((0, types_1.rowToResource)(row)));
    }
}
exports.Resources = Resources;
function dbResourceToResource(dbResource) {
    const resource = {
        ...dbResource,
        // flip null props to undefined
        parentId: dbResource.parentId || undefined,
        sort: dbResource.sort,
        implicitOrder: dbResource.implicitOrder !== null ? dbResource.implicitOrder : undefined,
        customOrder: dbResource.customOrder !== null ? dbResource.customOrder : undefined,
        description: dbResource.description || undefined,
        shortDescription: dbResource.shortDescription || undefined,
        viewLimitations: dbResource.viewLimitations || undefined,
        projectRestriction: dbResource.projectRestriction || undefined,
        kernel: dbResource.kernels || undefined,
        compiler: dbResource.compilers || undefined,
        overrideProjectSpecDeviceId: dbResource.overrideProjectSpecDeviceId || undefined,
        link: dbResource.link || undefined,
        linkType: dbResource.linkType || undefined,
        icon: dbResource.icon || undefined,
        fileType: dbResource.fileType || undefined,
        hasIncludes: dbResource.hasIncludes !== null ? dbResource.hasIncludes : undefined,
        isIncludedFile: dbResource.isIncludedFile !== null ? dbResource.isIncludedFile : undefined,
        image: dbResource.image || undefined,
        root0: dbResource.root0 || undefined,
        importProjectCCS: dbResource.importProjectCCS || undefined,
        createProjectCCS: dbResource.createProjectCCS || undefined,
        linkForDownload: dbResource.linkForDownload || undefined
    };
    // delete resource.packageId;
    delete resource.isCounted;
    return resource;
}
