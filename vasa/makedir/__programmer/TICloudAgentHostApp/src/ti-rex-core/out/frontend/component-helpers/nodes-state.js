"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodesState = void 0;
// 3rd party modules
const _ = require("lodash");
// our modules
const event_emitter_1 = require("../component-helpers/event-emitter");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Holds the state of a node in the frontend. Handles node event handling (i.e node expanded)
 *
 */
class NodesState {
    renderedNodes = {};
    nodesTreeState = {};
    emitter = new event_emitter_1.default();
    /**
     * Add rendered nodes for the given parent.
     * Note: this does not replace existing nodes for the parent.
     *
     * @param parentId
     * @param childrenIds
     */
    addRenderedNodes(parentId, childrenIds) {
        const newRenderedNodes = (this.renderedNodes[parentId] || []).concat(childrenIds);
        this.renderedNodes[parentId] = _.uniq(newRenderedNodes);
    }
    requestChangeNodeState(id, state) {
        this.emitter.emit("OnChangeNodeStateRequest" /* NodesStateEvent.ON_CHANGE_NODE_STATE_REQUEST */, id, state);
    }
    requestExpandPath(path) {
        this.emitter.emit("OnExpandPathRequest" /* NodesStateEvent.ON_EXPAND_PATH_REQUEST */, path);
    }
    // Getters
    getNodesTreeState(id) {
        return this.nodesTreeState[id] || null;
    }
    getRenderedNodes(parentId) {
        return this.renderedNodes[parentId] || null;
    }
    getAllRenderedNodeIds() {
        return Object.keys(this.renderedNodes);
    }
    // Setters
    setNodesTreeState(id, state) {
        this.nodesTreeState[id] = state;
    }
    // Events
    onChangeNodeStateRequest(fn) {
        return this.emitter.on("OnChangeNodeStateRequest" /* NodesStateEvent.ON_CHANGE_NODE_STATE_REQUEST */, fn);
    }
    onExpandPathRequest(fn) {
        return this.emitter.on("OnExpandPathRequest" /* NodesStateEvent.ON_EXPAND_PATH_REQUEST */, fn);
    }
    removeListener(event, listener) {
        this.emitter.off(event, listener);
    }
}
exports.NodesState = NodesState;
