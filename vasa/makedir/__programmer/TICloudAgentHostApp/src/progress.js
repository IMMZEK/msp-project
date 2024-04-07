"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressGenerator = void 0;
class ProgressGenerator {
    constructor(name, triggerEvent) {
        this.name = name;
        this.triggerEvent = triggerEvent;
        this.eventId = ++ProgressGenerator.eventIdCounter;
    }
    generateEvent(progressData) {
        this.triggerEvent("progress", this.createEventData(progressData));
    }
    createEventData(progressData) {
        // change the progress into events to be consistent with ds
        return {
            name: this.name,
            subActivity: progressData.message,
            id: this.eventId,
            isComplete: progressData.isComplete ? true : false,
            isFirstUpdate: progressData.isFirstUpdate ? true : false,
            percent: undefined !== progressData.percent ? progressData.percent : null,
        };
    }
}
exports.ProgressGenerator = ProgressGenerator;
ProgressGenerator.eventIdCounter = 0;
