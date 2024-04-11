import struct

BOOTLOADER_UNIFLASH_BUF_SIZE                         = 1024*1024 # 1 MB This has to be a 256 KB aligned value, because flash writes will be block oriented
BOOTLOADER_UNIFLASH_HEADER_SIZE                      = 32 # 32 B

BOOTLOADER_UNIFLASH_FILE_HEADER_MAGIC_NUMBER         = bytearray([0x42, 0x4C ,0x55, 0x46]) # BLUF
BOOTLOADER_UNIFLASH_RESP_HEADER_MAGIC_NUMBER         = 0x52554C42 # BLUR

BOOTLOADER_UNIFLASH_OPTYPE_FLASH                     = bytearray([0xF0, 0x00, 0x00, 0x00])

BOOTLOADER_UNIFLASH_IMAGE_TYPE_MULTICORE             = bytearray([0x4D, 0x43, 0x00, 0x00]) # MC
BOOTLOADER_UNIFLASH_IMAGE_TYPE_UBOOT                 = bytearray([0x55, 0x42, 0x00, 0x00]) # UB

BOOTLOADER_UNIFLASH_STATUSCODE_SUCCESS                = 0x00000000
BOOTLOADER_UNIFLASH_STATUSCODE_MAGIC_ERROR            = 0x10000001
BOOTLOADER_UNIFLASH_STATUSCODE_OPTYPE_ERROR           = 0x20000001
BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERROR            = 0x30000001
BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_VERIFY_ERROR     = 0x40000001
BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERASE_ERROR      = 0x50000001


statuscodes = {
    BOOTLOADER_UNIFLASH_STATUSCODE_SUCCESS : "[STATUS] SUCCESS !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_MAGIC_ERROR : "[STATUS] ERROR: Incorrect magic number in file header !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_OPTYPE_ERROR : "[STATUS] ERROR: Invalid file operation type sent !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERROR : "[STATUS] ERROR: Flashing failed !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_VERIFY_ERROR : "[STATUS] ERROR: Flash verify failed !!!\n",
    BOOTLOADER_UNIFLASH_STATUSCODE_FLASH_ERASE_ERROR : "[STATUS] ERROR: Flash erase failed !!!\n",
}


FP_TRACE_LEVEL_FATAL   = 3
FP_TRACE_LEVEL_ERROR   = 2
FP_TRACE_LEVEL_WARNING = 1
FP_TRACE_LEVEL_INFO    = 0

TMP_SUFFIX = ".tmp"

# Add the file header with metadata to the file to be sent. Expects a validated linecfg
def create_temp_file(filename, offset):
    tempfilename = filename + TMP_SUFFIX

    f = open(tempfilename, "wb")

    rsv_byte_arr = bytearray([0xBE, 0xBA, 0xAD, 0xDE])
    # add header
    # add magic number
    f.write(BOOTLOADER_UNIFLASH_FILE_HEADER_MAGIC_NUMBER)
    f.write(BOOTLOADER_UNIFLASH_OPTYPE_FLASH)

    offset_byte_arr = bytearray([offset & 0xFF, (offset>>8) & 0xFF, (offset>>16) & 0xFF, (offset>>24) & 0xFF])
    f.write(offset_byte_arr)

    f.write(rsv_byte_arr)

    # fill reserved bytes (4 reserved bytes now)
    for _ in range(0, 4):
        f.write(rsv_byte_arr)

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

    resp_magic = struct.unpack("i",resp_bytes[0:4])[0]
    resp_status = struct.unpack("i",resp_bytes[4:8])[0]

    if(resp_magic == BOOTLOADER_UNIFLASH_RESP_HEADER_MAGIC_NUMBER):
        if resp_status in statuscodes.keys():
            status = statuscodes[resp_status]
        else:
            status = "[ERROR] Invalid status code in response !!!"
    else:
        status = "[ERROR] Incorrect magic number in Response Header !!!"

    return status

