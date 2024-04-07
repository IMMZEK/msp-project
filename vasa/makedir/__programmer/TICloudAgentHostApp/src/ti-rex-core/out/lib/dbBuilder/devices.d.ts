/**
 *
 * Device Database schema
 * ======================
 * @property {String} name (mandatory) (forced to uppercase, '/' converted to '_')
 * @property {String} parent (forced to uppercase, '/' converted to '_')
 * @property {String} description
 * @property {String} image
 * @property {Array} coreTypes: input only; flattened to coreTypes_name and coreTypes_id and then
 * deleted
 *
 * the following fields will be added by the DB builder:
 * @property {Array} ancestors
 * @property {Array} children
 * @property {Array} coreTypes_name
 * @property {Array} coreTypes_id
 */
import * as preproc from './preproc';
import * as utils from './dbBuilderUtils';
import { IRexDB } from '../../rexdb/lib/irexdb';
import { Device } from './dbTypes';
import { BaseLogger } from '../../utils/logging';
import { RefreshMessageLevel } from './dbBuilder';
interface DeviceDefinition extends Device {
    coreTypes?: {
        name: string;
        id: string;
    }[];
}
/**
 * Refresh device database
 *
 */
export declare function refresh(packagePath: string, dbDevices: IRexDB<Device>, packageMacros: preproc.Macros, contentBasePath: string, modulePrefix: string | null, logger: BaseLogger): Promise<RefreshMessageLevel>;
/**
 * Update device database: process device metadata and insert into device DB
 *
 */
export declare function _process(deviceList: DeviceDefinition[], dbDevices: IRexDB<Device>, packagePath: string, metadataDir: string, header: utils.VersionId, logger: BaseLogger): Promise<RefreshMessageLevel.NONE | RefreshMessageLevel.ERROR_CONTINUE>;
/**
 *
 * @param dbDevices
 * @param deviceIds
 */
export declare function getNames(dbDevices: IRexDB<Device>, deviceIds: string[], metaDataVer?: string): Promise<string[] | null>;
export {};
