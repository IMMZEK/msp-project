"use strict";
/**
 * Remote server functions for Download
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePackageZipForOS = exports.resolveDownloadLinkForOS = void 0;
const response_data_1 = require("../shared/routes/response-data");
/**
 *
 * @param linkForDownload
 * @returns {*}
 */
function resolveDownloadLinkForOS(linkForDownload, clientInfo) {
    /*
     from https://github.com/faisalman/ua-parser-js:

     # Possible 'os.name'
     AIX, Amiga OS, Android, Arch, Bada, BeOS, BlackBerry, CentOS, Chromium OS, Contiki,
     Fedora, Firefox OS, FreeBSD, Debian, DragonFly, Gentoo, GNU, Haiku, Hurd, iOS,
     Joli, Linpus, Linux, Mac OS, Mageia, Mandriva, MeeGo, Minix, Mint, Morph OS, NetBSD,
     Nintendo, OpenBSD, OpenVMS, OS/2, Palm, PCLinuxOS, Plan9, Playstation, QNX, RedHat,
     RIM Tablet OS, RISC OS, Sailfish, Series40, Slackware, Solaris, SUSE, Symbian, Tizen,
     Ubuntu, UNIX, VectorLinux, WebOS, Windows [Phone/Mobile], Zenwalk

     # Possible 'cpu.architecture'
     68k, amd64, arm, arm64, avr, ia32, ia64, irix, irix64, mips, mips64, pa-risc,
     ppc, sparc, sparc64
     */
    if (!linkForDownload) {
        return undefined;
    }
    // Always check specific archs first
    if (/Linux|CentOS|Fedora|FreeBSD|Debian|OpenBSD|SUSE|Ubuntu/.test(clientInfo.OS)) {
        if (linkForDownload.linux64 != null && /amd64/.test(clientInfo.arch)) {
            return linkForDownload.linux64;
        }
        if (linkForDownload.linux32 != null && /ia32/.test(clientInfo.arch)) {
            return linkForDownload.linux32;
        }
        if (linkForDownload.linux != null) {
            return linkForDownload.linux;
        }
    }
    if (/Windows/.test(clientInfo.OS)) {
        if (linkForDownload.win64 != null && /amd64/.test(clientInfo.arch)) {
            return linkForDownload.win64;
        }
        if (linkForDownload.win32 != null && /ia32/.test(clientInfo.arch)) {
            return linkForDownload.win32;
        }
        if (linkForDownload.win != null) {
            return linkForDownload.win;
        }
    }
    if (/Mac OS/.test(clientInfo.OS)) {
        if (linkForDownload.macos != null) {
            return linkForDownload.macos;
        }
    }
    if (linkForDownload.any != null) {
        return linkForDownload.any;
    }
    return undefined;
}
exports.resolveDownloadLinkForOS = resolveDownloadLinkForOS;
/**
 *
 * @param os
 * @returns 'linux','win' or 'macos'
 */
function resolvePackageZipForOS(os) {
    /*
     from https://github.com/faisalman/ua-parser-js:

     # Possible 'os'
     AIX, Amiga OS, Android, Arch, Bada, BeOS, BlackBerry, CentOS, Chromium OS, Contiki,
     Fedora, Firefox OS, FreeBSD, Debian, DragonFly, Gentoo, GNU, Haiku, Hurd, iOS,
     Joli, Linpus, Linux, Mac OS, Mageia, Mandriva, MeeGo, Minix, Mint, Morph OS, NetBSD,
     Nintendo, OpenBSD, OpenVMS, OS/2, Palm, PCLinuxOS, Plan9, Playstation, QNX, RedHat,
     RIM Tablet OS, RISC OS, Sailfish, Series40, Slackware, Solaris, SUSE, Symbian, Tizen,
     Ubuntu, UNIX, VectorLinux, WebOS, Windows [Phone/Mobile], Zenwalk
     */
    if (/Linux|CentOS|Fedora|FreeBSD|Debian|OpenBSD|SUSE|Ubuntu/.test(os)) {
        return response_data_1.Platform.LINUX;
    }
    if (/Windows/.test(os)) {
        return response_data_1.Platform.WINDOWS;
    }
    if (/Mac OS/.test(os)) {
        return response_data_1.Platform.MACOS;
    }
    // This for tests
    return response_data_1.Platform.LINUX;
}
exports.resolvePackageZipForOS = resolvePackageZipForOS;
