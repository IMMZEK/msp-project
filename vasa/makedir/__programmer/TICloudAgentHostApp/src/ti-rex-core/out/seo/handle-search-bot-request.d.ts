import { Response } from 'express';
import { Vars } from '../lib/vars';
import { RequestSqldb } from '../routes/executeRoute';
import { Logger } from '../utils/logging';
export declare function handleSearchBotRequest(logger: Logger, vars: Vars): (req: RequestSqldb, res: Response, next: () => void) => Promise<void>;
