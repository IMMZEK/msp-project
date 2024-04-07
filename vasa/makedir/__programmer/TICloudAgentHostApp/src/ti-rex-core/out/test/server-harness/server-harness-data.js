"use strict";
/*
  Shared data used for using the server harness
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageGroupData = exports.getPackageData = exports.emptyFilterData = exports.packageGroup8 = exports.packageGroup5 = exports.packageGroup4 = exports.packageGroup3 = exports.packageGroup2 = exports.package8 = exports.package7 = exports.package6 = exports.package5 = exports.package4 = exports.package3 = exports.package2 = exports.folderNodeGroupDoesNotExist = exports.folderNodeNoGroup = exports.folderNodeWithValidGroup = exports.packageNode8 = exports.packageNode7 = exports.packageNode6 = exports.packageNode5 = exports.packageNode4 = exports.packageNode3 = exports.packageNode2 = exports.rootNode = exports.devtool2 = exports.devtool1 = exports.device4 = exports.device3 = exports.device2 = exports.device1 = void 0;
const response_data_1 = require("../../shared/routes/response-data");
////////////////////////////////////////////////////////////////////////////////
/// Data - Do not change the values as the tests rely on them (i.e same id / version)
////////////////////////////////////////////////////////////////////////////////
// Devices
exports.device1 = {
    publicId: 'device_1',
    name: 'foo'
};
exports.device2 = {
    publicId: 'device_2',
    name: 'bar'
};
exports.device3 = {
    publicId: 'device_3',
    name: 'baz'
};
exports.device4 = {
    publicId: 'device_4',
    name: 'baa'
};
// Devtools
exports.devtool1 = {
    publicId: 'devtool_1',
    name: 'hi'
};
exports.devtool2 = {
    publicId: 'devtool_2',
    name: 'bye'
};
// Nodes
exports.rootNode = '1';
// Package Nodes
exports.packageNode2 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '2',
    nodePublicId: 'public2',
    name: 'Folder 2',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device1.publicId]
    },
    packagePublicUid: 'foo2',
    packageGroupPublicUid: 'pgrp_foo2'
};
exports.packageNode3 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '3',
    nodePublicId: 'public3',
    name: 'Folder 3',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device1.publicId]
    },
    packagePublicUid: 'bar3',
    packageGroupPublicUid: 'pgrp_bar3'
};
exports.packageNode4 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '4',
    nodePublicId: 'public4',
    name: 'Folder 4',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz4',
    packageGroupPublicUid: 'pgrp_fizz4'
};
exports.packageNode5 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '5',
    nodePublicId: 'public5',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device1.publicId]
    },
    packagePublicUid: 'buzz5',
    packageGroupPublicUid: 'pgrp_buzz5'
};
exports.packageNode6 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '6',
    nodePublicId: 'public6',
    name: 'Folder 6',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device1.publicId]
    },
    packagePublicUid: 'fun6',
    packageGroupPublicUid: 'pgrp_fun6'
};
exports.packageNode7 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '7',
    nodePublicId: 'public7',
    name: 'Folder 7',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device1.publicId, exports.device2.publicId]
    },
    packagePublicUid: 'funn7',
    packageGroupPublicUid: 'pgrp_funn7'
};
exports.packageNode8 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '8',
    nodePublicId: 'public8',
    name: 'Folder 8',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [exports.device1.publicId, exports.device2.publicId]
    },
    packagePublicUid: 'funn8',
    packageGroupPublicUid: 'pgrp_funn8'
};
// Folder nodes
exports.folderNodeWithValidGroup = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '112',
    nodePublicId: 'public112',
    name: 'Folder 2',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: exports.packageNode2.packagePublicUid,
    packageGroupPublicUid: exports.packageNode2.packageGroupPublicUid,
    filterData: {
        filterPackageGroup: []
    }
};
exports.folderNodeNoGroup = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '113',
    nodePublicId: 'public3',
    name: 'Folder 3',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: null,
    packageGroupPublicUid: null,
    filterData: {
        filterPackageGroup: []
    }
};
exports.folderNodeGroupDoesNotExist = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '114',
    nodePublicId: 'public114',
    name: 'Folder 4',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    }
};
// Packages & Package groups
exports.package2 = getPackageData(exports.packageNode2, {
    packageVersion: '5.0.0',
    packagePublicId: '2and3'
});
exports.package3 = getPackageData(exports.packageNode3, {
    packageVersion: '1.1.1',
    packagePublicId: '2and3'
});
exports.package4 = getPackageData(exports.packageNode4, {
    packageVersion: '4.6.2',
    packagePublicId: '4and5'
});
exports.package5 = getPackageData(exports.packageNode5, {
    packageVersion: '1.9.6',
    packagePublicId: '4and5'
});
exports.package6 = getPackageData(exports.packageNode6, {
    packageVersion: '9.9.6',
    packagePublicId: '6'
});
exports.package7 = getPackageData(exports.packageNode7, {
    packageVersion: '1.7.2',
    packagePublicId: '7'
});
exports.package8 = getPackageData(exports.packageNode8, {
    packageVersion: '1.6.2',
    packagePublicId: '8'
});
exports.packageGroup2 = getPackageGroupData(exports.packageNode2, {
    packageGroupVersion: '1.2.3',
    packageGroupPublicId: 'msp'
});
exports.packageGroup3 = getPackageGroupData(exports.packageNode3, {
    packageGroupVersion: '1.2.1',
    packageGroupPublicId: 'msp'
});
exports.packageGroup4 = getPackageGroupData(exports.packageNode4, {
    packageGroupVersion: '4.2.1',
    packageGroupPublicId: 'mmwave'
});
exports.packageGroup5 = getPackageGroupData(exports.packageNode5, {
    packageGroupVersion: '1.9.6',
    packageGroupPublicId: 'mmwave'
});
exports.packageGroup8 = getPackageGroupData(exports.packageNode8, {
    packageGroupVersion: '9.1.3',
    packageGroupPublicId: 'cc32xx'
});
// Filter data
exports.emptyFilterData = {
    compilers: [],
    devices: [],
    devtools: [],
    ides: [],
    kernels: [],
    languages: [],
    resourceClasses: [],
    packages: []
};
function getPackageData(packageNode, { packageVersion, packagePublicId }) {
    if (!packageNode.packagePublicUid || !packageNode.packageGroupPublicUid) {
        throw new Error(`Missing package public / group uid ${packageNode}`);
    }
    return {
        name: packageNode.name,
        packagePublicUid: packageNode.packagePublicUid,
        packageGroupPublicUids: [packageNode.packageGroupPublicUid],
        packageVersion,
        packagePublicId,
        dependencies: packageNode.dependencies || [],
        packageType: packageNode.packageType || "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
        isInstallable: packageNode.isInstallable || true,
        installCommand: packageNode.installCommand || null,
        downloadUrl: packageNode.downloadUrl || {},
        installSize: packageNode.installSize || {},
        aliases: [],
        modules: [],
        moduleGroups: []
    };
}
exports.getPackageData = getPackageData;
function getPackageGroupData(packageNode, { packageGroupVersion, packageGroupPublicId }) {
    if (!packageNode.packagePublicUid || !packageNode.packageGroupPublicUid) {
        throw new Error(`Missing package public / group uid ${packageNode}`);
    }
    return {
        packageGroupPublicUid: packageNode.packageGroupPublicUid,
        packagesPublicUids: [packageNode.packagePublicUid],
        mainPackagePublicUid: packageNode.packagePublicUid,
        packageGroupPublicId,
        packageGroupVersion,
        hideByDefault: false,
        packagesToListVersionsFrom: []
    };
}
exports.getPackageGroupData = getPackageGroupData;
