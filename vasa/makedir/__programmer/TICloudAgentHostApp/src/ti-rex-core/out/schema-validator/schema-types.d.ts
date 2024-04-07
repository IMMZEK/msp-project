import { PackageType as PkgType } from '../lib/dbBuilder/dbTypes';
export interface MetaVer {
    major: number;
    minor: number;
    patch: number;
}
export declare const cfgMetaVer: MetaVer;
interface Schema {
    required: Require;
    dataType: DataType;
    semantic: SemanticType;
    description: string;
    example: string;
    extras?: any;
    extrasOptional?: any;
}
export interface MetadataSchema {
    [fieldName: string]: Schema;
}
export interface PackageDefinition {
    id: string;
    version: string;
    packageFolder: string;
    type?: PkgType;
}
export declare const enum MetadataFile {
    METADATA_ROOT = ".metadata",
    TIREX_ROOT = ".tirex",
    PACKAGE = "package.tirex.json",
    DEVICES = "devices.tirex.json",
    DEVTOOLS = "devtools.tirex.json",
    DEVTOOLS_AUX = "devtools-aux.tirex.json",
    CONTENT = "content.tirex.json",
    MACROS = "macros.tirex.json",
    DEPENDENCY = "dependency.tirex.json"
}
export declare enum PackageType {
    DEVICES = "devices",
    DEVTOOLS = "devtools",
    SOFTWARE = "software"
}
export declare enum PackageSubType {
    CCS_COMPONENT = "ccsComponent",
    FEATURE_SUPPORT = "featureSupport"
}
export declare enum FeatureType {
    DEVICE_SUPPORT = "deviceSupport",
    TOOLS = "tools",
    COMPILER = "compiler",
    CCS_CORE = "ccsCore"
}
export declare enum DeviceType {
    DEVICE = "device",
    FAMILY = "family",
    SUBFAMILY = "subfamily"
}
export declare enum ResourceType {
    PROJ_CCS = "project.ccs",
    PROJ_ENERGIA = "project.energia",
    PROJ_IAR = "project.iar",
    PROJ_KEIL = "project.keil",
    FILE = "file",
    FILE_IMPORTABLE = "file.importable",
    FILE_EXECUTABLE = "file.executable",
    FOLDER = "folder",
    FOLGER_IMPORTABLE = "folder.importable",
    WEB_PAGE = "web.page",
    WEB_APP = "web.app",
    CATEGORY_INFO = "categoryInfo",
    OTHER = "other"
}
export declare enum ResourceClass {
    EXAMPLE = "example",
    DOCUMENT = "document",
    OTHER = "other"
}
export declare enum MainCategory {
    DEVICES = "Devices",
    DEVTOOLS = "Development Tools",
    DOCUMENTS = "Documents",
    EXAMPLES = "Examples"
}
export declare enum MainCategorySubDocs {
    DATASHEET = "Datasheet",
    ERRATA = "Errata",
    WIKI = "Wiki",
    WHITE_PAPERS = "White papers",
    REFERENCE_DESIGNS = "Reference designs",
    SOLUTION_GUIDES = "Solution guides",
    SELECTION_GUIDES = "Selection guides",
    USER_GUIDES = "User guides",
    APPLICATION_NOTES = "Application notes"
}
export declare enum DevtoolType {
    BOARD = "board",
    IDE = "ide",
    PROBE = "probe",
    PROGRAMMER = "programmer",
    UTILITY = "utility"
}
export declare enum Dependency {
    PACKAGE_ID = "packageId",
    VERSION = "version"
}
export declare const enum Content {
    LOCATION = "location"
}
export declare const enum Devtools {
    BUY_LINK = "buyLink",
    TOOLS_PAGE = "toolsPage"
}
export declare enum Require {
    Mandatory = 0,
    Optional = 1,
    Recommended = 2,
    RecommendedX = 3,
    MandatoryAllowEmpty = 4,
    MandatoryForExample = 5
}
export declare enum DataType {
    Any = 0,
    Boolean = 1,
    Number = 2,
    String = 3,
    ArrayString = 4,
    ArrayArrayString = 5,
    Object = 6,
    ArrayObject = 7
}
export declare enum SemanticType {
    Any = 0,
    NonEmpty = 1,
    NoSpecialChar = 2,
    NoSpecialCharStrict = 3,
    MetadataVersion = 4,
    PackageVersion = 5,
    PredefinedString = 6,
    HTMLString = 7,
    RelativePath = 8,
    URL = 9,
    RelativePathOrURL = 10,
    Semver = 11,
    Unknown = 12
}
export interface IRecord {
    [key: string]: any;
}
export interface Ignore {
    field: string;
    after?: number;
    count?: number;
}
interface Package {
    id: string;
    versions: string[];
}
export interface VSettings {
    ignoreFields: Ignore[];
    logLimit: number;
    ignorePackages?: Package[];
    logLimits?: {
        [key: string]: number;
    };
}
export declare class MetaFieldSchema {
    readonly field: string;
    readonly dataType: DataType;
    readonly descriptiopn: string;
    readonly example: string;
    required: Require;
    semantic: SemanticType;
    extras?: any;
    extrasOptional?: any;
    constructor(field: string, required: Require, dataType: DataType, semantic: SemanticType, descriptiopn: string, example: string, extras?: any, extrasOptional?: any);
    clone(): MetaFieldSchema;
}
export declare const Priority: {
    [key: string]: string;
};
interface RuleFuncArgs {
    field: string | string[];
    record: IRecord;
    argBool?: boolean;
    argStr?: string | string[];
    argNum?: number;
}
type ruleFuncType = (args: RuleFuncArgs) => boolean;
export declare class RuleEntity {
    priority: string;
    enable: boolean;
    message: string;
    func?: ruleFuncType;
}
export interface RuleSummary {
    priority: string;
    message: string;
    count: number;
}
export declare class RuleSettings {
    GenericError: RuleEntity;
    DuplicateMacro: RuleEntity;
    DuplicateElements: RuleEntity;
    DependencyExists: RuleEntity;
    EmptyObj: RuleEntity;
    FieldDefined: RuleEntity;
    FieldDefinedNot: RuleEntity;
    FieldFileExists: RuleEntity;
    FileExists: RuleEntity;
    ItemListed: RuleEntity;
    NonEmptyContent: RuleEntity;
    NoSpecialChar: RuleEntity;
    NotSupported: RuleEntity;
    OnlyOneElement: RuleEntity;
    Semver: RuleEntity;
    StringFormat: RuleEntity;
    AssertSortValue: RuleEntity;
    ValidCoreType: RuleEntity;
    ValidDevice: RuleEntity;
    ValidDevTool: RuleEntity;
    ValidHtml: RuleEntity;
    ValidLocalPath: RuleEntity;
    ValidUrl: RuleEntity;
    WrongType: RuleEntity;
    WrongObjectType: RuleEntity;
    EmptyOptional: RuleEntity;
    FileExistsNot: RuleEntity;
    GenericWarning: RuleEntity;
    InSpec: RuleEntity;
    InSpecSuggest: RuleEntity;
    ItemListedOptional: RuleEntity;
    OneOrMore: RuleEntity;
    Recommended: RuleEntity;
    VersionSupport: RuleEntity;
    GenericInfo: RuleEntity;
}
export declare const gRuleSettings: RuleSettings;
export declare const DEVTOOLS_METADATA_SCHEMA: MetadataSchema;
export declare const DEVICES_METADATA_SCHEMA: MetadataSchema;
export declare const CONTENT_METADATA_SCHEMA: MetadataSchema;
export declare const TEXT_MACROS_METADATA_SCHEMA: MetadataSchema;
export declare const ARRAY_MACROS_METADATA_SCHEMA: MetadataSchema;
export declare const SET_MACROS_METADATA_SCHEMA: MetadataSchema;
export declare const PACKAGE_METADATA_SCHEMA: MetadataSchema;
export declare const SUPPLEMENTS_METADATA_SCHEMA: MetadataSchema;
export declare const DEPENDENCIES_METADATA_SCHEMA: MetadataSchema;
export {};
