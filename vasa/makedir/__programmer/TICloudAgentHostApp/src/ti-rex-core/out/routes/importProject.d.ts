/**
 *  Supports importProject, createProject
 */
export declare const enum CCS_CLOUD_API {
    IMPORT_PROJECT = "/ide/importProject",
    CREATE_PROJECT = "/ide/createProject",
    IMPORT_SKETCH = "/ide/importSketch"
}
export declare function getRoutes(): import("express-serve-static-core").Router;
