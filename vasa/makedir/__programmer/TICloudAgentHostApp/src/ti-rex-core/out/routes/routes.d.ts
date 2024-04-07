import { AppConfig } from '../lib/appConfig';
import DinfraTypes = require('dinfra');
import { LinkType } from '../lib/dbBuilder/dbTypes';
import { RexObject } from '../lib/rex';
interface Args {
    rex: RexObject;
    dinfra: typeof DinfraTypes;
    config: AppConfig;
    desktopServer: any;
}
export declare function getRoutes({ rex, dinfra, config, desktopServer }: Args): import("express-serve-static-core").Router;
export declare function makeLink(link: string, linkType: LinkType): string;
export {};
