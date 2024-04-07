"use strict";
/*
   Our base component which extends React.Component handling some common patterns in the components.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseComponent = void 0;
// 3rd party
const React = require("react");
class BaseComponent extends React.Component {
    isActive = true;
    error = null;
    ///////////////////////////////////////////////////////////////////////////
    /// Public methods
    ///////////////////////////////////////////////////////////////////////////
    handleError(e) {
        this.error = e;
        this.forceUpdate();
    }
    // Lifecycle methods
    componentWillUnmount() {
        this.isActive = false;
    }
    forceUpdate(callback) {
        if (this.isActive) {
            super.forceUpdate(callback);
        }
    }
    render() {
        this.checkForError();
        return this.handleRender();
    }
    setState(stateOrF, callback) {
        if (this.isActive) {
            super.setState(stateOrF, callback);
        }
    }
    ///////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////
    checkForError() {
        if (this.error) {
            throw this.error;
        }
    }
}
exports.BaseComponent = BaseComponent;
