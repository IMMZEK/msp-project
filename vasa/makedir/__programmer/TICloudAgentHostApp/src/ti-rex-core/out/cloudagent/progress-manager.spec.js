"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const sinon = require("sinon");
const _ = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const expect_1 = require("../test/expect");
const testing_util_1 = require("./testing-util");
////////////////////////////////////////////////////////////////////////////////
/// Data
////////////////////////////////////////////////////////////////////////////////
const initialProgress = {
    progressType: "Indefinite" /* ProgressType.INDEFINITE */,
    name: 'Initializing'
};
const task1 = {
    task: () => {
        return new Promise(() => { });
    },
    initialProgress
};
const task2 = {
    task: () => Promise.resolve(),
    initialProgress
};
const task3 = {
    task: () => Promise.reject(new Error('I messed up')),
    initialProgress
};
const task4 = {
    complete: () => { },
    task: () => new Promise((resolve) => (task4.complete = resolve)),
    initialProgress
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[cloudagent] ProgressManager', function () {
    describe('getProgress', function () {
        it('Should be able to get the set of ongoing tasks', async function () {
            const task = task1;
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            registerTask(task.task());
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
        });
        it('Should be able to get the set of tasks when there are no outstanding tasks (empty object)', async function () {
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(0);
        });
        it('Should be able to get a valid tasks progress', async function () {
            const task = task1;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            registerTask(task.task());
            // Get progress
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            const progress = tasks[progressId];
            // Verify
            (0, expect_1.expect)(progress).to.deep.equal({
                ...progress,
                ...task.initialProgress,
                name: `context - ${task.initialProgress.name}`
            });
        });
    });
    describe('clearTaskProgress', function () {
        it('Should fail to clear an incompleted task', async function () {
            const task = task2;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            registerTask(task.task());
            // Get progressId
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            // Clear
            (0, expect_1.expect)(() => progressManager.clearTaskProgress(progressId)).to.throw('Trying to clear incomplete progress');
        });
        it('Should be able to clear a completed task', async function () {
            const task = task2;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            const taskPromise = task.task();
            registerTask(taskPromise);
            // Get progressId
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            // Wait for task to complete
            await progressManager.waitForTasks();
            // Clear
            progressManager.clearTaskProgress(progressId);
            // Verify
            (0, expect_1.expect)(!!progressManager.getProgress()[progressId]).to.be.false;
        });
        it('Should handle an invalid progress id', async function () {
            const task = task2;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            registerTask(task.task());
            // Get progressId
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            // Verify
            (0, expect_1.expect)(() => progressManager.clearTaskProgress(progressId + '1')).to.throw('non-existent progress');
        });
    });
    describe('Updating progress', function () {
        it('Should handle new tasks being added', async function () {
            const triggerEventSpy = sinon.spy();
            const task = task1;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({ triggerEventSpy });
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            registerTask(task.task());
            // Get progressId
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            // Verify
            (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, [
                "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */,
                { [progressId]: tasks[progressId] }
            ]);
        });
        it('Should handle tasks being removed', async function () {
            const triggerEventSpy = sinon.spy();
            const task = task2;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({ triggerEventSpy });
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            const taskPromise = task.task();
            registerTask(taskPromise);
            // Get progressId
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            const progress = tasks[progressId];
            // Clear
            await progressManager.waitForTasks();
            progressManager.clearTaskProgress(progressId);
            // Verify
            (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, [
                "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */,
                { [progressId]: progress }
            ]);
            (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, ["OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, {}]);
        });
        it('Should handle tasks being updated', async function () {
            const triggerEventSpy = sinon.spy();
            const task = task1;
            const progressUpdate = { ...task.initialProgress, name: 'Doing Stuff' };
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({ triggerEventSpy });
            const { registerTask, onProgressUpdate } = progressManager.createProgressTask(task.initialProgress, 'context');
            registerTask(task.task());
            // Get progressId
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            // Update
            onProgressUpdate(progressUpdate);
            // Verify
            const expectedUpdateData = {
                [progressId]: {
                    ...progressUpdate,
                    isFirstUpdate: false,
                    isComplete: false,
                    subActivity: '',
                    error: null,
                    name: `context - ${progressUpdate.name}`
                }
            };
            (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, [
                "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */,
                expectedUpdateData
            ]);
        });
        it('Should handle a user task completing successfully', async function () {
            const triggerEventSpy = sinon.spy();
            const task = task2;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({ triggerEventSpy });
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context');
            const taskPromise = task.task();
            registerTask(taskPromise);
            await progressManager.waitForTasks();
            // Get progress
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            const progress = tasks[progressId];
            // Verify
            const expectedUpdateData = {
                [progressId]: {
                    ...progress,
                    isFirstUpdate: false,
                    isComplete: true,
                    error: null
                }
            };
            (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, [
                "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */,
                expectedUpdateData
            ]);
        });
        it('Should handle a non-user task completing successfully', async function () {
            const triggerEventSpy = sinon.spy();
            const task = task4;
            // Setup
            const progressManager = await (0, testing_util_1.createProgressManager)({ triggerEventSpy });
            const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context', false);
            const taskPromise = task.task();
            registerTask(taskPromise);
            // Get progress
            const tasks = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks)).to.equal(1);
            const [progressId] = Object.keys(tasks);
            const progress = tasks[progressId];
            // Complete task and verify it auto-removed itself
            task.complete();
            await progressManager.waitForTasks();
            const tasks2 = progressManager.getProgress();
            (0, expect_1.expect)(_.size(tasks2)).to.equal(0);
            // Verify
            const expectedUpdateData = {
                [progressId]: {
                    ...progress,
                    name: 'context - Success',
                    isFirstUpdate: false,
                    isComplete: true,
                    error: null
                }
            };
            (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, [
                "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */,
                expectedUpdateData
            ]);
        });
        for (const isUserTask of [true, false]) {
            it(`Should handle a ${isUserTask ? 'user' : 'non-user'} task having an error`, async function () {
                const triggerEventSpy = sinon.spy();
                const task = task3;
                // Setup
                const progressManager = await (0, testing_util_1.createProgressManager)({ triggerEventSpy });
                const { registerTask } = progressManager.createProgressTask(task.initialProgress, 'context', isUserTask);
                registerTask(task.task());
                // wait for rejection to happen
                await progressManager.waitForTasks();
                // Get progress - note that non-user tasks that fail should not clear themselves
                const tasks = progressManager.getProgress();
                (0, expect_1.expect)(_.size(tasks)).to.equal(1);
                const [progressId] = Object.keys(tasks);
                const progress = tasks[progressId];
                // Verify
                const expectedUpdateData = {
                    [progressId]: {
                        ...progress,
                        isFirstUpdate: false,
                        isComplete: true,
                        error: 'I messed up'
                    }
                };
                (0, testing_util_1.calledWithExactlyDeep)(triggerEventSpy, [
                    "OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */,
                    expectedUpdateData
                ]);
            });
        }
    });
    describe('close', function () {
        it('Should abort tasks when closed', async () => {
            const progressManager = await (0, testing_util_1.createProgressManager)({});
            const { onProgressUpdate } = progressManager.createProgressTask(initialProgress, 'context');
            (0, expect_1.expect)(() => onProgressUpdate(initialProgress)).to.not.throw;
            progressManager.close();
            (0, expect_1.expect)(() => onProgressUpdate(initialProgress)).to.throw;
        });
    });
});
