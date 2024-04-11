"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressManager = void 0;
// 3rd party modules
const _ = require("lodash");
// Our modules
const counter_1 = require("../frontend/component-helpers/counter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class ProgressManager {
    triggerEvent;
    logger;
    tasks = {};
    progressIdCounter = new counter_1.Counter();
    promises = {};
    closed = false;
    constructor(triggerEvent, logger) {
        this.triggerEvent = triggerEvent;
        this.logger = logger;
    }
    close() {
        this.closed = true;
    }
    // To be passed to entry module
    getProgress() {
        // Make a shallow copy so this doesn't change every time a task is added / removed
        return { ...this.tasks };
    }
    clearTaskProgress(progressId) {
        if (!this.tasks[progressId]) {
            throw new Error('Trying to update a non-existent progress');
        }
        else if (!this.tasks[progressId].isComplete) {
            throw new Error('Trying to clear incomplete progress');
        }
        delete this.tasks[progressId];
        delete this.promises[progressId];
        this.triggerEvent("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, this.getProgress());
    }
    // To be used within the submodule
    createProgressTask(initialProgress, context, isUserTask = true) {
        // Register in this.tasks
        this.progressIdCounter.setValue();
        const progressId = this.progressIdCounter.getValue().toString();
        this.tasks[progressId] = {
            subActivity: '',
            ...initialProgress,
            isFirstUpdate: true,
            isComplete: false,
            error: null,
            name: initialProgress.name ? `${context} - ${initialProgress.name}` : context
        };
        this.triggerEvent("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, this.getProgress());
        this.logger.info(`Registered task with progressId ${progressId} and initialProgress ${JSON.stringify(initialProgress)}`);
        let taskRegistered = false;
        const registerTask = (task) => {
            if (taskRegistered) {
                throw new Error('Task already registered');
            }
            taskRegistered = true;
            // Cleanup once task done
            this.promises[progressId] = task
                .then(() => {
                this.tasks[progressId] = {
                    progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                    name: `${context} - Success`,
                    subActivity: '',
                    isFirstUpdate: false,
                    isComplete: true,
                    error: null
                };
                this.triggerEvent("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, this.getProgress());
                if (!isUserTask) {
                    this.clearTaskProgress(progressId);
                }
                this.logger.info(`Successfully finished task with progressId ${progressId}`);
            })
                .catch((error) => {
                this.tasks[progressId] = {
                    progressType: "Indefinite" /* ProgressType.INDEFINITE */,
                    name: `${context} - Failure`,
                    subActivity: '',
                    isFirstUpdate: false,
                    isComplete: true,
                    error: typeof error === 'string' ? error : error.message
                };
                this.triggerEvent("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, this.getProgress());
                this.logger.error(`Error finishing task with progressId ${progressId} and error ${JSON.stringify(error)}`);
            });
            return progressId;
        };
        const onProgressUpdate = (updatedProgress) => {
            if (this.closed) {
                // Long term, we'll provide a way to cancel individual tasks
                throw new Error('Task was cancelled');
            }
            if (!this.tasks[progressId]) {
                throw new Error('Trying to update a non-existent progress');
            }
            else if (this.tasks[progressId].isComplete) {
                this.logger.warning('Trying to update a complete progress, skipping...');
                return;
            }
            this.logger.info(`Got update ${JSON.stringify(updatedProgress)}`);
            this.tasks[progressId] = {
                subActivity: '',
                ...updatedProgress,
                name: updatedProgress.name ? `${context} - ${updatedProgress.name}` : context,
                isFirstUpdate: false,
                isComplete: false,
                error: null
            };
            this.triggerEvent("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, this.getProgress());
        };
        return { registerTask, onProgressUpdate };
    }
    async waitForTasks() {
        return Promise.all(_.values(this.promises));
    }
}
exports.ProgressManager = ProgressManager;
