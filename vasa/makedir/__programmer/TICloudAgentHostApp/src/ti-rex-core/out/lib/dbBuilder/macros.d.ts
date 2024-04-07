/**
 * Refresh macros from macros.tirex.json files
 */
import { BaseLogger } from '../../utils/logging';
import * as preproc from './preproc';
/**
 * Refresh macros
 *
 */
export declare function refresh(packagePath: string, macros: {
    [key: string]: preproc.Macros;
}, contentBasePath: string, logger: BaseLogger): Promise<void>;
