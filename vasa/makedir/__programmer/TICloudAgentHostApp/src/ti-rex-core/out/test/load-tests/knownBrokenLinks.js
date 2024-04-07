"use strict";
// These are content links that are broken in the metadata and which the load tests should ignore
Object.defineProperty(exports, "__esModule", { value: true });
exports.knownBrokenLinks = void 0;
exports.knownBrokenLinks = [
    // https://jira.itg.ti.com/browse/REX-2369
    /content\/tirex-product-tree\/msp430_devtools_.*\/.metadata\/.tirex\/.*examples\/boards\/MSP-EXP430G2\/MSP-EXP430G2 Hardware Design Files\/Hardware\/MSP-EXP430G2 LaunchPad Gerbers \(Eagle\)\/.*/,
    // https://jira.itg.ti.com/browse/REX-2831
    /iec60730\/release_notes_iec60730___IEC_VERS__.html/,
    /iec60730\/doc\/MSP430_IEC60730_Software_Package_Users_Guide-__IEC_VERS__.pdf/,
    // https://jira.itg.ti.com/browse/REX-2832
    /content\/C2000Ware_DigitalPower_SDK_.*\/solutions\/tida_01604\/f28004x\/pfc1ph3ilttpl\/.*/,
    /content\/C2000Ware_.*\/libraries\/.*project/,
    /content\/tivaware_c_series_.*\/usblib\/ccs\/\..*/
];
