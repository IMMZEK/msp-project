export declare namespace License {
    function accept(): Promise<void>;
    function decline(): Promise<void>;
    function verifyLicense(): Promise<void>;
    function verifyNoLicense(): Promise<void>;
}
