"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Devtools = void 0;
const types_1 = require("./db/types");
class Devtools {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Get all devtools
     *
     * @returns devtools
     */
    async getAll() {
        // TODO: Add content view (i.e. package-group set) parameter that would limit the devtools
        // returned to those applicable to the user's content view's package groups? If not, then
        // will likely need to limit it to all "active" package-sets
        return (await this.db.simpleQuery('get-devtools', `select d.*, group_concat(distinct device.public_id) devices ` +
            `from ${this.db.tables.contentSources} cs ` +
            `join ${this.db.tables.devtools} d ` +
            `  on d.devset_id = cs.id ` +
            `join ( ` +
            `  select d.public_id, max(cs.priority) max_priority ` +
            `    from ${this.db.tables.contentSources} cs ` +
            `      join ${this.db.tables.devtools} d ` +
            `        on d.devset_id = cs.id ` +
            `    where cs.type = 'devset' ` +
            `      and cs.state = 'published' ` +
            `    group by d.public_id ` +
            `  ) top ` +
            `    on top.public_id = d.public_id ` +
            `      and top.max_priority = cs.priority ` +
            `left join ${this.db.tables.devtoolDevices} x on x.devtool_id = d.id ` +
            `left join ${this.db.tables.devices} device on device.id = x.device_id ` +
            `where cs.state = 'published' ` +
            `group by d.id`)).map((row) => dbDevtoolToDevtool((0, types_1.rowToDevtool)(row), row.devices));
    }
    /**
     * Get IDs of devtools supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns devtool ids
     */
    async getIdsOnResource(resourceId) {
        return (await this.db.simpleQuery('get-devtools-on-resource', `select dt.id ` +
            `from ${this.db.tables.resources} r ` +
            `  join ${this.db.tables.resourceDevtools} x ` +
            `    on x.resource_id = r.id ` +
            `  join ${this.db.tables.devtools} dt ` +
            `    on dt.id = x.devtool_id ` +
            `where r.id = ? `, [resourceId])).map((row) => row.id);
    }
    /**
     * Get Names of devtools supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns devtool names
     */
    async getNamesOnResource(resourceId) {
        return (await this.db.simpleQuery('get-devtoolnames-on-resource', `select dt.name ` +
            `from ${this.db.tables.resources} r ` +
            `  join ${this.db.tables.resourceDevtools} x ` +
            `    on x.resource_id = r.id ` +
            `  join ${this.db.tables.devtools} dt ` +
            `    on dt.id = x.devtool_id ` +
            `where r.id = ? `, [resourceId])).map((row) => row.name);
    }
}
exports.Devtools = Devtools;
function dbDevtoolToDevtool(devtool, devices) {
    return {
        ...devtool,
        _id: devtool.id.toString(),
        // flip null props to undefined
        overviewPublicId: devtool.overviewPublicId || undefined,
        description: devtool.description || undefined,
        buyLink: devtool.buyLink || undefined,
        image: devtool.image || undefined,
        toolsPage: devtool.toolsPage || undefined,
        connections: devtool.connections || undefined,
        energiaBoards: devtool.energiaBoards || undefined,
        devices: devices ? devices.split(',') : []
    };
}
