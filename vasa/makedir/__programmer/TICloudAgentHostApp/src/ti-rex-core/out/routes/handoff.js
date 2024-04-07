"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = exports.getHandoffManagerForTesting = void 0;
// 3rd party modules
const express_1 = require("express");
const multerDef = require("multer");
const fs = require("fs-extra");
// tslint:disable-next-line:no-submodule-imports
const uuid = require("uuid/v4");
// our modules
const handoff_manager_1 = require("../handoff/handoff-manager");
const add_package_1 = require("../scripts-lib/handoff-client/add-package");
let handoffManager;
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getHandoffManagerForTesting() {
    return handoffManager;
}
exports.getHandoffManagerForTesting = getHandoffManagerForTesting;
function getRoutes(rex) {
    const routes = (0, express_1.Router)();
    if (rex.vars.handoffServer) {
        const multer = multerDef({ dest: rex.vars.zipsFolder });
        handoffManager = new handoff_manager_1.HandoffManager({
            loggerManager: rex.loggerManager,
            defaultLog: rex.log,
            vars: rex.vars
        });
        const logger = rex.log.debugLogger;
        // Primary APIs
        routes.post(`/${"api/add-package" /* API.POST_ADD_PACKAGE */}`, multer.any(), (req, res) => addPackage(req, res, handoffManager, logger));
        routes.delete(`/${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}`, (req, res) => removePackage(req, res, handoffManager, logger));
        // Maintenance mode APIs
        routes.get(`/${"api/get-maintenance-mode" /* API.GET_GET_MAINTENACE_MODE */}`, (req, res) => getMaintenanceMode(req, res, handoffManager));
        routes.get(`/${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}`, (req, res) => maintenanceMode(req, res, handoffManager, logger));
        // Admin / server maintenance APIs
        routes.get(`/${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`, (_req, res) => syncPackages(res, handoffManager, logger));
        routes.get(`/${"api/cleanup-packages" /* API.GET_CLEANUP_PACKAGES */}`, (_req, res) => cleanupPackages(res, handoffManager, logger));
    }
    return routes;
}
exports.getRoutes = getRoutes;
// Primary APIs
function addPackage(req, res, handoffManager, logger) {
    try {
        const submissionId = uuid();
        const assetUploads = (req.files || []).map(({ path, originalname }) => {
            return { path, originalname };
        });
        let error = null;
        if (!req.body.version) {
            const msg = 'Bad upload, ensure you have the latest handoff script';
            error = new Error(msg);
        }
        let entries = null;
        if (req.body.entries && !error) {
            try {
                entries = JSON.parse(req.body.entries);
            }
            catch (err) {
                error = new Error('Bad upload, ensure you have the latest handoff script');
            }
            if (entries) {
                error = (0, add_package_1.validateEntrySchema)(entries);
            }
        }
        let success = false;
        if (error) {
            res.status(400);
            res.send(error.message);
        }
        else if (!handoffManager.isAcceptingSubmissions()) {
            res.status(503);
            res.send('Tirex is in maintenance mode; please try again later');
        }
        else if (!entries) {
            throw new Error(`No entries`);
        }
        else {
            success = true;
            handoffManager
                .addPackage({
                serverHost: req.get('host') || null,
                assetUploads,
                submissionId,
                entries
            })
                .catch((e) => handleError(e, logger));
            res.send({ submissionId });
        }
        if (!success) {
            Promise.all(assetUploads.map((item) => fs.remove(item.path))).catch((e) => handleError(e, logger));
        }
    }
    catch (e) {
        handleError(e, logger);
    }
}
function removePackage(req, res, handoffManager, logger) {
    try {
        if (!req.query.id || !req.query.version) {
            res.status(400);
            res.send('Missing required field');
        }
        else if (!handoffManager.isAcceptingSubmissions()) {
            res.status(503);
            res.send('Tirex is in maintenance mode; please try again later');
        }
        else {
            const submissionId = uuid();
            const { id = '', version = '', email = '' } = req.query;
            handoffManager
                .removePackage({
                packageInfo: { id, version: version === '*' ? 'all' : version },
                submissionId,
                email
            })
                .catch((e) => handleError(e, logger));
            res.send({ submissionId });
        }
    }
    catch (e) {
        handleError(e, logger);
    }
}
// Maintenance mode APIs
function getMaintenanceMode(_req, res, handoffManager) {
    if (handoffManager.isAcceptingSubmissions()) {
        res.send('off');
    }
    else {
        res.send('on');
    }
}
async function maintenanceMode(req, res, handoffManager, logger) {
    if (!req.query.switch) {
        const msg = 'switch required';
        logMessage('info', msg, logger);
        res.status(400);
        res.send(msg);
    }
    else {
        const direction = req.query.switch;
        try {
            if (direction === 'on') {
                await maintanceModeOn(req, res, handoffManager, logger);
            }
            else {
                await maintanceModeOff(req, res, handoffManager, logger);
            }
        }
        catch (e) {
            handleError(e, logger);
            res.status(500);
            res.send(e);
        }
    }
}
// Admin / server maintenance APIs
async function syncPackages(res, handoffManager, logger) {
    try {
        const result = await handoffManager.syncPackages();
        res.status(200).send(result).end();
    }
    catch (e) {
        handleError(e, logger);
        res.status(500);
        res.send(e);
    }
}
async function cleanupPackages(res, handoffManager, logger) {
    try {
        await handoffManager.cleanupStagedPackages();
        res.status(200).end();
    }
    catch (e) {
        handleError(e, logger);
        res.status(500);
        res.send(e);
    }
}
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
function logMessage(type, message, logger) {
    logger[type](message, ['handoff']);
}
function handleError(err, logger) {
    if (err) {
        logMessage('error', typeof err === 'string' ? err : err.stack || '', logger);
    }
}
async function maintanceModeOn(_req, res, handoffManager, logger) {
    const state = handoffManager.getHandoffManagerState();
    if (state === "teardown" /* HandoffManagerState.TEARDOWN */) {
        res.status(202);
        return res.send('Tearing down');
    }
    else if (state === "maintanceMode" /* HandoffManagerState.MAINTANCE_MODE */) {
        return res.send('In maintenance mode');
    }
    try {
        await handoffManager.maintenanceModeEnable();
        return res.send('Successfully went into maintenance mode');
    }
    catch (e) {
        handleError(e, logger);
        res.status(500);
        return res.send(e);
    }
}
async function maintanceModeOff(_req, res, handoffManager, logger) {
    const state = handoffManager.getHandoffManagerState();
    if (state === "up" /* HandoffManagerState.UP */) {
        return res.send('Accepting submissions');
    }
    try {
        await handoffManager.maintenanceModeDisable();
        return res.send('Successfully resumed service');
    }
    catch (e) {
        handleError(e, logger);
        res.status(500);
        return res.send(e);
    }
}
