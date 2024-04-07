import { Logger as DinfraLogger } from 'dinfra';
import logging = require('../utils/logging');
import { Vars } from './vars';
export interface RexObject {
    log: logging.Log;
    loggerManager: logging.LoggerManager;
    vars: Vars;
}
interface RexArgs {
    dinfraLogger: DinfraLogger;
    vars: Vars;
}
export declare function Rex(args: RexArgs): RexObject;
export declare function _getRex(): RexObject;
export {};
