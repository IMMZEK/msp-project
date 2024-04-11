"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureTypeEnumsOnUnion = exports.packageSubTypeEnumsOnUnion = exports.isResourceSubClass = exports.resourceSubClasses = exports.isResourceClass = exports.resourceClasses = exports.isKernel = exports.kernels = exports.isCompiler = exports.compilers = exports.isResourceTypeImportableByCCS = exports.isResourceType = void 0;
const resourceTypes = {
    app: '',
    bundle: '',
    category: '',
    categoryInfo: '',
    energiaSketch: '',
    executable: '',
    folder: '',
    'folder.importable': '',
    file: '',
    'file.executable': '',
    'file.importable': '',
    other: '',
    overview: '',
    package: '',
    packageOverview: '',
    project: '',
    'project.ccs': '',
    'project.energia': '',
    'project.iar': '',
    projectSpec: '',
    'web.app': '',
    'web.page': '',
    weblink: ''
};
// type guard function for run-time type checking
function isResourceType(s) {
    return resourceTypes.hasOwnProperty(s);
}
exports.isResourceType = isResourceType;
function isResourceTypeImportableByCCS(resourceType) {
    const importables = [
        'projectSpec',
        'project.ccs',
        'project.energia',
        'file.importable',
        'folder.importable'
    ];
    return importables.includes(resourceType);
}
exports.isResourceTypeImportableByCCS = isResourceTypeImportableByCCS;
/**
 * compilers - allowed ids and public names
 */
exports.compilers = {
    ccs: 'CCS - TI Compiler (MSP, C2000, Arm)',
    ticlang: 'CCS - TI Arm Clang Compiler',
    gcc: 'CCS - GCC',
    iar: 'IAR'
};
// type guard function for run-time type checking
function isCompiler(s) {
    return exports.compilers.hasOwnProperty(s);
}
exports.isCompiler = isCompiler;
/**
 * kernels - allowed ids and public names
 */
exports.kernels = {
    tirtos: 'TI-RTOS',
    freertos: 'FreeRTOS',
    nortos: 'No RTOS',
    tirtos7: 'TI-RTOS7'
};
// type guard function for run-time type checking
function isKernel(s) {
    return exports.kernels.hasOwnProperty(s);
}
exports.isKernel = isKernel;
/**
 * resourceClass
 */
exports.resourceClasses = {
    example: 'Example',
    document: 'Document',
    other: 'Other'
};
// type guard function for run-time type checking
function isResourceClass(s) {
    return exports.resourceClasses.hasOwnProperty(s);
}
exports.isResourceClass = isResourceClass;
/**
 * resourceSubClass
 */
exports.resourceSubClasses = {
    'example.general': '',
    'example.empty': '',
    'example.gettingstarted': '',
    'example.outofbox': '',
    'example.helloworld': ''
};
// type guard function for run-time type checking
function isResourceSubClass(s) {
    return exports.resourceSubClasses.hasOwnProperty(s);
}
exports.isResourceSubClass = isResourceSubClass;
// TODO! 3486 Created these in case they're needed -- remove if not
// For conversion from enum to string literal union
exports.packageSubTypeEnumsOnUnion = {
    ccsComponent: "ccsComponent" /* PackageSubTypeEnum.CCS_COMPONENT */,
    featureSupport: "featureSupport" /* PackageSubTypeEnum.FEATURE_SUPPORT */
};
exports.featureTypeEnumsOnUnion = {
    deviceSupport: "deviceSupport" /* FeatureTypeEnum.DEVICE_SUPPORT */,
    tools: "tools" /* FeatureTypeEnum.TOOLS */,
    compiler: "compiler" /* FeatureTypeEnum.COMPILER */,
    ccsCore: "ccsCore" /* FeatureTypeEnum.CCS_CORE */
};
