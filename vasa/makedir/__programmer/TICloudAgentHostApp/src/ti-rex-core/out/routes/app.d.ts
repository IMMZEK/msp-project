import { Request, Response } from 'express';
import { AppConfig } from '../lib/appConfig';
import DinfraTypes = require('dinfra');
export declare function getRoutes(dinfra: typeof DinfraTypes, config: AppConfig, desktopServer: any): import("express-serve-static-core").Router;
export declare function components(config: AppConfig): (req: Request, res: Response) => void;
