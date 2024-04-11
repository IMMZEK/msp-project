"use strict";
/*
  Shared data used for using the server harness
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageGroup57 = exports.packageGroup56 = exports.packageGroup55 = exports.packageGroup54 = exports.packageGroup53 = exports.packageGroup52 = exports.packageGroup51 = exports.packageGroup4 = exports.packageGroup3 = exports.packageGroup2 = exports.package72 = exports.package71 = exports.package62 = exports.package61 = exports.package58 = exports.package57 = exports.package56 = exports.package55 = exports.package54 = exports.package53 = exports.package52 = exports.package51 = exports.package4 = exports.package3 = exports.package2 = exports.packageNode72 = exports.packageNode71 = exports.packageNode62 = exports.packageNode61 = exports.packageNode58 = exports.packageNode57 = exports.packageNode56 = exports.packageNode55 = exports.packageNode54 = exports.packageNode53 = exports.packageNode52 = exports.packageNode51 = exports.packageNode4 = exports.packageNode3 = exports.packageNode2 = exports.rootNode = exports.compiler2 = exports.compiler1 = exports.kernel2 = exports.kernel1 = exports.resource1 = exports.devtool2 = exports.devtool1 = exports.device2 = exports.device1 = void 0;
exports.createInstalledPackageData = exports.getPackageGroupData = exports.getPackageData = exports.emptyFilterData = exports.tableItem5 = exports.tableItem4 = exports.tableItem3 = exports.tableItem2 = exports.tableItem1 = exports.variant4 = exports.variant3 = exports.variant2 = exports.folderNode6 = exports.folderNode5 = exports.folderNode4 = exports.folderNode3 = exports.folderNode2 = exports.packageGroup62 = exports.packageGroup61 = exports.packageGroup58 = void 0;
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
// Devtools
exports.devtool1 = {
    publicId: 'devtool_1',
    name: 'hi'
};
exports.devtool2 = {
    publicId: 'devtool_2',
    name: 'bye'
};
// Resource Classes
exports.resource1 = {
    publicId: 'resource1',
    name: 'resource'
};
// Kernels
exports.kernel1 = {
    publicId: 'freertos',
    name: 'kernel_1'
};
exports.kernel2 = {
    publicId: 'nortos',
    name: 'kernel_2'
};
// Compilers
exports.compiler1 = {
    publicId: 'ccs',
    name: 'compiler_1'
};
exports.compiler2 = {
    publicId: 'gcc',
    name: 'compiler_2'
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
        filterPackageGroup: ['pgrp_foo2'],
        filterDevice: [exports.device1.publicId]
    },
    packagePublicUid: 'foo2',
    packageGroupPublicUid: 'pgrp_foo2',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url2',
        [response_data_1.Platform.WINDOWS]: 'another/url2',
        [response_data_1.Platform.MACOS]: 'foo/url2'
    }
};
exports.packageNode3 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '3',
    nodePublicId: 'public3',
    name: 'Folder 3',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_bar3'],
        filterDevice: [exports.device1.publicId]
    },
    packagePublicUid: 'bar3',
    packageGroupPublicUid: 'pgrp_bar3',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url3',
        [response_data_1.Platform.WINDOWS]: 'another/url3',
        [response_data_1.Platform.MACOS]: 'foo/url3'
    }
};
exports.packageNode4 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '4',
    nodePublicId: 'public4',
    name: 'Folder 4',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz4'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz4',
    packageGroupPublicUid: 'pgrp_fizz4',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url4',
        [response_data_1.Platform.WINDOWS]: 'another/url4',
        [response_data_1.Platform.MACOS]: 'foo/url4'
    }
};
exports.packageNode51 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '51',
    nodePublicId: 'public51',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz51'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz51',
    packageGroupPublicUid: 'pgrp_fizz51',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url5',
        [response_data_1.Platform.WINDOWS]: 'another/url5',
        [response_data_1.Platform.MACOS]: 'foo/url5'
    }
};
exports.packageNode52 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '52',
    nodePublicId: 'public52',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz52'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz52',
    packageGroupPublicUid: 'pgrp_fizz52',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url52',
        [response_data_1.Platform.WINDOWS]: 'another/url52',
        [response_data_1.Platform.MACOS]: 'foo/url52'
    }
};
exports.packageNode53 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '53',
    nodePublicId: 'public53',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz53'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz53',
    packageGroupPublicUid: 'pgrp_fizz53',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url53',
        [response_data_1.Platform.WINDOWS]: 'another/url53',
        [response_data_1.Platform.MACOS]: 'foo/url53'
    }
};
exports.packageNode54 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '54',
    nodePublicId: 'public54',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz54'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz54',
    packageGroupPublicUid: 'pgrp_fizz54',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url54',
        [response_data_1.Platform.WINDOWS]: 'another/url54',
        [response_data_1.Platform.MACOS]: 'foo/url54'
    }
};
exports.packageNode55 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '55',
    nodePublicId: 'public55',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz55'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz55',
    packageGroupPublicUid: 'pgrp_fizz55',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url55',
        [response_data_1.Platform.WINDOWS]: 'another/url55',
        [response_data_1.Platform.MACOS]: 'foo/url55'
    }
};
exports.packageNode56 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '56',
    nodePublicId: 'public56',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz56'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz56',
    packageGroupPublicUid: 'pgrp_fizz56',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url56',
        [response_data_1.Platform.WINDOWS]: 'another/url56',
        [response_data_1.Platform.MACOS]: 'foo/url56'
    }
};
exports.packageNode57 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '57',
    nodePublicId: 'public57',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz57'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz57',
    packageGroupPublicUid: 'pgrp_fizz57',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url57',
        [response_data_1.Platform.WINDOWS]: 'another/url57',
        [response_data_1.Platform.MACOS]: 'foo/url57'
    }
};
exports.packageNode58 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '58',
    nodePublicId: 'public58',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz58'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz58',
    packageGroupPublicUid: 'pgrp_fizz58',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url58',
        [response_data_1.Platform.WINDOWS]: 'another/url58',
        [response_data_1.Platform.MACOS]: 'foo/url58'
    }
};
exports.packageNode61 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '61',
    nodePublicId: 'public61',
    name: 'Folder 6',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz61'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz61',
    packageGroupPublicUid: 'pgrp_fizz61',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url61',
        [response_data_1.Platform.WINDOWS]: 'another/url61',
        [response_data_1.Platform.MACOS]: 'foo/url61'
    }
};
exports.packageNode62 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '62',
    nodePublicId: 'public62',
    name: 'Folder 6',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz62'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz62',
    packageGroupPublicUid: 'pgrp_fizz62',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url62',
        [response_data_1.Platform.WINDOWS]: 'another/url62',
        [response_data_1.Platform.MACOS]: 'foo/url62'
    }
};
exports.packageNode71 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '71',
    nodePublicId: 'public71',
    name: 'Folder 7',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz61'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz71',
    packageGroupPublicUid: 'pgrp_fizz61',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url71',
        [response_data_1.Platform.WINDOWS]: 'another/url71',
        [response_data_1.Platform.MACOS]: 'foo/url71'
    }
};
exports.packageNode72 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '72',
    nodePublicId: 'public72',
    name: 'Folder 7',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz62'],
        filterDevice: [exports.device2.publicId]
    },
    packagePublicUid: 'fizz72',
    packageGroupPublicUid: 'pgrp_fizz62',
    downloadUrl: {
        [response_data_1.Platform.LINUX]: 'some/url72',
        [response_data_1.Platform.WINDOWS]: 'another/url72',
        [response_data_1.Platform.MACOS]: 'foo/url72'
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
    packageVersion: '0.1.2',
    packagePublicId: '4'
});
exports.package51 = getPackageData(exports.packageNode51, {
    packageVersion: '0.5.1',
    packagePublicId: '5'
});
exports.package52 = getPackageData(exports.packageNode52, {
    packageVersion: '0.5.2',
    packagePublicId: '5'
});
exports.package53 = getPackageData(exports.packageNode53, {
    packageVersion: '0.5.3',
    packagePublicId: '5'
});
exports.package54 = getPackageData(exports.packageNode54, {
    packageVersion: '0.5.4',
    packagePublicId: '5'
});
exports.package55 = getPackageData(exports.packageNode55, {
    packageVersion: '0.5.5',
    packagePublicId: '5'
});
exports.package56 = getPackageData(exports.packageNode56, {
    packageVersion: '0.5.6',
    packagePublicId: '5'
});
exports.package57 = getPackageData(exports.packageNode57, {
    packageVersion: '0.5.7',
    packagePublicId: '5'
});
exports.package58 = getPackageData(exports.packageNode58, {
    packageVersion: '0.5.8',
    packagePublicId: '5'
});
exports.package61 = getPackageData(exports.packageNode61, {
    packageVersion: '0.6.1',
    packagePublicId: '6'
});
exports.package62 = getPackageData(exports.packageNode62, {
    packageVersion: '0.6.2',
    packagePublicId: '6'
});
exports.package71 = {
    ...getPackageData(exports.packageNode71, {
        packageVersion: '0.7.1',
        packagePublicId: '7'
    }),
    packageType: "SubPackage" /* Nodes.PackageType.SUB_PACKAGE */
};
exports.package72 = {
    ...getPackageData(exports.packageNode72, {
        packageVersion: '0.7.2',
        packagePublicId: '7'
    }),
    packageType: "SubPackage" /* Nodes.PackageType.SUB_PACKAGE */
};
exports.packageGroup2 = getPackageGroupData(exports.packageNode2, {
    packageGroupVersion: '1.2.3',
    packageGroupPublicId: 'msp'
});
exports.packageGroup3 = getPackageGroupData(exports.packageNode3, {
    packageGroupVersion: '1.2.1',
    packageGroupPublicId: 'msp'
});
exports.packageGroup4 = getPackageGroupData(exports.packageNode4, {
    packageGroupVersion: '8.2.1',
    packageGroupPublicId: 'c2000'
});
exports.packageGroup51 = getPackageGroupData(exports.packageNode51, {
    packageGroupVersion: '1.5.1',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup52 = getPackageGroupData(exports.packageNode52, {
    packageGroupVersion: '1.5.2',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup53 = getPackageGroupData(exports.packageNode53, {
    packageGroupVersion: '1.5.3',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup54 = getPackageGroupData(exports.packageNode54, {
    packageGroupVersion: '1.5.4',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup55 = getPackageGroupData(exports.packageNode55, {
    packageGroupVersion: '1.5.5',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup56 = getPackageGroupData(exports.packageNode56, {
    packageGroupVersion: '1.5.6',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup57 = getPackageGroupData(exports.packageNode57, {
    packageGroupVersion: '1.5.7',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup58 = getPackageGroupData(exports.packageNode58, {
    packageGroupVersion: '1.5.8',
    packageGroupPublicId: 'packageGroup5'
});
exports.packageGroup61 = getPackageGroupData(exports.packageNode61, {
    packageGroupVersion: '2.6.1',
    packageGroupPublicId: 'packageGroup6'
});
exports.packageGroup61.packagesPublicUids.push(exports.packageNode71.packagePublicUid);
exports.packageGroup62 = getPackageGroupData(exports.packageNode62, {
    packageGroupVersion: '2.6.2',
    packageGroupPublicId: 'packageGroup6'
});
exports.packageGroup62.packagesPublicUids.push(exports.packageNode72.packagePublicUid);
// Folder nodes
exports.folderNode2 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: 'folder2',
    nodePublicId: 'publicfolder2',
    name: 'Folder 2',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [exports.package2.packageGroupPublicUids[0]]
    },
    packagePublicUid: exports.package2.packagePublicUid,
    packageGroupPublicUid: exports.package2.packageGroupPublicUids[0]
};
exports.folderNode3 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: 'folder3',
    nodePublicId: 'publicfolder3',
    name: 'Folder 3',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [exports.package2.packageGroupPublicUids[0]]
    },
    packagePublicUid: exports.package2.packagePublicUid,
    packageGroupPublicUid: exports.package2.packageGroupPublicUids[0]
};
exports.folderNode4 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: 'folder4',
    nodePublicId: 'publicfolder4',
    name: 'Folder 4',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [exports.package2.packageGroupPublicUids[0]]
    },
    packagePublicUid: exports.package2.packagePublicUid,
    packageGroupPublicUid: exports.package2.packageGroupPublicUids[0]
};
exports.folderNode5 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: 'folder5',
    nodePublicId: 'publicfolder5',
    name: 'Folder 5',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [exports.package2.packageGroupPublicUids[0]]
    },
    packagePublicUid: exports.package2.packagePublicUid,
    packageGroupPublicUid: exports.package2.packageGroupPublicUids[0]
};
exports.folderNode6 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: 'folder6',
    nodePublicId: 'publicFolder6',
    name: 'Folder 6',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [exports.package2.packageGroupPublicUids[0]]
    },
    packagePublicUid: exports.package2.packagePublicUid,
    packageGroupPublicUid: exports.package2.packagePublicUid[0]
};
// Variants
exports.variant2 = {
    variant: { compiler: exports.compiler1.publicId, kernel: exports.kernel1.publicId },
    nodeDbId: exports.folderNode2.nodeDbId
};
exports.variant3 = {
    variant: { compiler: exports.compiler2.publicId, kernel: exports.kernel2.publicId },
    nodeDbId: exports.folderNode3.nodeDbId
};
exports.variant4 = {
    variant: { compiler: exports.compiler1.publicId, kernel: exports.kernel1.publicId },
    nodeDbId: exports.folderNode3.nodeDbId
};
// TableItems
exports.tableItem1 = {
    tableItemDbId: 'table-1',
    tableItemPublicId: 'table-public-1',
    tableItemNodeDbId: 'table-node-1',
    name: 'Table item 1',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: []
    },
    variants: []
};
exports.tableItem2 = {
    tableItemDbId: 'table-2',
    tableItemPublicId: 'table-public-2',
    tableItemNodeDbId: exports.variant2.nodeDbId,
    name: 'Table item 2',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: [],
        filterKernel: [exports.kernel1.publicId]
    },
    variants: [exports.variant2]
};
exports.tableItem3 = {
    tableItemDbId: 'table-3',
    tableItemPublicId: 'table-public-3',
    tableItemNodeDbId: exports.variant3.nodeDbId,
    name: 'Table item 3',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: [],
        filterCompiler: [exports.compiler1.publicId]
    },
    variants: [exports.variant3, exports.variant4]
};
exports.tableItem4 = {
    tableItemDbId: 'table-4',
    tableItemPublicId: 'table-public-4',
    tableItemNodeDbId: 'table-node-4',
    name: 'Table item 4',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: []
    },
    variants: []
};
exports.tableItem5 = {
    tableItemDbId: 'table-5',
    tableItemPublicId: 'table-public-5',
    tableItemNodeDbId: 'table-node-5',
    name: 'Table item 5',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: []
    },
    variants: []
};
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
// Helpers for preparing test data
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
        packageType: packageNode.packageType || "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
        dependencies: packageNode.dependencies || [],
        isInstallable: packageNode.isInstallable || true,
        downloadUrl: packageNode.downloadUrl || {},
        installCommand: packageNode.installCommand || null,
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
function createInstalledPackageData(pkg, localPackagePath) {
    const installedPackage = { ...pkg, packageGroupPublicUids: undefined, packageType: undefined };
    return {
        ...installedPackage,
        localPackagePath,
        ccsVersion: null,
        featureType: null,
        subType: null
    };
}
exports.createInstalledPackageData = createInstalledPackageData;
