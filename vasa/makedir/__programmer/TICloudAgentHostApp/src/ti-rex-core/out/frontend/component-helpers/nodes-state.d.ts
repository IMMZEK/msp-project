import { EventListener } from 'event-emitter';
export declare const enum NodeTreeState {
    Expanded = "Expanded",
    Collapsed = "Collapsed"
}
export declare const enum NodesStateEvent {
    ON_CHANGE_NODE_STATE_REQUEST = "OnChangeNodeStateRequest",
    ON_EXPAND_PATH_REQUEST = "OnExpandPathRequest"
}
export type OnChangeNodeStateFn = (id: string, state: NodeTreeState) => Promise<void>;
export type OnExpandPathFn = (path: string[]) => Promise<void>;
/**
 * Holds the state of a node in the frontend. Handles node event handling (i.e node expanded)
 *
 */
export declare class NodesState {
    private renderedNodes;
    private nodesTreeState;
    private emitter;
    /**
     * Add rendered nodes for the given parent.
     * Note: this does not replace existing nodes for the parent.
     *
     * @param parentId
     * @param childrenIds
     */
    addRenderedNodes(parentId: string, childrenIds: string[]): void;
    requestChangeNodeState(id: string, state: NodeTreeState): void;
    requestExpandPath(path: string[]): void;
    getNodesTreeState(id: string): NodeTreeState | null;
    getRenderedNodes(parentId: string): string[] | null;
    getAllRenderedNodeIds(): string[];
    setNodesTreeState(id: string, state: NodeTreeState): void;
    onChangeNodeStateRequest(fn: OnChangeNodeStateFn): void;
    onExpandPathRequest(fn: OnExpandPathFn): void;
    removeListener(event: NodesStateEvent, listener: EventListener): void;
}
