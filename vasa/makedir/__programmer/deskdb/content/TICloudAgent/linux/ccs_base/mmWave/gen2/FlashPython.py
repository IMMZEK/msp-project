from FlashPythonFramework import *

import os
import sys
import time

for local_dir in ['', '/../common/pyserial-3.5/', '/libs/xmodem-0.4.6/']:
    sys.path.append(os.path.dirname(os.path.realpath(__file__)) + local_dir)

from FlashPythonUtils import *
import serial

#This was used to bypass xmodem for testing.
USE_STUB_FOR_TESTING = False

if USE_STUB_FOR_TESTING:
    sys.path.append(os.path.dirname(os.path.realpath(__file__)) + '/test/')
    from stubs import XMODEM1k
else:
    from xmodem import XMODEM1k

FP_TRACE_LEVEL_FATAL   = 3
FP_TRACE_LEVEL_ERROR   = 2
FP_TRACE_LEVEL_WARNING = 1
FP_TRACE_LEVEL_INFO    = 0
FP_TRACE_LEVEL_DEBUG   = 255 # (value needs to be > 0).
FP_TRACE_LEVEL_ACTIVITY = FP_TRACE_LEVEL_INFO

UART_UNIFLASH_IMAGE_PATH = str(os.path.dirname(os.path.realpath(__file__)) + 
                                '/images/sbl_uart_uniflash.release.tiimage')
SBL_OFFSET = 0
APPIMAGE_OFFSET = 0xA0000

# NOTE!! If while editing this file, new push_message or update_progress
# calls are added where the message part is not strictly a string, and
# includes variable substitution, be sure to enclose the strong in
# the str() construct to convert it to a string. Otherwise, the
# C++ will return with an error since the function won't match a
# prototype (since the string would be unicode without str() ).

class FlashPython(FlashPythonInstance):

    def __init__(self, server):
        FlashPythonInstance.__init__(self, server)

        self.total_bytes_to_send = 0
        self.bytes_sent = 0
        self.serObj = None
        
        self.update_progress("Initialization complete.", 1)
        self.push_message("Initialization complete.", FP_TRACE_LEVEL_INFO)


    def load_image(self, images, propertiesMap):
        if(len(images) != 2):
            self.push_message("Invalid number of images. Two expected, SBL and Appimage (in that order).", FP_TRACE_LEVEL_FATAL)
            return
        
        try:
            self.serObj = serial.Serial(port=propertiesMap['COMPort'], baudrate=115200, timeout=10)
        except serial.serialutil.SerialException:
            self.push_message(str('Serial port [' + str(propertiesMap['COMPort']) + '] not found or not accessible !!!'), FP_TRACE_LEVEL_FATAL)
        
        self.total_bytes_to_send = os.path.getsize(UART_UNIFLASH_IMAGE_PATH) + os.path.getsize(images[0].path) + os.path.getsize(images[1].path)

        self.push_message(str("Sending UART Uniflash image at location %s"%(UART_UNIFLASH_IMAGE_PATH)), FP_TRACE_LEVEL_INFO)
        self._send_uart_uniflash(UART_UNIFLASH_IMAGE_PATH)
        self.push_message("UART Uniflash image sent.", FP_TRACE_LEVEL_INFO)

        self.push_message(str("Sending SBL image at location %s"%(images[0].path)), FP_TRACE_LEVEL_INFO)
        self._send_image(images[0].path, SBL_OFFSET)
        self.push_message("SBL image sent", FP_TRACE_LEVEL_INFO)

        self.push_message(str("Sending Appimage at location %s"%(images[1].path)), FP_TRACE_LEVEL_INFO)
        self._send_image(images[1].path, APPIMAGE_OFFSET)
        self.push_message("Appimage sent", FP_TRACE_LEVEL_INFO)


    def exec_command(self, command, propertiesMap):
        self.push_message(str("Command %s is not a valid command. Internal Error."%(command)), FP_TRACE_LEVEL_FATAL)


    def shut_down(self):
        self.serObj.close()
        self.update_progress("Done.", 100)
        self.push_message("Instance deinitialized!", FP_TRACE_LEVEL_INFO)


    def _update_bytes_sent(self, data_len):
        self.bytes_sent += data_len
        self.update_progress("Flashing...", int(2 + 97*self.bytes_sent/self.total_bytes_to_send))


    def _send_image(self, filepath, offset):
        f_size = os.path.getsize(filepath)
        if f_size + BOOTLOADER_UNIFLASH_HEADER_SIZE >= BOOTLOADER_UNIFLASH_BUF_SIZE:
            # Send by parts
            self.send_file_by_parts(filepath, offset)
        else:
            # Send normally
            tempfilename = create_temp_file(filepath, offset)
            self._xmodem_send_receive_file(tempfilename, True)
            # Delete the tempfile
            os.remove(tempfilename)


    def _send_uart_uniflash(self, filepath):
        self._xmodem_send_receive_file(filepath, False)


    # Sends the file to EVM via xmodem, receives response from EVM and returns the response status
    def _xmodem_send_receive_file(self, filename, get_response=True):
        status = False
        timetaken = 0
        if USE_STUB_FOR_TESTING:
            get_response = False

        try:
            stream = open(filename, 'rb')
        except FileNotFoundError:
            self.push_message(str('File [' + filename + '] not found !!!'), )

        try:
            modem = XMODEM1k(self._getc_closure(), self._putc_closure())
            tstart = time.time()
            status = modem.send(stream, quiet=True, timeout=10, retry=10)
            tstop = time.time()
            timetaken = round(tstop-tstart, 2)
        except:
            status = False

        stream.close()

        if status is False :
            self.push_message(str("XMODEM send failed, no response OR incorrect response from EVM OR cancelled by user, "+
                                    "power cycle EVM and run this script again !!!"), FP_TRACE_LEVEL_FATAL)

        resp_status = 0

        # Don't do the receive if get_response is False
        if(get_response):
            respfilename = "resp.dat"
            try:
                respfile = open(respfilename, "wb")
                status = modem.recv(respfile, quiet=True, timeout=2000)
                respfile.close()
                resp_status = parse_response_evm(respfilename)
                os.remove(respfilename)
            except:
                status = None
            
            if status is None:
                self.push_message (str("XMODEM recv failed, no response OR incorrect response from EVM OR cancelled by user,"+
                                    "Power cycle EVM and run this script again !!!"), FP_TRACE_LEVEL_FATAL)

        return resp_status, timetaken

    def send_file_by_parts(self, filename, offset):
        orig_f_name = filename
        orig_offset = offset

        f = open(orig_f_name, "rb")
        f_bytes = f.read()
        f.close()

        num_parts   = int(len(f_bytes) / BOOTLOADER_UNIFLASH_BUF_SIZE)
        remain_size = len(f_bytes) % BOOTLOADER_UNIFLASH_BUF_SIZE


        for i in range(0, num_parts):

            start = i*BOOTLOADER_UNIFLASH_BUF_SIZE
            end = start+BOOTLOADER_UNIFLASH_BUF_SIZE

            part_data = f_bytes[start:end]
            part_filename = orig_f_name + ".part{}".format(i+1)
            # make the partial file
            f = open(part_filename, "wb")
            f.write(part_data)
            f.close()

            # temporarily change this to the partial filename
            filename = part_filename
            offset = orig_offset + i*BOOTLOADER_UNIFLASH_BUF_SIZE

            # send the partial file normally
            tempfilename = create_temp_file(filename, offset)
            status, timetaken = self._xmodem_send_receive_file(tempfilename, True)

            # delete the temporary file
            os.remove(part_filename)
            os.remove(tempfilename)

        # Send the last part, if there were residual bytes
        if(remain_size > 0):
            start = num_parts*BOOTLOADER_UNIFLASH_BUF_SIZE
            end = -1 # Read till the end of original file

            part_data = f_bytes[start:end]
            part_filename = orig_f_name + ".part{}".format(num_parts+1)

            # make the partial file
            f = open(part_filename, "wb")
            f.write(part_data)
            f.close()

            # temporarily change this to the partial filename
            filename = part_filename
            offset = orig_offset + num_parts*BOOTLOADER_UNIFLASH_BUF_SIZE

            # send the partial file normally
            tempfilename = create_temp_file(filename, offset)
            status, timetaken = self._xmodem_send_receive_file(tempfilename, True)

            # delete the temporary file
            os.remove(part_filename)
            os.remove(tempfilename)


    def _getc_closure(self):
        def _getc(size, timeout=1):
            return self.serObj.read(size) or None
        return _getc


    def _putc_closure(self):
        def _putc(data, timeout=1):
            self._update_bytes_sent(len(data))
            return self.serObj.write(data) # note that this ignores the timeout
        return _putc

