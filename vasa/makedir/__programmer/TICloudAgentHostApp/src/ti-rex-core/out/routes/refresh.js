"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = void 0;
const express_1 = require("express");
const logging_1 = require("../utils/logging");
const vars_1 = require("../lib/vars");
const refresh_1 = require("../lib/dbBuilder/refresh");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes(loggerManager) {
    const routes = (0, express_1.Router)();
    if (vars_1.Vars.ALLOW_REFRESH_FROM_WEB === 'true') {
        routes.get('/api/refresh', refresh(loggerManager));
    }
    return routes;
}
exports.getRoutes = getRoutes;
function refreshPrepare(loggerManager, res) {
    const log = new logging_1.Log({
        userLogger: loggerManager.createLogger('refreshUser'),
        debugLogger: loggerManager.createLogger('refreshDebug')
    });
    const typeColors = {
        info: 'black',
        warning: '#FCD116',
        error: 'red',
        critical: 'red',
        emergency: 'red'
    };
    log.userLogger.on('data', (message) => {
        const { data, type } = JSON.parse(message.toString());
        const msg = `<b style="color: ${typeColors[type] || 'black'}">[${type.toUpperCase()}] </b> <p style="display:inline">${data} </p><br>`;
        res.write(msg);
    });
    return { log, typeColors };
}
function refresh(loggerManager) {
    return (req, res) => {
        const prep = refreshPrepare(loggerManager, res);
        if (!req.query.p) {
            res.send('Usage: <br> ' +
                'api/refresh?p=all - refresh all packages listed in default.json <br> ');
        }
        else if (req.query.p === 'all') {
            const refreshManager = new refresh_1.RefreshManager(vars_1.Vars.DB_BASE_PATH, prep.log.userLogger);
            const validationType = 'refresh';
            refreshManager.refreshUsingConfigFileCb(vars_1.Vars.CONTENT_PACKAGES_CONFIG, vars_1.Vars.CONTENT_BASE_PATH, validationType, (err) => {
                if (err) {
                    res.send(err);
                    prep.log.userLogger.error(err);
                }
                prep.log.closeLoggers();
                res.end();
            });
        }
        else {
            // not supporting individual refresh over web
            res.sendStatus(404);
        }
    };
}
