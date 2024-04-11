/**
 *
 * Devtool Database schema
 * ======================
 * @property {String} name (mandatory)
 * @property {String} description
 * @property {String} descriptionLocation: path to html file containing description
 * @property {String} image
 * @property {Array} devices: list of devices that can be used with this devtool
 * @property {Array} connections: list of names of the connection XML files, as it appears in the
 *                   <ccs>\ccsv6\ccs_base\common\targetdb\connections\ directory. The first entry
 *                   will be used as the default.
 * @property {Array} energiaBoards
 *      @property {String} id
 *      @property {String} description
 */
import * as preproc from './preproc';
import * as utils from './dbBuilderUtils';
import { IRexDB } from '../../rexdb/lib/irexdb';
import { Device, Devtool } from './dbTypes';
import { BaseLogger } from '../../utils/logging';
import { RefreshMessageLevel } from './dbBuilder';
/**
 * Refresh devtools database - IMPORTANT: Any main files MUST BE parsed FIRST, followed by the aux
 * files.
 *
 * @param mainOrAux: main devtool tree files add new records whereas aux files only can update
 * existing records with new fields.
 *  Aux files restrictions:
 *      - an aux file cannot add records
 *      - an aux file cannot contain fields that are already specified in another main or aux json
 *        file.
 *  Any entry and/or field that doesn’t conform will be rejected.
 * @param packagePath
 * @param dbDevtools - the dev tools database.
 * @param dbDevices
 * @param packageMacros
 * @param contentBasePath
 * @param logger
 */
export declare function refresh(mainOrAux: 'main' | 'aux', packagePath: string, dbDevtools: IRexDB<Devtool>, dbDevices: IRexDB<Device>, packageMacros: preproc.Macros, contentBasePath: string, modulePrefix: string | null, logger: BaseLogger): Promise<RefreshMessageLevel>;
export declare function _process(devtoolsFile: string, devtoolList: Devtool[], packagePath: string, metadataDir: string, dbDevtools: IRexDB<Devtool>, dbDevices: IRexDB<Device>, mainOrAux: 'main' | 'aux', header: utils.VersionId, contentBasePath: string, logger: BaseLogger): Promise<RefreshMessageLevel>;
export declare function getNames(dbDevtool: IRexDB<Devtool>, devtoolIds: string[], metaDataVer: string): Promise<string[]>;
