export interface InstalledPackage {
    name: string;
    packagePublicId: string;
    packageVersion: string;
    packagePublicUid: string;
    localPackagePath: string;
    subType: 'ccsComponent' | 'featureSupport' | null;
    featureType: 'deviceSupport' | 'tools' | 'compiler' | 'ccsCore' | null;
    ccsVersion: string | null;
}
