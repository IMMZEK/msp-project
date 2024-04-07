import { Response } from 'express';
import { Vars } from '../lib/vars';
import { RequestSqldb } from './executeRoute';
import { Logger } from '../utils/logging';
export declare function getRoutes(logger: Logger, vars: Vars): import("express-serve-static-core").Router;
export declare function redirectContentRoutes(logger: Logger): (req: RequestSqldb, res: Response, next: () => void) => Promise<void>;
