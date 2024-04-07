import inspect
import sys
import time
import string
import struct
import serial
from serial import SerialException
import binascii
# TEST: This is needed for testing without the EVM.
# We keep it in the files since we set some global variables
# in this file that are defined in serialStub.py
import serialStub
# ----- TEST
import os
import subprocess
import time


#----------TEST-------------
# Set to True for testing without the EVM (faster)
# Set to False for production and to flash to the EVM
#STUBOUT_VALUE = True
STUBOUT_VALUE = False
#----------TEST-------------

DEFAULT_SERIAL_BAUD_RATE            = 115200
DEFAULT_CHUNK_SIZE                  = 240
MAX_FILE_SIZE                       = 1024*1024
MAX_APP_FILE_SIZE                   = 166912
FILE_HEADERSIZE                     = 4
AWR_CANCEL_MSG = "Cancel request detected...Ceasing flashing operation."

Files = {
"RadarSS_BUILD"            : struct.pack(">I",0),
"CALIB_DATA"               : struct.pack(">I",1),
"CONFIG_INFO"              : struct.pack(">I",2),
"MSS_BUILD"                : struct.pack(">I",3),
"META_IMAGE1"              : struct.pack(">I",4),
"META_IMAGE2"              : struct.pack(">I",5),
"META_IMAGE3"              : struct.pack(">I",6),
"META_IMAGE4"              : struct.pack(">I",7)
}

# Parts information and file headers
AWR12xx_PART_NUM  = "AWR12"
AWR14xx_PART_NUM  = "AWR14"
AWR16xx_PART_NUM  = "AWR16"
IWR12xx_PART_NUM  = "IWR12"
IWR14xx_PART_NUM  = "IWR14"
IWR16xx_PART_NUM  = "IWR16"
xWR12xx_PART_NUM  = "WR12"  # common root for xWR12 device names
xWR14xx_PART_NUM  = "WR14"  # common root for xWR14 device names
xWR16xx_PART_NUM  = "WR16"  # common root for xWR16 device names
xWR68xx_PART_NUM  = "WR68"  # common root for xWR68 device names
xWR18xx_PART_NUM  = "WR18"  # common root for xWR18 device names
AWR68xx_PART_NUM  = "AWR68"
AWR18xx_PART_NUM  = "AWR18"
IWR68xx_PART_NUM  = "IWR68"
IWR18xx_PART_NUM  = "IWR18"

PartNumSupported = [AWR12xx_PART_NUM, AWR14xx_PART_NUM, AWR16xx_PART_NUM, IWR12xx_PART_NUM, IWR14xx_PART_NUM, IWR16xx_PART_NUM, AWR68xx_PART_NUM, AWR18xx_PART_NUM, IWR68xx_PART_NUM, IWR18xx_PART_NUM]
OlderFileFormatParts = [AWR12xx_PART_NUM, IWR12xx_PART_NUM, IWR14xx_PART_NUM, AWR14xx_PART_NUM]
CONFIGFileParts = [IWR14xx_PART_NUM, AWR14xx_PART_NUM, AWR12xx_PART_NUM, IWR12xx_PART_NUM]

AWR_PRE_PG3_KEY = "PrePG3"
AWR_POST_PG3_KEY = "PostPG3"

FileHeaders = {
AWR_PRE_PG3_KEY :  {
xWR12xx_PART_NUM : { "headers" : [0xB5500000,0x35500000,0xCA11BDA7,0xC0F1618F],
                     "fileType" : ["RadarSS_BUILD","MSS_BUILD","CALIB_DATA","CONFIG_INFO"]
                   },
xWR14xx_PART_NUM : { "headers" : [0xB5500000,0x35500000,0xCA11BDA7,0xC0F1618F],
                     "fileType" : ["RadarSS_BUILD","MSS_BUILD","CALIB_DATA","CONFIG_INFO"]
                   },
xWR16xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },
xWR68xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },
xWR18xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },                   
                   }, # end of PRE_PG3_KEY
AWR_POST_PG3_KEY : {
xWR12xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },
xWR14xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },
xWR16xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },
xWR68xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },
xWR18xx_PART_NUM : { "headers" : [0x5254534D],
                     "fileType" : ["META_IMAGE1", "META_IMAGE2", "META_IMAGE3", "META_IMAGE4"]
                   },                   
                   } # end of POST_PG3_KEY
}

AWR_VERSION_PG1_14_12 = "07000600"
AWR_VERSION_PG2_14_12 = "01000601"
AWR_VERSION_PG1_16    = "08000602"

BootloaderVerPrePG3 = [AWR_VERSION_PG1_14_12, AWR_VERSION_PG2_14_12]

Storages = {
"SDRAM"     : struct.pack(">I", 0),
"FLASH"     : struct.pack(">I", 1),
"SFLASH"    : struct.pack(">I", 2),
"EEPROM"    : struct.pack(">I", 3),
"SRAM"      : struct.pack(">I", 4)
}

AWR_BOOTLDR_OPCODE_ACK               = struct.pack("B", 0xCC)
AWR_BOOTLDR_OPCODE_NACK              = struct.pack("B", 0x33)
AWR_BOOTLDR_OPCODE_PING              = struct.pack("B", 0x20)
AWR_BOOTLDR_OPCODE_START_DOWNLOAD    = struct.pack("B", 0x21)
AWR_BOOTLDR_OPCODE_FILE_CLOSE        = struct.pack("B", 0x22)
AWR_BOOTLDR_OPCODE_GET_LAST_STATUS   = struct.pack("B", 0x23)
AWR_BOOTLDR_OPCODE_SEND_DATA         = struct.pack("B", 0x24)
AWR_BOOTLDR_OPCODE_SEND_DATA_RAM     = struct.pack("B", 0x26)
AWR_BOOTLDR_OPCODE_DISCONNECT        = struct.pack("B", 0x27)
AWR_BOOTLDR_OPCODE_ERASE             = struct.pack("B", 0x28)
AWR_BOOTLDR_OPCODE_FILE_ERASE        = struct.pack("B", 0x2E)
AWR_BOOTLDR_OPCODE_GET_VERSION_INFO  = struct.pack("B", 0x2F)

AWR_BOOTLDR_SYNC_PATTERN             = struct.pack("B", 0xAA)

AWR_BOOTLDR_OPCODE_RET_SUCCESS             = struct.pack("B", 0x40)
AWR_BOOTLDR_OPCODE_RET_ACCESS_IN_PROGRESS  = struct.pack("B", 0x4B)
# to specify different device variants
AWR_DEVICE_IS_AWR12XX               = struct.pack("B", 0x00)
AWR_DEVICE_IS_AWR14XX               = struct.pack("B", 0x01)
AWR_DEVICE_IS_AWR16XX               = struct.pack("B", 0x03)
AWR_DEVICE_IS_AWR17XX               = struct.pack("B", 0x10)

# Range of progress indicator updates. 100 - 18
# 18 assumes 2 for initialization, 2 for shutdown,
# 2 for serial port opening/closing and 4 for file operation start messages +
# 8 for checking file headers
UNIFLASH_PROG_INDICATOR_RANGE     = 82
UNIFLASH_PROG_INDICATOR_B4_SHUTDOWN = 98
ERASE_PROG_VALUE                  = 4

# CCS-defined messaging levels
TRACE_LEVEL_FATAL = 3
TRACE_LEVEL_ERROR = 2
TRACE_LEVEL_WARNING = 1
TRACE_LEVEL_INFO = 0
TRACE_LEVEL_DEBUG = -1
TRACE_LEVEL_ACTIVITY = TRACE_LEVEL_INFO
FLASHPYTHON_DEBUG_LEVEL = 255

# Original values for verbosity control
#TRACE_LEVEL_ERROR = 1
#TRACE_LEVEL_ACTIVITY = 2
#TRACE_LEVEL_INFO = 3
#TRACE_LEVEL_DEBUG = 4

ROM_VERSION = 1.0
RUN_COUNT = 0
IGNORE_BYTE_CONDITION = True  # to Ignore reading 2 bytes in most conditions
IS_FILE_ALLOCATED     = False # to check if SFLASH file allocation done or not
CHIP_VARIANT          = "CC"

# Keys from Uniflash UI
COMPORT_KEY     = 'COMPort'
MEMSELECT_KEY   = 'MemSelectRadio'
PARTNUM_KEY     = 'partnum'
DOWNLOADFORMAT_KEY = 'DownloadFormat'

# Class for file information. The information from the Uniflash
# application is copied into this object since we can then edit
# these entries, and more specifically, add a new entry. The
# entry is needed for the automatic download of the CONFIG file for
# PG <= 2.0 xWR14xx and xWR12xx devices

class FilesObject(object):
    file_id = ""
    fileSize = 0
    order = 0
    path = ""

    def __init__(self, path, order):
        self.path = path
        self.order = order
        self.file_id = ""
        self.fileSize = 0

class BootLdr:

    def __init__(self, cls, com_port, trace_level=0):
        self.callbackClass=cls
        self.com_port = com_port
        self.baudrate = DEFAULT_SERIAL_BAUD_RATE
        self.chunksize = DEFAULT_CHUNK_SIZE
        self.FileList = Files
        self.StorageList = Storages
        self.trace_level = trace_level
        #self._trace_msg(TRACE_LEVEL_ERROR, "Trace_level = %d"%(trace_level))
        self.IGNORE_BYTE_CONDITION = IGNORE_BYTE_CONDITION
        self.IS_FILE_ALLOCATED = False
        self.MAX_APP_FILE_SIZE = MAX_APP_FILE_SIZE
        self.CHIP_VARIANT = CHIP_VARIANT
        self.ROM_VERSION = ROM_VERSION
        self.cmdStatusSize = 1
        self.connected = False
        self.progPercentage = 0
        self.imageProgCntList = {}
        self.PG3OrLater = False
        self.progMessage =""
        self.partNum = ""
        self.cancelRequested = False
        #----------TEST-------------
        # TEST: For debug without an EVM, set the STUBOUT_VALUE variable above
        # to True
        self.stubOut = STUBOUT_VALUE
        #----------TEST-------------
        self._trace_msg(TRACE_LEVEL_DEBUG, "===>" + self.__class__.__name__ + " init complete")

    def _update_prog_msg(self,updateStr,incPercent):
        if (self.callbackClass != ''):
            newProgPercent = self.progPercentage + incPercent
            if (newProgPercent > UNIFLASH_PROG_INDICATOR_B4_SHUTDOWN):
                newProgPercent = UNIFLASH_PROG_INDICATOR_B4_SHUTDOWN
                self._trace_msg(TRACE_LEVEL_DEBUG, "Progress bar maxed out!!")
            # To be able to update the progress indicator, but not the message,
            # allow for the calling method to specify "". If "" is specified,
            # the previous message stored in the instance will be used. Otherwise,
            # the new string will be used.
            if (updateStr == ""):
                stringToSend = self.progMessage
            else:
                stringToSend = updateStr
                # Save the string used for later use.
                self.progMessage = updateStr
            self.callbackClass.update_progress(str(stringToSend), newProgPercent)
            self.update_prog_percentage(newProgPercent)

    def _trace_msg(self,level,msgStr):
        if (self.callbackClass != ''):
            if (level >= self.trace_level):
                if (level == TRACE_LEVEL_DEBUG):
                    level=FLASHPYTHON_DEBUG_LEVEL
                self.callbackClass.push_message(str(msgStr), level)
        else:
            if (level >= self.trace_level):
               print ("%s"%(msgStr))

    def _checkForCancel(self):
        if (self.callbackClass != ''):
            status = self.callbackClass.check_is_cancel_set()
            self.cancelRequested = True
        else:
            status = False
        return status

    def _comm_open(self):
        self._trace_msg(TRACE_LEVEL_DEBUG,"--> Entering _comm_open method")
        if(self._is_connected()):
            self._trace_msg(TRACE_LEVEL_DEBUG,"<-- Exiting _comm_open method")
            return True
        if (self.stubOut is False):
            try:
                self.comm = serial.Serial(port=self.com_port, baudrate=self.baudrate, timeout=10)
            except SerialException:
                self._trace_msg(TRACE_LEVEL_ERROR, "Serial port %s"%(self.com_port) + " specified does not exist, is already open, or permission is denied!!")
                self._trace_msg(TRACE_LEVEL_ERROR, "!! Aborting operation!!")
                self._trace_msg(TRACE_LEVEL_DEBUG,"<-- Exiting _comm_open method")
                return False
        #----------TEST-------------
        # TEST: For testing without an EVM, be sure to uncomment the
        # following 2 lines.
        else:
            self.comm = serialStub.SerialStub(port=self.com_port, baudrate=self.baudrate, timeout=6)
        #----------TEST-------------
        if self.comm.isOpen():
            self.comm.flushInput()
            self.connected = True
            self._trace_msg(TRACE_LEVEL_DEBUG,"COM port opened.")
            self._trace_msg(TRACE_LEVEL_DEBUG,"<-- Exiting _comm_open method")
            return True
        else:
            self._trace_msg(TRACE_LEVEL_ERROR,"!!! Error opening the COM port!!!")
            self._trace_msg(TRACE_LEVEL_DEBUG,"<-- Exiting _comm_open method")
            return False

    def _comm_close(self):
        self._trace_msg(TRACE_LEVEL_DEBUG,"--> Entering _comm_close method")
        if(self._is_connected()):
            self.comm.close()
            self.connected = False
            self._trace_msg(TRACE_LEVEL_DEBUG, "COM port closed.")
            self.comm = None
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-- Exiting _comm_close method")

    def _is_connected(self):
        return self.connected

    def _send_packet(self,data):
        self._trace_msg(TRACE_LEVEL_DEBUG, "-----> Send packet")
        checksum = 0
        for b in data:
            checksum += b
        msgSize = len(data)+2
        sMsgSize = struct.pack(">H",msgSize)
        sChecksum = struct.pack("B",checksum & 0xff)
        self.comm.write(AWR_BOOTLDR_SYNC_PATTERN)
        self.comm.write(sMsgSize)
        self.comm.write(sChecksum)
        self.comm.write(data)
        self._trace_msg(TRACE_LEVEL_DEBUG, "<----- Send packet")

    def _receive_packet(self, Length):
        self._trace_msg(TRACE_LEVEL_DEBUG, "----->Receive packet")
        #if (self.IGNORE_BYTE_CONDITION is False):
        #    Header1 = self.comm.read(2)
        Header = self.comm.read(3)
        PacketLength , CheckSum  = struct.unpack(">HB", Header)
        PacketLength -= 2 # Compensate for the header
        if (Length != PacketLength):
            self._trace_msg(TRACE_LEVEL_DEBUG, "Requested length={:d}, actual={:d}".format(Length, PacketLength))
            self._trace_msg(TRACE_LEVEL_FATAL, "Error, Mismatch between requested and actual packet length: act {:d}, req {:d}".format(PacketLength, Length))
        Payload = self.comm.read(PacketLength)
        if (len(Payload) != Length):
            self._trace_msg(TRACE_LEVEL_FATAL, "Error, time-out while receiving packet's payload")
        self.comm.write(AWR_BOOTLDR_OPCODE_ACK) # Ack the packet
        CalculatedCheckSum=0
        for byte in Payload:
            CalculatedCheckSum += byte
        CalculatedCheckSum &= 0xFF
        if (CalculatedCheckSum != CheckSum):
            self._trace_msg(TRACE_LEVEL_ERROR, "Calculated: 0x{:x}.  Received: 0x{:x}".format(CalculatedCheckSum, CheckSum))
            self._trace_msg(TRACE_LEVEL_FATAL, "Checksum error on received packet")
        else:
            self._trace_msg(TRACE_LEVEL_DEBUG, "Calculated and Received CheckSum: 0x{:x}.".format(CalculatedCheckSum))
        self._trace_msg(TRACE_LEVEL_DEBUG, "<----- Receive packet")
        return Payload

    def _read_ack(self):
        self._trace_msg(TRACE_LEVEL_DEBUG, "-----> Waiting for ACK message from device.")
        # Each ACK message has a length and checksum
        # Read the length in a loop in case there is a chance of
        # a time-out on read waiting for the ACK message.
        length = ''
        while (length == ''):
            length = self.comm.read(2)
        chksum = self.comm.read(1)
        self.comm.read(1) # 0x00
        a = self.comm.read(1)
        status = False
        while (not ((a == AWR_BOOTLDR_OPCODE_ACK) or (a == AWR_BOOTLDR_OPCODE_NACK))):
            a = self.comm.read(1)
        self._trace_msg(TRACE_LEVEL_DEBUG,"Checking message from device:")
        if (a == AWR_BOOTLDR_OPCODE_ACK):
            self._trace_msg(TRACE_LEVEL_DEBUG,"*** Received ACK ***")
            status = True
        elif (a == AWR_BOOTLDR_OPCODE_NACK):
            self._trace_msg(TRACE_LEVEL_DEBUG,"*** Received NACK ***")
            status = False
        else:
            self._trace_msg(TRACE_LEVEL_ERROR,"XXXX Received unexpected data!!!XXXX")
            status = False
        self._trace_msg(TRACE_LEVEL_DEBUG, "<----- Done waiting for ACK message from device.")
        return status

    def _read_ack_with_cancel_check(self):
        self._trace_msg(TRACE_LEVEL_DEBUG, "-----> Waiting for ACK message from device - w/ cancel check.")
        # Read the length in a loop in case there is a chance of
        # a time-out on read waiting for the ACK message.
        length = ''
        outerCount = 0
        c = False
        while ((c is False) and (outerCount < 10)):
            innerCount = 0
            while ((length == '') and (innerCount < 2)):
                length = self.comm.read(2)
                innerCount += 1
            c = self._checkForCancel()
            if (length != ''):
                break
            outerCount += 1
        if (c is True):
            self._trace_msg(TRACE_LEVEL_INFO, AWR_CANCEL_MSG)
            status = False
        elif (length == ''):
            self._trace_msg(TRACE_LEVEL_ERROR, "Initial response from the device was not received. Please power cycle device before re-flashing.")
            status = False
        else:
            # Continue to read the rest of the ACK message
            chksum = self.comm.read(1)
            self.comm.read(1) # 0x00
            a = self.comm.read(1)
            readCount = 0
            while not ((a == AWR_BOOTLDR_OPCODE_ACK) or (a == AWR_BOOTLDR_OPCODE_NACK)) and readCount < 10:
                a = self.comm.read(1)
                readCount += 1
            self._trace_msg(TRACE_LEVEL_DEBUG,"Checking message from device:")
            if (a == AWR_BOOTLDR_OPCODE_ACK):
                self._trace_msg(TRACE_LEVEL_DEBUG,"*** Received ACK ***")
                status = True
            elif (a == AWR_BOOTLDR_OPCODE_NACK):
                self._trace_msg(TRACE_LEVEL_DEBUG,"*** Received NACK ***")
                status = False
            else:
                self._trace_msg(TRACE_LEVEL_ERROR,"XXXX Received unexpected data!!!XXXX")
                status = False
        self._trace_msg(TRACE_LEVEL_DEBUG, "<----- Done waiting for ACK message from device w/ cancel check.")
        return status

    def _send_command(self,data):
        self._trace_msg(TRACE_LEVEL_DEBUG,"--->Send command")
        self._send_packet(data)
        ackStatus = self._read_ack()
        self._send_packet(AWR_BOOTLDR_OPCODE_GET_LAST_STATUS)
        retStatus = self._receive_packet(self.cmdStatusSize)
        self._trace_msg(TRACE_LEVEL_DEBUG,"<--- Send command")
        return ackStatus

    def _send_start_download(self,file_id,file_size,max_size,mirror_enabled,storage):
        self._trace_msg(TRACE_LEVEL_DEBUG,"->Send start download command")
        data = AWR_BOOTLDR_OPCODE_START_DOWNLOAD + \
            struct.pack(">I",file_size) + Storages[storage] + \
            Files[file_id] + struct.pack(">I",mirror_enabled)
        self._send_command(data)
        return True

    def _send_file_close(self,file_id):
        self._trace_msg(TRACE_LEVEL_DEBUG,"-->Send file close command")
        data = AWR_BOOTLDR_OPCODE_FILE_CLOSE + \
            Files[file_id]
        self._send_command(data)
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-- Send file close command")
        return True

    def _send_chunk(self,buff,bufflen):
        self._trace_msg(TRACE_LEVEL_DEBUG,"--> Send chunk")
        data = AWR_BOOTLDR_OPCODE_SEND_DATA + buff
        return self._send_command(data)

    def _send_chunkRAM(self,buff,bufflen):
        self._trace_msg(TRACE_LEVEL_DEBUG,"--> Send chunkRAM")
        data = AWR_BOOTLDR_OPCODE_SEND_DATA_RAM + buff
        return self._send_command(data)

    def _getFileHeaderList(self):
        if (self.PG3OrLater is True):
            PGkey = AWR_POST_PG3_KEY
        else:
            PGkey = AWR_PRE_PG3_KEY
        return FileHeaders[PGkey][self.partNum[1:5]]["headers"]

    def _getFileTypeList(self):
        if (self.PG3OrLater is True):
            PGkey = AWR_POST_PG3_KEY
        else:
            PGkey = AWR_PRE_PG3_KEY
        return FileHeaders[PGkey][self.partNum[1:5]]["fileType"]

    #******************* APIs *******************

    def connect_with_reset(self, timeout, com_port, reset_command):
        #self._trace_msg(TRACE_LEVEL_ACTIVITY,"Configure SOP")
        #self.configureSOP('AR-MB-EVM-1_FD01')
        #self._trace_msg(TRACE_LEVEL_ACTIVITY,"Configure NRESET")
        #self.configureReset('AR-MB-EVM-1_FD01')
        # Initialize status to success
        passed = True
        self._trace_msg(TRACE_LEVEL_DEBUG,"->Entering connect_with_reset method")
        self._trace_msg(TRACE_LEVEL_ACTIVITY,"Reset connection to device")
        # Keep the trace_level the same as before.
        trace_level = self.trace_level
        self.__init__(self.callbackClass, com_port, trace_level)
        if (self._comm_open()):
            self._trace_msg(TRACE_LEVEL_INFO,"Set break signal")
            self._update_prog_msg("Opening COM port %s..."%(self.com_port), 1)
            self.comm.timeout = timeout # For this command only since port is closed @ the end
            #print("VERSION is %d" %(sys.version_info[0]))
            if (sys.version_info[0] >= 2):
                self.comm.break_condition = True
            else:
                self.comm.setBreak(True)
            time.sleep(0.100)
            if (reset_command != ""):
                subprocess.call(reset_command)
            if (self._read_ack_with_cancel_check()):
                self._trace_msg(TRACE_LEVEL_ACTIVITY,"Connection to COM port succeeded. Flashing can proceed.")
                self._update_prog_msg("Connected to COM port.", 1)
                if (sys.version_info[0] >= 2):
                    self.comm.break_condition = False
                else:
                    self.comm.setBreak(False)
                passed = True
            else:
                if (self.cancelRequested is False):
                    self._trace_msg(TRACE_LEVEL_ERROR,"Failure: Recheck that correct COM port was provided or power cycle the device.")
                passed = False
            self._comm_close()
            self._trace_msg(TRACE_LEVEL_DEBUG,"Exit bootldr connect")

        else:
            #self._trace_msg(TRACE_LEVEL_ERROR,"Failed during connection. Please check if COM port %s is correct."%(self.com_port))
            passed = False
        self._trace_msg(TRACE_LEVEL_DEBUG,"<- Exiting connect_with_reset method")
        return passed

    def skip_connect(self):
        self.connected = True

    def connect(self, timeout, com_port):
        self._trace_msg(TRACE_LEVEL_ACTIVITY,"Connecting to COM Port %s"%(com_port) + "...")
        return self.connect_with_reset(timeout, com_port, "")

    def disconnect(self):
        self._trace_msg(TRACE_LEVEL_DEBUG,"-> Entering disconnect method")
        self._trace_msg(TRACE_LEVEL_ACTIVITY,"Disconnecting from device on COM port %s"%(self.com_port) + "...")
        self._update_prog_msg("Disconnecting from device on COM port %s ..."%(self.com_port), 1)
        self._comm_close()
        self._trace_msg(TRACE_LEVEL_DEBUG,"<- Exit disconnect method")

    def GetVersion(self):
        self._trace_msg(TRACE_LEVEL_DEBUG,"-> Entering GetVersion method")
        self._trace_msg(TRACE_LEVEL_ACTIVITY,"Reading device version info...")
        if (self._comm_open()):
            #----------TEST-------------
            # To properly emulate bootloader behaviour for the GET VERSION
            # request, indicate that we are in the function now. Otherwise,
            # valid file data could trigger the special get version code
            # in the serialStub class.

            serialStub.GETVERSION_CALLED = True
            #----------TEST-------------
            self._trace_msg(TRACE_LEVEL_DEBUG, "Connected to device to get version")
            data = AWR_BOOTLDR_OPCODE_GET_VERSION_INFO
            self._send_packet(data)
            self._trace_msg(TRACE_LEVEL_DEBUG, "GET_VERSION code send packet completed.")
            Status = self._read_ack()
            self._trace_msg(TRACE_LEVEL_DEBUG, "Response from device obtained.")
            RetValue = ""
            try:
                if (Status is False):
                    self._trace_msg(TRACE_LEVEL_DEBUG, "!!! Version read was not successful !!!")
                    return RetValue
                Length = struct.unpack(">H", self.comm.read(2))[0]
                #self._trace_msg(TRACE_LEVEL_DEBUG, str("Length of the Version Info = %d"%(Length)))
                crcRead = self.comm.read(1) # Read the checksum
                checkSum = struct.unpack("B",crcRead)[0]
                #self._trace_msg(TRACE_LEVEL_DEBUG, "Reading Version...")
                # Removing header from consideration in length value
                Length -= 2
                # read the actual version
                versionRead = self.comm.read(Length)
                #self._trace_msg(TRACE_LEVEL_DEBUG, "Version read successfully...")
                calculatedCheckSum=0
                for byte in versionRead:
                    calculatedCheckSum += byte
                calculatedCheckSum &= 0xFF
                if (calculatedCheckSum != checkSum):
                    self._trace_msg(TRACE_LEVEL_ERROR, "Version checksum Calculated: 0x{:x}.  Received: 0x{:x}".format(calculatedCheckSum, checkSum))
                    self._trace_msg(TRACE_LEVEL_FATAL, "Checksum error on received packet")
                    return RetValue
                else:
                    self._trace_msg(TRACE_LEVEL_DEBUG, "Version Calculated and Received CheckSum: 0x{:x}.".format(calculatedCheckSum))
                versionData = binascii.b2a_hex(versionRead)
                self.comm.write(AWR_BOOTLDR_OPCODE_ACK) # Ack the version packet
                #self._trace_msg(TRACE_LEVEL_DEBUG, str("RAW Version Info = %s"%(versionData)))
                convertVersion = versionData[0:8]
                self._trace_msg(TRACE_LEVEL_DEBUG, str("Truncated Version Info = %s"%(convertVersion)))
                #----------TEST-------------
                # To properly emulate bootloader behaviour for the GET VERSION
                # request, indicate that we are in the function now. Otherwise,
                # valid file data could trigger the special get version code
                # in the serialStub class.
                serialStub.GETVERSION_CALLED = False
                #----------TEST-------------
                RetValue = convertVersion
            except:
                pass
            finally:
                self._comm_close()
                self._trace_msg(TRACE_LEVEL_DEBUG, "Closing connection to device")
        else:
            self._trace_msg(TRACE_LEVEL_ERROR,"Cannot open serial port. Try again.")
        self._trace_msg(TRACE_LEVEL_DEBUG,"<- Exit GetVersion method")
        return RetValue

    def download_file(self,filename,file_id,mirror_enabled,max_size,storage, imageProgList):
        self._trace_msg(TRACE_LEVEL_DEBUG, "->Entering download_file method")
        fSize = os.path.getsize(filename)
        result = True
        if (storage == "SRAM"):
            self.cmdStatusSize = 4
        else:
            self.cmdStatusSize = 1
        self._trace_msg(TRACE_LEVEL_ACTIVITY,"Downloading [%s] size [%d]"%(file_id,fSize))
        if (fSize>0) and (fSize < MAX_FILE_SIZE):
            if (max_size < fSize):
                max_size = fSize
            try:
                fSrc = open(filename,"rb")
            except IOError:
                self._trace_msg(TRACE_LEVEL_FATAL, "Unable to open the file. Please double-check the name and path")
                return False
            if (self._comm_open()):
                self._update_prog_msg("Downloading [%s] size [%d]..."%(file_id,fSize),1)
                if (self._send_start_download(file_id,fSize,max_size,mirror_enabled,storage)):
                    # counters to 0
                    offset = 0
                    spacingCnt = 0
                    # Get the counter limit values that determines spacing
                    # of update progress messages.
                    spacingCntLimit = imageProgList[0]
                    # Amount by which to increase percentage with each
                    # update_prog_msg call.
                    percentIncr = imageProgList[1]
                    while (offset < fSize):
                        buff = fSrc.read(self.chunksize)
                        bufflen = len(buff)
                        if (storage == "SRAM"):
                            sendStatus = self._send_chunkRAM(buff,bufflen)
                            if (sendStatus == False):
                                result = False
                                break
                        else:
                            sendStatus = self._send_chunk(buff,bufflen)
                            if (sendStatus == False):
                                result = False
                                break
                        spacingCnt += 1
                        if (spacingCnt == spacingCntLimit):
                            spacingCnt = 0
                            self._update_prog_msg("", percentIncr)
                        offset += bufflen
                        c = self._checkForCancel()
                        if (c is True):
                            self._trace_msg(TRACE_LEVEL_INFO, AWR_CANCEL_MSG)
                            result = False
                            break
                self._send_file_close(file_id);
                self._comm_close()
            else:
                self._trace_msg(TRACE_LEVEL_ERROR,"Failure while trying to connect...")
                result = False
            fSrc.close()
        else:
            self._trace_msg(TRACE_LEVEL_ERROR,"Invalid file size")
            result = False
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exit download_file method")
        return result

    def erase_storage(self,storage="SFLASH",location_offset=0,capacity=0):
        self._trace_msg(TRACE_LEVEL_DEBUG, "->Entering erase_storage method")
        self._trace_msg(TRACE_LEVEL_ACTIVITY, str("-->Erasing storage [%s]" %(storage)))
        if (self._comm_open()):
            data = AWR_BOOTLDR_OPCODE_ERASE + Storages[storage] + \
                struct.pack(">I",location_offset) + struct.pack(">I",capacity)
            self._update_prog_msg("Sending Erase command to device...", 1)
            self._trace_msg(TRACE_LEVEL_ACTIVITY,"-->Sending Erase command to device...")
            self._send_packet(data)
            self._trace_msg(TRACE_LEVEL_DEBUG,"Erase command sent to device.")
            if (self._read_ack()):
                self._trace_msg(TRACE_LEVEL_DEBUG,"Erase storage ACK received.")
                self._trace_msg(TRACE_LEVEL_INFO,"-->Erase storage completed successfully!")

            else:
                self._trace_msg(TRACE_LEVEL_DEBUG,"Erase storage ACK not received.")
                self._trace_msg(TRACE_LEVEL_ERROR,"Erase storage did not complete. Reset device and try again")

        self._update_prog_msg("", 1)
        self._comm_close()
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exiting erase_storage method")

    def checkFileHeader(self, fileName, fileInfo):
        self._trace_msg(TRACE_LEVEL_DEBUG, "->Entering checkFileHeader method")
        self._trace_msg(TRACE_LEVEL_INFO, "Checking file %s for correct header for %s."%(fileName,self.partNum))
        # Check if file exists.
        fileExists = os.path.isfile(fileName)
        checkResult = True
        if (fileExists == True):
            fSize = os.path.getsize(fileName)
            if (fSize < FILE_HEADERSIZE):
                self._trace_msg(TRACE_LEVEL_ERROR, "File %s is too small: size = %d"%(fileName,fSize) + "!")
                checkResult = False
            else:
                # Try to open the file.
                try:
                    fSrc = open(fileName,"rb")
                except IOError:
                    self._trace_msg(TRACE_LEVEL_FATAL, "Unable to open the file. Please double-check the name and path")
                    checkResult=False
                if (checkResult == True):
                    self._update_prog_msg("Checking fileType appropriateness for this device...", 2)
                    # Read first 4 bytes which should be the header
                    rawHeader = fSrc.read(FILE_HEADERSIZE)
                    if (sys.byteorder == 'little'):
                        header = struct.unpack("<L",rawHeader)[0]
                    else:
                        header = struct.unpack(">L",rawHeader)[0]
                    # ----------- temporary --------------
                    # for unit testing
                    #header = 0xB5500000
                    # ------------------------------------
                    # Create a masked header file since some AWR14xx files only have
                    # a 3-nibble header
                    maskedHeader = header & 0xFFF00000
                    # Access valid file headers and types for the part number
                    fileHeaderList = self._getFileHeaderList()
                    fileTypeList = self._getFileTypeList()
                    # Check if first 4 bytes match a possible header file for the
                    # partNumber.
                    if (header in fileHeaderList):
                        # Add file Id to the fileInfo. For AWR16xx, use order field
                        # provided. For AWR14xx use location of header in header
                        # list to get file type.
                        if ((self.partNum[1:5]==xWR16xx_PART_NUM) or (self.isDevicePG3OrLater())):
                            # Make sure that order number from UI is in the
                            # correct range. Should be 1,2,3, or 4 only
                            if (fileInfo.order <= 0 or fileInfo.order > 4):
                                checkResult = False
                                self._trace_msg(TRACE_LEVEL_ERROR, "Internal Error: File Order number value %d is not in valid range (1-4)"%(fileInfo.order))
                                self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exit checkFileHeader method prematurely!!")
                                fSrc.close()
                                return checkResult
                            # File order should be between 0 and 3 for array indexing.
                            fileTypeIndex = fileInfo.order-1
                        else: #xWR14xx/xWR12xx PG <= 2.0
                            fileTypeIndex = fileHeaderList.index(header)
                        self._trace_msg(TRACE_LEVEL_INFO, "%s device, fileType=%s detected -> OK" %(self.partNum,fileTypeList[fileTypeIndex]))
                        fileInfo.file_id = fileTypeList[fileTypeIndex]
                        # Save the file size for later progress indicator calculations
                        fileInfo.fileSize = fSize
                        checkResult = True
                        self._update_prog_msg("", 1)
                    elif ((self.partNum[0:5] in OlderFileFormatParts) and (maskedHeader in fileHeaderList) and (fileHeaderList.index(maskedHeader) < fileTypeList.index("CALIB_DATA"))):
                        fileTypeIndex = fileHeaderList.index(maskedHeader)
                        self._trace_msg(TRACE_LEVEL_INFO, "%s device, fileType=%s detected -> OK"%(self.partNum,fileTypeList[fileTypeIndex]))
                        fileInfo.file_id = fileTypeList[fileTypeIndex]
                        # Save the file size for later progress indicator calculations
                        fileInfo.fileSize = fSize
                        checkResult = True
                        self._update_prog_msg("", 1)
                    else:
                        self._trace_msg(TRACE_LEVEL_WARNING, "Header of %s file indicates it is not a valid file to flash to %s: "%(fileName,self.partNum) + hex(header))
                        checkResult = False
                    fSrc.close()
        else:
            self._trace_msg(TRACE_LEVEL_ERROR, "File %s does not exist!"%(fileName))
            checkResult = False
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exit checkFileHeader method")
        return checkResult

    def calcProgressValues(self, images, fileSizeSum, formatOnDownload):
        self._trace_msg(TRACE_LEVEL_DEBUG, "->Entering calcProgressValues method")
        # Set the indicator range to UNIFLASH_PROG_INDICATOR_RANGE.
        indicatorRange = UNIFLASH_PROG_INDICATOR_RANGE
        if (formatOnDownload == True):
            # If flash should be erased before downloading files, this will
            # consume some of the progress bar range.
            indicatorRange = UNIFLASH_PROG_INDICATOR_RANGE - ERASE_PROG_VALUE
        # For each file, calculate the amount of progress bar that can
        # be allocated to it (based on file size and file size total).
        # After this, we can see how to display increments.
        for i in images:
            # Amount of progress bar that can be used for this file
            range = (i.fileSize*indicatorRange)/fileSizeSum
            # Number of chunks of data to be sent. For file download,
            # the progress bar is incremented based on number of chunks
            # to be sent.
            numChunksToSend = i.fileSize/DEFAULT_CHUNK_SIZE
            if (numChunksToSend < 1):
                numChunksToSend = 1
            if (range < 1):
                range = 1
            # If we have more chunks than range, then see how to distribute
            # increments over number of chunks. This is the spacing count.
            # Otherwise, split the progress bar range by the number of
            # chunks being sent.
            if (numChunksToSend > range):
                spacingCnt =  int(numChunksToSend/range)
                percentIncr = 1
            else:
                spacingCnt = 1
                percentIncr = int(range/numChunksToSend)
            # Save the spacing and increment values, using the image object
            # as the key.
            self.imageProgCntList[i] = [spacingCnt, percentIncr]
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exit calcProgressValues method")

    def getImageProgCntList(self, image):
        # Return the image progress counter list of values:
        # spacing count and increment value.
        return self.imageProgCntList[image]

    def isPartNumSupported(self, partNum):
        return partNum[0:5] in PartNumSupported

    def get_prog_percentage(self):
        return self.progPercentage

    def update_prog_percentage(self, percentage):
        self.progPercentage = percentage

    def checkPropertiesMapKeys(self, propMap):
        keysPresent = True
        # check to make sure necessary fields are present in
        # propertiesMap dictionary
        if (COMPORT_KEY not in propMap):
            value = COMPORT_KEY
            keysPresent = False
        elif (MEMSELECT_KEY not in propMap):
            value = MEMSELECT_KEY
            keysPresent = False
        elif (PARTNUM_KEY not in propMap):
            value = PARTNUM_KEY
            keysPresent = False
        elif (DOWNLOADFORMAT_KEY not in propMap):
            value = DOWNLOADFORMAT_KEY
            keysPresent = False

        if (keysPresent is False):
            self._trace_msg(TRACE_LEVEL_FATAL, "Integration Error: \'%s\' key is not present in propertiesMap"%(value))
        return (keysPresent)

    def determinePGVersion(self):
        self._trace_msg(TRACE_LEVEL_DEBUG, "->Entering determinePGVersion method")
        # ----- TEST ----
        serialStub.PARTNUM=self.partNum
        # ----- TEST ----
        # get the version from the device.
        versionRead = self.GetVersion()
        if (versionRead == ""):
            self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exit determinePGVersion method, failure")
            return False
        if (versionRead in BootloaderVerPrePG3):
            # PG <= 2.0
            self.PG3OrLater = False

        else:
            # PG >= 3.0
            self.PG3OrLater = True
        self._trace_msg(TRACE_LEVEL_DEBUG,"<-Exit determinePGVersion method")
        return True

    def isDevicePG3OrLater(self):
        return self.PG3OrLater

    def copyImagesList(self, images):
        filesList = []
        for i in images:
            fileObj = FilesObject(i.path, i.order)
            filesList.append(fileObj)
        return filesList

    def addAutomaticDownload(self, filesList, path):
        if (self.PG3OrLater is False):
            # If this is the xWR14xx, then add the CONFIG file to
            # the file list.
            if (self.partNum[0:5] in CONFIGFileParts):
                numFiles = len(filesList)
                newAddition = FilesObject(path, numFiles)
                filesList.append(newAddition)
                self._trace_msg(TRACE_LEVEL_INFO, "note: CONFIG file is added to list of files for download to the device.")
                #for i in filesList:
                #    print(i)
                #    print(i.path)
                #    print(i.order)
                #    print(i.file_id)
        return

    def setPartNum(self, partNum):
        self.partNum = partNum

