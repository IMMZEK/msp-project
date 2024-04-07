"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPENDENCIES_METADATA_SCHEMA = exports.SUPPLEMENTS_METADATA_SCHEMA = exports.PACKAGE_METADATA_SCHEMA = exports.SET_MACROS_METADATA_SCHEMA = exports.ARRAY_MACROS_METADATA_SCHEMA = exports.TEXT_MACROS_METADATA_SCHEMA = exports.CONTENT_METADATA_SCHEMA = exports.DEVICES_METADATA_SCHEMA = exports.DEVTOOLS_METADATA_SCHEMA = exports.gRuleSettings = exports.RuleSettings = exports.RuleEntity = exports.Priority = exports.MetaFieldSchema = exports.SemanticType = exports.DataType = exports.Require = exports.Dependency = exports.DevtoolType = exports.MainCategorySubDocs = exports.MainCategory = exports.ResourceClass = exports.ResourceType = exports.DeviceType = exports.FeatureType = exports.PackageSubType = exports.PackageType = exports.cfgMetaVer = void 0;
exports.cfgMetaVer = { major: 3, minor: 1, patch: 0 };
var PackageType;
(function (PackageType) {
    PackageType["DEVICES"] = "devices";
    PackageType["DEVTOOLS"] = "devtools";
    PackageType["SOFTWARE"] = "software";
})(PackageType || (exports.PackageType = PackageType = {}));
var PackageSubType;
(function (PackageSubType) {
    PackageSubType["CCS_COMPONENT"] = "ccsComponent";
    PackageSubType["FEATURE_SUPPORT"] = "featureSupport";
})(PackageSubType || (exports.PackageSubType = PackageSubType = {}));
var FeatureType;
(function (FeatureType) {
    FeatureType["DEVICE_SUPPORT"] = "deviceSupport";
    FeatureType["TOOLS"] = "tools";
    FeatureType["COMPILER"] = "compiler";
    FeatureType["CCS_CORE"] = "ccsCore";
})(FeatureType || (exports.FeatureType = FeatureType = {}));
var DeviceType;
(function (DeviceType) {
    DeviceType["DEVICE"] = "device";
    DeviceType["FAMILY"] = "family";
    DeviceType["SUBFAMILY"] = "subfamily";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["PROJ_CCS"] = "project.ccs";
    ResourceType["PROJ_ENERGIA"] = "project.energia";
    ResourceType["PROJ_IAR"] = "project.iar";
    ResourceType["PROJ_KEIL"] = "project.keil";
    ResourceType["FILE"] = "file";
    ResourceType["FILE_IMPORTABLE"] = "file.importable";
    ResourceType["FILE_EXECUTABLE"] = "file.executable";
    ResourceType["FOLDER"] = "folder";
    ResourceType["FOLGER_IMPORTABLE"] = "folder.importable";
    ResourceType["WEB_PAGE"] = "web.page";
    ResourceType["WEB_APP"] = "web.app";
    ResourceType["CATEGORY_INFO"] = "categoryInfo";
    ResourceType["OTHER"] = "other";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var ResourceClass;
(function (ResourceClass) {
    ResourceClass["EXAMPLE"] = "example";
    ResourceClass["DOCUMENT"] = "document";
    ResourceClass["OTHER"] = "other";
})(ResourceClass || (exports.ResourceClass = ResourceClass = {}));
var ResourceSubClass;
(function (ResourceSubClass) {
    ResourceSubClass["OUT_OF_BOX"] = "example.outofbox";
    ResourceSubClass["GETTING_STARTED"] = "example.gettingstarted";
    ResourceSubClass["EMPTY"] = "example.empty";
    ResourceSubClass["GENERAL"] = "example.general";
    ResourceSubClass["HELLO_WORLD"] = "example.helloworld";
})(ResourceSubClass || (ResourceSubClass = {}));
var MainCategory;
(function (MainCategory) {
    MainCategory["DEVICES"] = "Devices";
    MainCategory["DEVTOOLS"] = "Development Tools";
    MainCategory["DOCUMENTS"] = "Documents";
    MainCategory["EXAMPLES"] = "Examples";
})(MainCategory || (exports.MainCategory = MainCategory = {}));
var MainCategorySubDocs;
(function (MainCategorySubDocs) {
    MainCategorySubDocs["DATASHEET"] = "Datasheet";
    MainCategorySubDocs["ERRATA"] = "Errata";
    MainCategorySubDocs["WIKI"] = "Wiki";
    MainCategorySubDocs["WHITE_PAPERS"] = "White papers";
    MainCategorySubDocs["REFERENCE_DESIGNS"] = "Reference designs";
    MainCategorySubDocs["SOLUTION_GUIDES"] = "Solution guides";
    MainCategorySubDocs["SELECTION_GUIDES"] = "Selection guides";
    MainCategorySubDocs["USER_GUIDES"] = "User guides";
    MainCategorySubDocs["APPLICATION_NOTES"] = "Application notes";
})(MainCategorySubDocs || (exports.MainCategorySubDocs = MainCategorySubDocs = {}));
var Restriction;
(function (Restriction) {
    Restriction["DESKTOP_ONLY"] = "desktopOnly";
    Restriction["DESKTOP_IMPORT_ONLY"] = "desktopImportOnly";
})(Restriction || (Restriction = {}));
var DevtoolType;
(function (DevtoolType) {
    DevtoolType["BOARD"] = "board";
    DevtoolType["IDE"] = "ide";
    DevtoolType["PROBE"] = "probe";
    DevtoolType["PROGRAMMER"] = "programmer";
    DevtoolType["UTILITY"] = "utility";
})(DevtoolType || (exports.DevtoolType = DevtoolType = {}));
var IDE;
(function (IDE) {
    IDE["CCS"] = "ccs";
    IDE["IAR"] = "iar";
    IDE["KEIL"] = "keil";
})(IDE || (IDE = {}));
var HostOS;
(function (HostOS) {
    HostOS["WIN"] = "win";
    HostOS["LINUX"] = "linux";
    HostOS["MACOS"] = "macos";
})(HostOS || (HostOS = {}));
var Kernel;
(function (Kernel) {
    Kernel["TI_RTOS"] = "tirtos";
    Kernel["TI_RTOS7"] = "tirtos7";
    Kernel["FREE_RTOS"] = "freertos";
    Kernel["NO_RTOS"] = "nortos";
})(Kernel || (Kernel = {}));
var Language;
(function (Language) {
    Language["ENGLISH"] = "english";
    Language["CHINESE"] = "chinese";
})(Language || (Language = {}));
var Compiler;
(function (Compiler) {
    Compiler["CCS"] = "ccs";
    Compiler["GCC"] = "gcc";
    Compiler["IAR"] = "iar";
    Compiler["TICLANG"] = "ticlang";
})(Compiler || (Compiler = {}));
var ViewLimitation;
(function (ViewLimitation) {
    ViewLimitation["AWS"] = "aws";
    ViewLimitation["E2E"] = "e2e";
    ViewLimitation["GUI_COMPOSER"] = "guicomposer";
    ViewLimitation["H_264_CODEC"] = "h264codec";
    ViewLimitation["NO_HTTPS"] = "nohttps";
    ViewLimitation["PARA_SOFT"] = "parasoft";
    ViewLimitation["ELPROTRONIC"] = "elprotronic";
    ViewLimitation["XELTEX"] = "xeltex";
    ViewLimitation["HI_LO_SYSTEMS"] = "hilosystems";
    ViewLimitation["TLS_MBED"] = "tlsmbed";
    ViewLimitation["TI_SENSOR_TAG"] = "tiSensortag";
    ViewLimitation["TI_TRAINING"] = "tiTraining";
    ViewLimitation["TI_C2000"] = "tiC2000";
    ViewLimitation["TI_WIKI"] = "tiWiki";
})(ViewLimitation || (ViewLimitation = {}));
var ProjectRestriction;
(function (ProjectRestriction) {
    ProjectRestriction["DESKTOP_ONLY"] = "desktopOnly";
    ProjectRestriction["CLOUD_ONLY"] = "cloudOnly";
})(ProjectRestriction || (ProjectRestriction = {}));
var FileExt;
(function (FileExt) {
    FileExt["C"] = ".c";
    FileExt["CPP"] = ".cpp";
    FileExt["H"] = ".h";
    FileExt["ASM"] = ".asm";
    FileExt["ZIP"] = ".zip";
    FileExt["PDF"] = ".pdf";
    FileExt["HTML"] = ".html";
    FileExt["PROJSPEC"] = ".projspec";
})(FileExt || (FileExt = {}));
var PkgRequired;
(function (PkgRequired) {
    PkgRequired["MANDATORY"] = "mandatory";
    PkgRequired["OPTIONAL"] = "optional";
})(PkgRequired || (PkgRequired = {}));
var Dependency;
(function (Dependency) {
    Dependency["PACKAGE_ID"] = "packageId";
    Dependency["VERSION"] = "version";
})(Dependency || (exports.Dependency = Dependency = {}));
var Require;
(function (Require) {
    Require[Require["Mandatory"] = 0] = "Mandatory";
    Require[Require["Optional"] = 1] = "Optional";
    Require[Require["Recommended"] = 2] = "Recommended";
    Require[Require["RecommendedX"] = 3] = "RecommendedX";
    Require[Require["MandatoryAllowEmpty"] = 4] = "MandatoryAllowEmpty";
    Require[Require["MandatoryForExample"] = 5] = "MandatoryForExample";
})(Require || (exports.Require = Require = {}));
var DataType;
(function (DataType) {
    DataType[DataType["Any"] = 0] = "Any";
    DataType[DataType["Boolean"] = 1] = "Boolean";
    DataType[DataType["Number"] = 2] = "Number";
    DataType[DataType["String"] = 3] = "String";
    DataType[DataType["ArrayString"] = 4] = "ArrayString";
    DataType[DataType["ArrayArrayString"] = 5] = "ArrayArrayString";
    DataType[DataType["Object"] = 6] = "Object";
    DataType[DataType["ArrayObject"] = 7] = "ArrayObject"; // object[]
})(DataType || (exports.DataType = DataType = {}));
var SemanticType;
(function (SemanticType) {
    SemanticType[SemanticType["Any"] = 0] = "Any";
    SemanticType[SemanticType["NonEmpty"] = 1] = "NonEmpty";
    SemanticType[SemanticType["NoSpecialChar"] = 2] = "NoSpecialChar";
    SemanticType[SemanticType["NoSpecialCharStrict"] = 3] = "NoSpecialCharStrict";
    SemanticType[SemanticType["MetadataVersion"] = 4] = "MetadataVersion";
    SemanticType[SemanticType["PackageVersion"] = 5] = "PackageVersion";
    SemanticType[SemanticType["PredefinedString"] = 6] = "PredefinedString";
    SemanticType[SemanticType["HTMLString"] = 7] = "HTMLString";
    SemanticType[SemanticType["RelativePath"] = 8] = "RelativePath";
    SemanticType[SemanticType["URL"] = 9] = "URL";
    SemanticType[SemanticType["RelativePathOrURL"] = 10] = "RelativePathOrURL";
    SemanticType[SemanticType["Semver"] = 11] = "Semver";
    SemanticType[SemanticType["Unknown"] = 12] = "Unknown";
})(SemanticType || (exports.SemanticType = SemanticType = {}));
class MetaFieldSchema {
    field;
    dataType;
    descriptiopn;
    example;
    required;
    semantic;
    extras;
    extrasOptional;
    constructor(field, required, dataType, semantic, descriptiopn, example, extras, extrasOptional) {
        this.field = field;
        this.dataType = dataType;
        this.descriptiopn = descriptiopn;
        this.example = example;
        this.required = required;
        this.semantic = semantic;
        this.extras = extras;
        this.extrasOptional = extrasOptional;
    }
    clone() {
        const newObj = {};
        Object.assign(newObj, this);
        return newObj;
    }
}
exports.MetaFieldSchema = MetaFieldSchema;
exports.Priority = {
    emergency: 'emergency',
    alert: 'alert',
    critical: 'critical',
    error: 'error',
    warning: 'warning',
    recommended: 'recommended',
    notice: 'notice',
    info: 'info',
    debug: 'debug',
    fine: 'fine',
    finer: 'finer',
    finest: 'finest'
};
class RuleEntity {
    priority;
    enable;
    message;
    func;
}
exports.RuleEntity = RuleEntity;
// prettier-ignore
class RuleSettings {
    GenericError = { priority: exports.Priority.error, enable: true, message: '%s' };
    DuplicateMacro = { priority: exports.Priority.error, enable: true, message: 'Macro "%s" defined in multiple places' };
    DuplicateElements = { priority: exports.Priority.error, enable: true, message: '"%s" Has duplicate elements. Elements need to be unique' };
    DependencyExists = { priority: exports.Priority.error, enable: true, message: 'Dependency not found: "%s"' };
    EmptyObj = { priority: exports.Priority.error, enable: true, message: '"%s" is null, empty or missing' };
    FieldDefined = { priority: exports.Priority.error, enable: true, message: '"%s" is required but not defined' };
    FieldDefinedNot = { priority: exports.Priority.error, enable: true, message: '"%s" should not be defined' };
    FieldFileExists = { priority: exports.Priority.error, enable: true, message: '"%s" specified file not found: "%s"' };
    FileExists = { priority: exports.Priority.error, enable: true, message: 'File not found: "%s"' };
    ItemListed = { priority: exports.Priority.error, enable: true, message: '"%s" in "%s" is not recognized. Allowable values are [%s]' };
    NonEmptyContent = { priority: exports.Priority.error, enable: true, message: '"%s" is empty' };
    NoSpecialChar = { priority: exports.Priority.error, enable: true, message: '"%s" has special character \'%s\' not allowed in "%s"' };
    NotSupported = { priority: exports.Priority.error, enable: true, message: 'Is not supported' };
    OnlyOneElement = { priority: exports.Priority.error, enable: true, message: '"%s" should only have one element in its array' };
    Semver = { priority: exports.Priority.error, enable: true, message: '"%s" has invalid semver: %s' };
    StringFormat = { priority: exports.Priority.error, enable: true, message: '"%s" is not in format of "%s"' };
    AssertSortValue = { priority: exports.Priority.error, enable: true, message: '"%s" must have a value of "filesAndFoldersAlphabetical", "manual" or "default"' };
    ValidCoreType = { priority: exports.Priority.error, enable: true, message: 'Invalid core dataType' };
    ValidDevice = { priority: exports.Priority.error, enable: true, message: 'Invalid device' };
    ValidDevTool = { priority: exports.Priority.error, enable: true, message: 'Invalid devtool' };
    ValidHtml = { priority: exports.Priority.error, enable: true, message: '"%s" has invalid HTML body' };
    ValidLocalPath = { priority: exports.Priority.error, enable: true, message: '"%s" contains invalid local path: "%s"' };
    ValidUrl = { priority: exports.Priority.error, enable: true, message: '"%s" has invalid link: "%s"' };
    WrongType = { priority: exports.Priority.error, enable: true, message: 'Datatype for "%s" should be a "%s"' };
    WrongObjectType = { priority: exports.Priority.error, enable: true, message: '"%s" is missing in "%s"' };
    //
    EmptyOptional = { priority: exports.Priority.warning, enable: true, message: '"%s" is empty, should fill in content or remove' };
    FileExistsNot = { priority: exports.Priority.warning, enable: true, message: 'File should not exist: "%s"' };
    GenericWarning = { priority: exports.Priority.warning, enable: true, message: '%s' };
    InSpec = { priority: exports.Priority.warning, enable: true, message: '"%s" is not a valid field' };
    InSpecSuggest = { priority: exports.Priority.warning, enable: true, message: '"%s" is not a valid field; do you mean: "%s"' };
    ItemListedOptional = { priority: exports.Priority.warning, enable: true, message: '"%s" in "%s" is not recognized. Allowable values are [%s]' };
    //
    OneOrMore = { priority: exports.Priority.recommended, enable: true, message: '"%s" At least one of the listed field is recommended: [%s]' };
    Recommended = { priority: exports.Priority.recommended, enable: true, message: '"%s" is recommended but not defined' };
    //
    VersionSupport = { priority: exports.Priority.info, enable: true, message: '"%s" value "%s" is not compatible with "%s"...skipping this package' };
    GenericInfo = { priority: exports.Priority.info, enable: true, message: '%s' };
}
exports.RuleSettings = RuleSettings;
exports.gRuleSettings = new RuleSettings(); // global rule settings
const allMainCategory = [];
exports.DEVTOOLS_METADATA_SCHEMA = {
    id: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NoSpecialCharStrict,
        description: '',
        example: ''
    },
    name: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    type: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: DevtoolType
    },
    image: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: ''
    },
    connections: {
        required: Require.Mandatory,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: 'CCS connection files list',
        example: ''
    },
    description: {
        required: Require.RecommendedX,
        dataType: DataType.String,
        semantic: SemanticType.HTMLString,
        description: '',
        example: '',
        extras: ['descriptionLocation']
    },
    descriptionLocation: {
        required: Require.RecommendedX,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: '',
        extras: ['description']
    },
    devices: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: 'Device IDs list from Device definitions',
        example: ''
    },
    buyLink: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.URL,
        description: '',
        example: ''
    },
    toolsPage: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.URL,
        description: '',
        example: ''
    },
    aliases: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    }
};
exports.DEVICES_METADATA_SCHEMA = {
    id: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NoSpecialCharStrict,
        description: '',
        example: ''
    },
    name: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    type: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '[family, subfamily, device]',
        example: '',
        extras: DeviceType
    },
    parent: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '"device" string',
        example: ''
    },
    coreTypes: {
        required: Require.Optional,
        dataType: DataType.ArrayObject,
        semantic: SemanticType.NonEmpty,
        description: 'coreType[]',
        example: ''
    },
    description: {
        required: Require.RecommendedX,
        dataType: DataType.String,
        semantic: SemanticType.HTMLString,
        description: '',
        example: '',
        extras: ['descriptionLocation']
    },
    descriptionLocation: {
        required: Require.RecommendedX,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: '',
        extras: ['description']
    },
    image: {
        required: Require.Recommended,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: ''
    },
    aliases: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    }
};
exports.CONTENT_METADATA_SCHEMA = {
    sort: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    localId: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    localAliases: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    globalAliases: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    name: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    resourceType: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: ResourceType
    },
    resourceClass: {
        required: Require.Mandatory,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: ResourceClass
    },
    resourceSubClass: {
        required: Require.MandatoryForExample,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: ResourceSubClass
    },
    location: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.RelativePathOrURL,
        description: '',
        example: ''
    },
    mainCategories: {
        required: Require.Mandatory,
        dataType: DataType.ArrayArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extrasOptional: allMainCategory.concat(Object.values(MainCategory), Object.values(MainCategorySubDocs))
    },
    subCategories: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    devices: {
        required: Require.Recommended,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    devtools: {
        required: Require.Recommended,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    tags: {
        required: Require.Recommended,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    coreTypes: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    fileType: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: FileExt
    },
    description: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.HTMLString,
        description: '',
        example: ''
    },
    shortDescription: {
        required: Require.Recommended,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    icon: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: ''
    },
    ide: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: IDE
    },
    hostOS: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: HostOS
    },
    kernel: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: Kernel
    },
    language: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: Language
    },
    compiler: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: Compiler
    },
    viewLimitations: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: ViewLimitation
    },
    projectRestriction: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: ProjectRestriction
    },
    advanced: {
        required: Require.Optional,
        dataType: DataType.Object,
        semantic: SemanticType.Unknown,
        description: '??',
        example: ''
    }
};
exports.TEXT_MACROS_METADATA_SCHEMA = {
    textmacro: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NoSpecialChar,
        description: '',
        example: ''
    },
    value: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    comment: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    }
};
exports.ARRAY_MACROS_METADATA_SCHEMA = {
    arraymacro: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NoSpecialChar,
        description: '',
        example: ''
    },
    value: {
        required: Require.Mandatory,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NoSpecialChar,
        description: '',
        example: ''
    },
    comment: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    }
};
exports.SET_MACROS_METADATA_SCHEMA = {
    setmacro: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NoSpecialChar,
        description: '',
        example: ''
    },
    fields: {
        required: Require.Mandatory,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NoSpecialChar,
        description: '',
        example: ''
    },
    values: {
        required: Require.Mandatory,
        dataType: DataType.ArrayObject,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    comment: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    }
};
exports.PACKAGE_METADATA_SCHEMA = {
    metadataVersion: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.MetadataVersion,
        description: 'x.xx.xx',
        example: ''
    },
    id: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NoSpecialCharStrict,
        description: '',
        example: ''
    },
    version: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.PackageVersion,
        description: 'x.xx.xx.xxxx',
        example: ''
    },
    name: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    type: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: PackageType
    },
    subType: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: PackageSubType
    },
    featureType: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: FeatureType
    },
    ccsVersion: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    ccsInstallLocation: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    image: {
        required: Require.Recommended,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: ''
    },
    description: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.HTMLString,
        description: '',
        example: ''
    },
    devices: {
        required: Require.Mandatory,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    devtools: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    tags: {
        required: Require.Recommended,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    license: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.RelativePath,
        description: '',
        example: ''
    },
    hideNodeDirPanel: {
        required: Require.Optional,
        dataType: DataType.Boolean,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    supplements: {
        required: Require.Optional,
        dataType: DataType.Object,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    dependencies: {
        required: Require.Optional,
        dataType: DataType.ArrayObject,
        semantic: SemanticType.NonEmpty,
        description: 'packageInfo[]',
        example: ''
    },
    rootCategory: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    restrictions: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: Restriction
    },
    location: {
        required: Require.Optional,
        dataType: DataType.String,
        semantic: SemanticType.RelativePathOrURL,
        description: '',
        example: ''
    },
    aliases: {
        required: Require.Optional,
        dataType: DataType.ArrayString,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    }
};
exports.SUPPLEMENTS_METADATA_SCHEMA = {
    packageId: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    semver: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.Semver,
        description: '',
        example: ''
    }
};
exports.DEPENDENCIES_METADATA_SCHEMA = {
    packageId: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    version: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.NonEmpty,
        description: '',
        example: ''
    },
    require: {
        required: Require.Mandatory,
        dataType: DataType.String,
        semantic: SemanticType.PredefinedString,
        description: '',
        example: '',
        extras: PkgRequired
    }
};
