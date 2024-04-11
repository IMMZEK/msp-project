import binascii
import struct
AR_BOOTLDR_OPCODE_ACK               = struct.pack("B", 0xCC)
AR_BOOTLDR_OPCODE_NACK              = struct.pack("B", 0x33)
AR_BOOTLDR_OPCODE_PING              = struct.pack("B", 0x20)
AR_BOOTLDR_OPCODE_START_DOWNLOAD    = struct.pack("B", 0x21)
AR_BOOTLDR_OPCODE_FILE_CLOSE        = struct.pack("B", 0x22)
AR_BOOTLDR_OPCODE_GET_LAST_STATUS   = struct.pack("B", 0x23)
AR_BOOTLDR_OPCODE_SEND_DATA         = struct.pack("B", 0x24)
AR_BOOTLDR_OPCODE_SEND_DATA_RAM     = struct.pack("B", 0x26)
AR_BOOTLDR_OPCODE_DISCONNECT        = struct.pack("B", 0x27)
AR_BOOTLDR_OPCODE_ERASE             = struct.pack("B", 0x28)
AR_BOOTLDR_OPCODE_FILE_ERASE        = struct.pack("B", 0x2E)
AR_BOOTLDR_OPCODE_GET_VERSION_INFO  = struct.pack("B", 0x2F)

AR_BOOTLDR_SYNC_PATTERN             = struct.pack("B", 0xAA)
AR_BOOTLDR_OPCODE_RET_SUCCESS             = struct.pack("B", 0x40)
AR_BOOTLDR_OPCODE_RET_ACCESS_IN_PROGRESS  = struct.pack("B", 0x4B)

# global variables
GETVERSION_REQ = False
GETVERSION_CALLED = False
GETVERSION_CRC_NEXT = False
PARTNUM = "WR16"
class SerialStub:

    def __init__(self, port, baudrate, timeout):
        self.comm_port = port
        self.baudrate = baudrate
        self.timeout = timeout
        if (port != ''):
            self.opened = True
        print("xxx SerialPort created Comm port=%s" % (port), end="")
        print(", baudrate=%d" % (baudrate) + ", timeout=%d" % (timeout))

    def open(self):
        print("xxx Opening comm_port %s" % (self.comm_port))
        self.opened = True

    def close(self):
        self.opened = False
        print("xxx Closed comm_port %s" % (self.comm_port))

    def write(self, value):
        global GETVERSION_REQ
        global GETVERSION_CALLED
        if (GETVERSION_CALLED is True and (value == AR_BOOTLDR_OPCODE_GET_VERSION_INFO)):
            #print struct.unpack("B",value)[0]
            GETVERSION_REQ = True
        print("xxx List of bytes written to comm_port %s" % (self.comm_port))
        b = bytearray(value)
        print("Size of written array =%d" % (len(b)))
        for i in b:
            print(hex(i), end=" ")

    def read(self, value):
        global GETVERSION_REQ
        global GETVERSION_CRC_NEXT
        global PARTNUM
        #print("Value = %d" %(value))
        if (value != 0):
            if (GETVERSION_REQ is True):
                if (value == 1):
                    if (GETVERSION_CRC_NEXT is True):
                        if (PARTNUM[1:5] in ("WR14","WR12")):
                            bytesRead = struct.pack("B",8)
                        else:
                            bytesRead = struct.pack("B",16)
                        GETVERSION_CRC_NEXT = False
                    else:
                        bytesRead = AR_BOOTLDR_OPCODE_ACK
                if (value == 2):
                    # second byte (packetlength)
                    bytesRead = struct.pack(">H",14)
                    GETVERSION_CRC_NEXT = True
                if (value >= 12):
                    if (PARTNUM[1:5] in ("WR14","WR12")):
                        bytesRead = binascii.a2b_hex("010006010000000000000000")
                    else:
                        bytesRead = binascii.a2b_hex("080006020000000000000000")
                    GETVERSION_REQ = False
            else:
                # first byte
                bytesRead = AR_BOOTLDR_OPCODE_ACK
                if (value >= 2):
                    # second byte (packetlength)
                    bytesRead = struct.pack("B",0) + struct.pack("B",3)
                if (value >= 3):
                    # third byte CRC ord(AR_BOOTLDR_OPCODE_ACK)
                    bytesRead = bytesRead + struct.pack("B",ord(AR_BOOTLDR_OPCODE_ACK))
                if (value >= 4):
                    # 4th byte response
                    bytesRead = bytesRead + struct.pack("B",ord(AR_BOOTLDR_OPCODE_RET_SUCCESS))
            b = bytearray(bytesRead)
            print("xxx Bytes read from comm_port %s" % (self.comm_port))
            for i in b:
                print(hex(i), end=" ")
            return bytesRead
        else:
            print("xxx Error!!!")

    def setBreak(self, value):
        print("xxx Break sent to comm_port %s" % (self.comm_port))

    def isOpen(self):
        if (self.opened):
            print("xxx Comm_port %s" % (self.comm_port) + " is open.")
            return True
        else:
            print("xxx !!!!! Comm_port %s" % (self.comm_port) + " is not open!!!!!")
            return False

    def flushInput(self):
        print("xxx Flushing Input.......")
