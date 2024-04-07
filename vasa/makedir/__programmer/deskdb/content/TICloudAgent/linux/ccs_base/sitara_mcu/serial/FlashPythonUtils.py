import struct
import os

CONST_KB = 1024
CONST_MB = CONST_KB * CONST_KB

# This has to be a 256 KB aligned value, because flash writes will be block oriented
BOOTLOADER_UNIFLASH_BUF_SIZE = CONST_MB
BOOTLOADER_UNIFLASH_HEADER_SIZE = 32  # 32 B

BOOTLOADER_UNIFLASH_FILE_HEADER_MAGIC_NUMBER = 0x46554C42  # BLUF
BOOTLOADER_UNIFLASH_RESP_HEADER_MAGIC_NUMBER = 0x52554C42  # BLUR

BOOTLOADER_UNIFLASH_OPTYPE_FLASH = 0xF0
BOOTLOADER_UNIFLASH_OPTYPE_FLASH_VERIFY = 0xF1
BOOTLOADER_UNIFLASH_OPTYPE_FLASH_XIP = 0xF2
BOOTLOADER_UNIFLASH_OPTYPE_FLASH_VERIFY_XIP = 0xF3
BOOTLOADER_UNIFLASH_OPTYPE_FLASH_TUNING_DATA = 0xF4
BOOTLOADER_UNIFLASH_OPTYPE_FLASH_ERASE = 0xFE
BOOTLOADER_UNIFLASH_OPTYPE_EMMC_FLASH = 0xF5
BOOTLOADER_UNIFLASH_OPTYPE_EMMC_VERIFY = 0xF6

BOOTLOADER_UNIFLASH_STATUSCODE_SUCCESS = 0x00000000
BOOTLOADER_UNIFLASH_STATUSCODE_MAGIC_ERROR = 0x10000001
BOOTLOADER_UNIFLASH_STATUSCODE_OPTYPE_ERROR = 0x20000001
BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERROR = 0x30000001
BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_VERIFY_ERROR = 0x40000001
BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERASE_ERROR = 0x50000001

optypewords = {
    "flash": BOOTLOADER_UNIFLASH_OPTYPE_FLASH,
    "flashverify": BOOTLOADER_UNIFLASH_OPTYPE_FLASH_VERIFY,
    "flash-xip": BOOTLOADER_UNIFLASH_OPTYPE_FLASH_XIP,
    "flashverify-xip": BOOTLOADER_UNIFLASH_OPTYPE_FLASH_VERIFY_XIP,
    "flash-phy-tuning-data": BOOTLOADER_UNIFLASH_OPTYPE_FLASH_TUNING_DATA,
    "erase": BOOTLOADER_UNIFLASH_OPTYPE_FLASH_ERASE,
    "flash-emmc": BOOTLOADER_UNIFLASH_OPTYPE_EMMC_FLASH,
    "flashverify-emmc": BOOTLOADER_UNIFLASH_OPTYPE_EMMC_VERIFY,
}


statuscodes = {
    BOOTLOADER_UNIFLASH_STATUSCODE_SUCCESS: "[STATUS] SUCCESS !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_MAGIC_ERROR: "[STATUS] ERROR: Incorrect magic number in file header !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_OPTYPE_ERROR: "[STATUS] ERROR: Invalid file operation type sent !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERROR: "[STATUS] ERROR: Flashing failed !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_VERIFY_ERROR: "[STATUS] ERROR: Flash verify failed !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERASE_ERROR: "[STATUS] ERROR: Flash erase failed !!!\n",
}

devices = ["am243", "am263p", "am263", "am273"]
# Default path of flash writer
default_flashwriter = {
    "am243x": {"EVM": "am243x_alv.release.tiimage", "LP": "am243x_alx.release.tiimage"},
    "am263x": {"CC": "am263x.release.tiimage"},
    "am263px": {"CC": "am263px.release.tiimage"},
    "am273x": {"EVM": "am273x.release.tiimage"},
}

default_device_config = {
    "am243x": {
        "sbl_offset": 0x0,
        "app_offset": 0x80000,
        "xip_offset": 0x0,
        "xip_support": True
    },
    "am263x": {
        "sbl_offset": 0x0,
        "app_offset": 0x80000,
        "xip_offset": 0x0,
        "xip_support": False
    },
    "am263px": {
        "sbl_offset": 0x0,
        "app_offset": 0x80000,
        "xip_offset": 0x0,
        "xip_support": True
    },
    "am273x": {
        "sbl_offset": 0x0,
        "app_offset": 0xA0000,
        "xip_offset": 0x0,
        "xip_support": False
    },
}

supported_file_types = {'tiimage', 'appimage',
                        'appimage.hs_fs', 'appimage.hs', 'xip'}

file_offset_type = {
    "tiimage": "sbl_offset",
    "appimage": "app_offset",
    "appimage.hs_fs": "app_offset",
    "appimage.hs": "app_offset",
    "xip": "xip_offset",
}

TMP_SUFFIX = ".tmp"

# Add the file header with metadata to the file to be sent. Expects a validated linecfg


def create_temp_file(filename, offset, optype):
    '''
    File header struct used in the target side :

    typedef struct Bootloader_UniflashFileHeader_s
    {
        uint32_t magicNumber;
        /* BOOTLOADER_UNIFLASH_FILE_HEADER_MAGIC_NUMBER */

        uint32_t operationTypeAndFlags;
        /* LSByte - Operation Type:flash, verify flash or erase */

        uint32_t offset;
        /* Offset to flash, verify flash or erase flash */

        uint32_t eraseSize;
        /* Size of flash to erase */

        uint32_t actualFileSize;
        /* Size of the file sent. This is needed because xmodem returns a padded file size */

        uint32_t rsv1;
        uint32_t rsv2;
        uint32_t rsv3;
        /* Reserved */
    } Bootloader_UniflashFileHeader;

    So we need to use same struct to pack in python
    '''
    file_header_str = '<LLLLLLLL'

    if (optype in ("erase", "flash-phy-tuning-data")):
        # No separate file required
        tempfilename = "{}_command".format(optype)
    else:
        tempfilename = filename + TMP_SUFFIX

    f = open(tempfilename, "wb")

    # Construct the header now, first define the reserved word
    rsv_word = 0xDEADBABE

    # Determine the offset if applicable
    offset_val = rsv_word
    if (optype not in ("flash-xip", "flashverify-xip", "flash-phy-tuning-data")):
        offset_val = offset

    # Determine the erase size if applicable
    erase_size_val = rsv_word
    if (optype in ("erase")):
        erase_size_val = 0

    # Determine the actual file size if applicable, no original file in case of erase or phy tuning
    actual_file_size = 0
    if (optype not in ("erase", "flash-phy-tuning-data")):
        actual_file_size = os.path.getsize(filename)

    file_header = struct.pack(file_header_str,
                              BOOTLOADER_UNIFLASH_FILE_HEADER_MAGIC_NUMBER,
                              optypewords[optype],
                              offset_val,
                              erase_size_val,
                              actual_file_size,
                              rsv_word, rsv_word, rsv_word
                              )
    # Write header to file
    f.write(file_header)

    # No original file in case of erase or phy tuning
    if (optype not in ("erase", "flash-phy-tuning-data")):
        # copy the original file to this file
        original_file = open(filename, "rb")
        f.write(original_file.read())
        original_file.close()

    f.close()

    return tempfilename

# Parse response header sent from EVM


def parse_response_evm(filename):
    f = open(filename, "rb")
    resp_bytes = f.read(16)
    f.close()

    status = None

    resp_magic = struct.unpack("i", resp_bytes[0:4])[0]
    resp_status = struct.unpack("i", resp_bytes[4:8])[0]

    if (resp_magic == BOOTLOADER_UNIFLASH_RESP_HEADER_MAGIC_NUMBER):
        if resp_status in statuscodes.keys():
            status = statuscodes[resp_status]
        else:
            status = "[ERROR] Invalid status code in response !!!"
    else:
        status = "[ERROR] Incorrect magic number in Response Header !!!"

    return status


def get_default_device_config(device):
    if device in default_device_config.keys():
        return default_device_config[device]
    return None


def get_file_offset(filename, device):
    device_cfg = get_default_device_config(device)
    filetype = [
        type for type in supported_file_types if filename.endswith(type)]
    if filetype:
        return device_cfg[file_offset_type[filetype[0]]]
    return None


def checkCCCPrint(ser):
    output = str(ser.read(size=1), 'UTF-8')
    if output == "C":
        return True
    else:
        return False


def get_device_name(partnum):
    if (partnum.lower().startswith("am243")):
        return "am243x"
    elif (partnum.lower().startswith("am263p")):
        return "am263px"
    elif (partnum.lower().startswith("am263")):
        return "am263x"
    elif (partnum.lower().startswith("am273")):
        return "am273x"
    else:
        return None


def is_hexadecimal_1(s):
    try:
        int(s, 16)
        return True
    except ValueError:
        return False
