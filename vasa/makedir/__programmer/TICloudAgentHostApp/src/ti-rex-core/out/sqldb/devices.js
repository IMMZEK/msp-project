"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Devices = void 0;
const types_1 = require("./db/types");
const _ = require("lodash");
class Devices {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Get all devices
     *
     * @returns all devices
     */
    async getAll() {
        // TODO: Add content view (i.e. package-group set) parameter that would limit the devices
        // returned to those applicable to the user's content view's package groups? If not, then
        // will likely need to limit it to all "active" package-sets
        // Return the latest version of each device, with "latest" determined by the priority of
        // each device's devset.
        // TODO!: Convert this and all SQL statements to a single template, and instead strip out
        // newlines and excessive whitespace before passing on to mysql and logger
        const devices = (await this.db.simpleQuery('get-devices', `select d.* ` +
            `from ${this.db.tables.contentSources} cs ` +
            `  join ${this.db.tables.devices} d on d.devset_id = cs.id ` +
            `  join ( ` +
            `    select d.public_id, max(cs.priority) max_priority ` +
            `      from ${this.db.tables.contentSources} cs ` +
            `        join ${this.db.tables.devices} d ` +
            `          on d.devset_id = cs.id ` +
            `      where cs.type = 'devset' ` +
            `        and cs.state = 'published' ` +
            `      group by d.public_id ` +
            `    ) top ` +
            `      on top.public_id = d.public_id ` +
            `        and top.max_priority = cs.priority ` +
            `where cs.state = 'published' `)).map((row) => dbDeviceToDevice((0, types_1.rowToDevice)(row)));
        // Create map of ids to devices for ancestor lookup
        const deviceMap = _.keyBy(devices, (device) => device.id);
        // Add ancestor IDs to each device
        for (const device of devices) {
            device.ancestorIds = [];
            // Iterate upwards over the device's ancestors, pushing
            // their IDs to the device's ancestors ID array
            let parentId = device.parentId;
            while (parentId != null) {
                device.ancestorIds.push(parentId);
                parentId = deviceMap[parentId].parentId;
            }
        }
        return devices;
    }
    /**
     * Get IDs of devices supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns device ids
     */
    async getIdsOnResource(resourceId) {
        return (await this.db.simpleQuery('get-devices-on-resource', `select d.id ` +
            `from ${this.db.tables.resources} r ` +
            `  join ${this.db.tables.resourceDevices} x ` +
            `    on x.resource_id = r.id ` +
            `  join ${this.db.tables.devices} d on d.id = x.device_id ` +
            `where r.id = ? `, [resourceId])).map((row) => row.id);
    }
    /**
     * Get names of devices supported by the given resource
     *
     * @param resourceId - the resource's id
     * @returns device names
     */
    async getNamesOnResource(resourceId) {
        return (await this.db.simpleQuery('get-devicenames-on-resource', `select d.name ` +
            `from ${this.db.tables.resources} r ` +
            `  join ${this.db.tables.resourceDevices} x ` +
            `    on x.resource_id = r.id ` +
            `  join ${this.db.tables.devices} d on d.id = x.device_id ` +
            `where r.id = ? `, [resourceId])).map((row) => row.name);
    }
    /**
     * Get IDs of devices supported by the given devtool
     *
     * @param devtoolId - the devtool's id
     * @returns device ids
     */
    async getIdsOnDevtool(devtoolId) {
        return (await this.db.simpleQuery('get-devices-on-devtool', `select d.id ` +
            `from ${this.db.tables.devtools} dt ` +
            `  join ${this.db.tables.devtoolDevices} x ` +
            `    on x.devtool_id = dt.id ` +
            `  join ${this.db.tables.devices} d on d.id = x.device_id ` +
            `where dt.id = ? `, [devtoolId])).map((row) => row.id);
    }
}
exports.Devices = Devices;
function dbDeviceToDevice(dbDevice) {
    // Note that some BUs use 'devices' (converted to 'device' on import)
    // TODO!! This needs to be enforced on db-import or refresh and the type itself moved
    const type = dbDevice.type !== 'family' && dbDevice.type !== 'subfamily' && dbDevice.type !== 'device'
        ? 'device'
        : dbDevice.type;
    return {
        ...dbDevice,
        _id: dbDevice.id.toString(),
        type,
        // flip null props to undefined
        parentId: dbDevice.parentId || undefined,
        overviewPublicId: dbDevice.overviewPublicId || undefined,
        description: dbDevice.description || undefined,
        image: dbDevice.image || undefined
    };
}
