"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = void 0;
// 3rd party
const express_1 = require("express");
const util_1 = require("util");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs-extra");
// our modules
const vars_1 = require("../lib/vars");
const promise_utils_1 = require("../utils/promise-utils");
const executeRoute_1 = require("./executeRoute");
const nodes_1 = require("./nodes");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const ejsRenderFile = (0, util_1.promisify)(ejs.renderFile);
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes(dinfra) {
    const routes = (0, express_1.Router)();
    // get
    routes.get('/', (req, res) => {
        getIndexFile(req, res, dinfra);
    });
    routes.get('index.html', (req, res) => {
        getIndexFile(req, res, dinfra);
    });
    return routes;
}
exports.getRoutes = getRoutes;
function getIndexFile(req, res, dinfra) {
    (0, promise_utils_1.shouldNeverThrow)(async () => {
        try {
            const sqldb = await (0, executeRoute_1.getSqldbFromRequest)(req, dinfra);
            const rootNodeDbId = await (0, nodes_1.getRootNode)(sqldb);
            const softwareNodePublicId = (0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(vars_1.Vars.TOP_CATEGORY.software.text);
            const { version } = (await fs.readJSON(path.join(vars_1.Vars.PROJECT_ROOT, 'package.json')));
            const serverConfig = {
                role: vars_1.Vars.ROLE,
                rootNodeDbId,
                softwareNodePublicId,
                version,
                offline: false
            };
            const theiaPort = req.query.theiaPort;
            const templatePath = path.join(vars_1.Vars.PROJECT_ROOT, 'templates', 'index.ejs');
            const result = await ejsRenderFile(templatePath, {
                serverConfig: JSON.stringify(serverConfig),
                theiaPort
            });
            res.send(result);
        }
        catch (err) {
            (0, executeRoute_1.sendError)(res, err);
        }
    });
}
