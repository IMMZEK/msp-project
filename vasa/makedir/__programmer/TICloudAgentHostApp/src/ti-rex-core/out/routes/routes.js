'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLink = exports.getRoutes = void 0;
// 3rd party modules
const express = require("express");
const seo_1 = require("./seo");
const app_1 = require("./app");
const index_1 = require("./index");
const nodes_1 = require("./nodes");
const packages_1 = require("./packages");
const importProject_1 = require("./importProject");
const download_1 = require("./download");
const handoff_1 = require("./handoff");
const refresh_1 = require("./refresh");
const custom_download_1 = require("./custom-download");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes({ rex, dinfra, config, desktopServer }) {
    const routes = express.Router();
    routes.use((0, seo_1.getRoutes)(rex.log.userLogger, rex.vars));
    routes.use((0, app_1.getRoutes)(dinfra, config, desktopServer));
    routes.use((0, index_1.getRoutes)(dinfra));
    routes.use((0, nodes_1.getRoutes)());
    routes.use((0, packages_1.getRoutes)());
    routes.use((0, importProject_1.getRoutes)());
    routes.use((0, download_1.getRoutes)());
    routes.use((0, custom_download_1.getRoutes)(rex));
    // admin routes
    routes.use((0, handoff_1.getRoutes)(rex));
    routes.use((0, refresh_1.getRoutes)(rex.loggerManager));
    return routes;
}
exports.getRoutes = getRoutes;
function makeLink(link, linkType) {
    link = link.replace('http://', 'https://');
    return linkType === 'local' ? 'content/' + link : link; // TODO: use linkAPI for resource links
}
exports.makeLink = makeLink;
