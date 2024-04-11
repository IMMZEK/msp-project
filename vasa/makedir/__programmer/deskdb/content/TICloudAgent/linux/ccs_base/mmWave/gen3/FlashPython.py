from FlashPythonFramework import *
import os
dir_path = os.path.dirname(os.path.realpath(__file__))
dir_path += "/../common/pyserial-3.5/"

dir_path1 = os.path.dirname(os.path.realpath(__file__))
import sys
sys.path.append(dir_path)
sys.path.append(dir_path1)

# print sys.path
# import serial
# from serial import SerialException
import mmWaveProgFlash
TIMEOUT_VALUE = 10

FP_TRACE_LEVEL_FATAL = 3
FP_TRACE_LEVEL_ERROR = 2
FP_TRACE_LEVEL_WARNING = 1
FP_TRACE_LEVEL_INFO = 0
FP_TRACE_LEVEL_DEBUG = 255 # (value needs to be > 0).
FP_TRACE_LEVEL_ACTIVITY = FP_TRACE_LEVEL_INFO

CONFIG_FILE_PATH = os.path.join(dir_path1, "images", "ar1xxx_config.bin")

# NOTE!! If while editing this file, new push_message or update_progress
# calls are added where the message part is not strictly a string, and
# includes variable substitution, be sure to enclose the strong in
# the str() construct to convert it to a string. Otherwise, the
# C++ will return with an error since the function won't match a
# prototype (since the string would be unicode without str() ).

class FlashPython(FlashPythonInstance):

    def __init__(self, server):
        FlashPythonInstance.__init__(self, server)
        self.update_progress("Initialization of uniflash object completed", 0)
        # instantiate bootloader class, use COM1 as a default for now.
        # comm_port will be updated in the load_image or exec_command methods
        self.push_message(str("Starting %s"%(mmWaveProgFlash.BootLdr.__name__)), FP_TRACE_LEVEL_DEBUG)
        #----------TEST-------------
        # TEST: For testing purposes, and not using update progress or
        # push message callbacks, pass '' as first argument instead of
        # self.
        #self.ldr = mmWaveProgFlash.BootLdr('','COM1', -1)
        self.ldr = mmWaveProgFlash.BootLdr(self,'COM1')
        #----------TEST-------------
        self.update_progress("Initialization complete.", 1)
        self.push_message("Initialization complete.", FP_TRACE_LEVEL_INFO)
        self.ldr.update_prog_percentage(1)

    def load_image(self, images, propertiesMap):
        if(propertiesMap['MemSelectRadio'] == "SRAM"):
            propertiesMap['DownloadFormat'] = False
        self.images = images
        status = True
        #----------TEST-------------
        # TEST: For testing purposes without valid data from the uniflash
        # backend, uncomment the following lines that define a specific
        # use case.
        #propertiesMap['COMPort'] = 'COM37'
        #propertiesMap['MemSelectRadio'] = 'SFLASH'
        #propertiesMap['DownloadFormat'] = True
        #propertiesMap['partnum'] = 'AWR1443'
        #propertiesMap['partnum'] = 'AWR1642'
        # print(propertiesMap)
        # print(images)
        #----------TEST-------------
        self.propertiesMap = propertiesMap
        # check for keys in propertiesMap
        status = self.ldr.checkPropertiesMapKeys(propertiesMap)
        if (status is False):
            self.push_message("Check Integration. Dict keys do not match", FP_TRACE_LEVEL_FATAL)
            return
        c = self.check_is_cancel_set()
        if (c is False):
            self.push_message("Flashing process starting...", FP_TRACE_LEVEL_INFO)
            self.com_port = self.propertiesMap['COMPort']# get the com port.
            # Open com port. This will check that the serial port
            # can be opened and will return status information.
            passed = self.ldr.connect(TIMEOUT_VALUE, self.com_port)
            if (passed is True):
                # get the storage type
                storage = self.propertiesMap['MemSelectRadio']
                # get the device type
                partNum = self.propertiesMap['partnum']
                if (self.ldr.isPartNumSupported(partNum)):
                    self.push_message(str("Flashing files to %s device."%(partNum)),FP_TRACE_LEVEL_DEBUG)
                    self.ldr.setPartNum(partNum)
                    # Check to see if this device is PG3.0 or later.
                    # status = self.ldr.determinePGVersion()
                    # if (status is False):
                    #     self.push_message(str("Not able to get version of device. Please power cycle device and try again."), FP_TRACE_LEVEL_ERROR)
                    #     self.ldr.disconnect()
                    #     return
                    # Copy the list of file information from the images
                    # object list, since we can't edit attributes in it
                    filesList = self.ldr.copyImagesList(images)
                    # If this is a device which needs to use the older file
                    # then add the CONFIG file to the image list. CONFIG
                    # file is available locally and will be uploaded
                    # automatically
                    #Not required for low end
                    #self.ldr.addAutomaticDownload(filesList, CONFIG_FILE_PATH)
                    # Go through list of files and check that they have the
                    # correct header. Based on the valid header, store the
                    # fileID for that file to the filesList list entry
                    fileSizeSum = 0
                    correctFile = True
                    self.push_message(str("** %d files specified for flashing." %(len(filesList))), FP_TRACE_LEVEL_INFO)
                    for i in filesList:
                        correctFile = self.ldr.checkFileHeader(i.path, i)
                        if (correctFile is False):
                            break
                        else:
                            fileSizeSum = fileSizeSum + i.fileSize
                    # If a file header was not one of the correct types for this part,
                    # abort flashing.
                    if (correctFile is False):
                        self.update_progress("!!! Aborting flashing of specified files!!!", 90)
                        self.push_message("!!! Aborting flashing of specified files!!!",FP_TRACE_LEVEL_FATAL)
                        self.ldr.disconnect()
                        return
                    # ---- Ready to flash files.-----
                    self.push_message(str("!! Files are valid for %s."%(partNum)),FP_TRACE_LEVEL_INFO)
                    # Determine the numbers for progress indicator
                    self.ldr.calcProgressValues(filesList, fileSizeSum, self.propertiesMap['DownloadFormat'])
                    # Check if cancel is set. If yes, exit. We haven't done
                    # anything yet.
                    c = self.check_is_cancel_set()
                    if (c is True):
                        self.push_message(mmWaveProgFlash.AWR_CANCEL_MSG, FP_TRACE_LEVEL_WARNING)
                        self.ldr.disconnect()
                        return
                    # Check if format property is set and erase accordingly
                    if (self.propertiesMap['DownloadFormat'] == True):
                        nextPercentage = self.ldr.get_prog_percentage() + 1
                        self.push_message("Format on download was specified. Formatting SFLASH storage...", FP_TRACE_LEVEL_INFO)
                        self.update_progress("Format before download started ...", nextPercentage)
                        self.ldr.update_prog_percentage(nextPercentage)
                        self.ldr.erase_storage()
                        nextPercentage = self.ldr.get_prog_percentage()+1
                        self.update_progress("Format Complete!",nextPercentage)
                        self.ldr.update_prog_percentage(nextPercentage)
                    # For each file, call ldr.download_file with filename,
                    # fileID and storage
                    for i in filesList:
                        # Get the progress counters calculated earlier, keyed
                        # with the image instance
                        imageProgCntList = self.ldr.getImageProgCntList(i)
                        status = self.ldr.download_file(i.path, i.file_id, 0, 0, storage,imageProgCntList)
                        if (status is False):
                            self.push_message("FAILURE: File Download Failure!! Ceasing session...", FP_TRACE_LEVEL_FATAL)
                            self.push_message("{}".format(partNum),FP_TRACE_LEVEL_FATAL)
                            self.push_message("Aborting operations...", FP_TRACE_LEVEL_FATAL)
                            break
                        else:
                            self.push_message(str("SUCCESS!! File type %s downloaded successfully to %s."%(i.file_id, storage)), FP_TRACE_LEVEL_INFO)
                        # After each file, check for cancel. if cancel,
                        # call ldr.disconnect() and exit method
                        c = self.check_is_cancel_set()
                        if (c is True):
                            self.ldr.disconnect()
                            self.push_message(mmWaveProgFlash.AWR_CANCEL_MSG, FP_TRACE_LEVEL_WARNING)
                            break
                    # when all done, disconnect from serial port
                    self.ldr.disconnect()
                else:
                    self.push_message("Internal Error: Unknown device type. Cannot proceed. Exiting...", FP_TRACE_LEVEL_FATAL)
                    self.update_progress("Cannot proceed", 90)
            else:
                self.push_message("Not able to connect to serial port. Recheck COM port selected and/or permissions.", FP_TRACE_LEVEL_FATAL)
        else:
            self.push_message(mmWaveProgFlash.AWR_CANCEL_MSG, FP_TRACE_LEVEL_WARNING)

    def exec_command(self, command, propertiesMap):
        self.command = command
        self.propertiesMap = propertiesMap
        if (self.command == 'Format' and propertiesMap['MemSelectRadio'] != "SRAM"):
            com_port = self.propertiesMap['COMPort']
            passed = self.ldr.connect(TIMEOUT_VALUE, com_port)
            if (passed == True):
                # Check for a cancel operation before command is sent.
                c = self.check_is_cancel_set()
                if (c == False):
                    # don't need to set partNum, PG version for this command
                    self.update_progress("Format started ...", 25)
                    self.ldr.update_prog_percentage(25)
                    self.push_message(str("FORMAT Command: Initiating erase operation of SFLASH storage area."), FP_TRACE_LEVEL_INFO)
                    self.ldr.erase_storage()
                    self.update_progress("Format started ...", 75)
                    self.ldr.update_prog_percentage(75)
                else:
                    self.push_message(mmWaveProgFlash.AWR_CANCEL_MSG, FP_TRACE_LEVEL_WARNING)
                self.ldr.disconnect()
            else:
                self.push_message("Not able to connect to serial port. Recheck the COM port selected.", FP_TRACE_LEVEL_FATAL)
        else:
            self.push_message(str("Command %s is not a valid command. Try Changing storage. Internal Error."%(self.command)), FP_TRACE_LEVEL_ERROR)


    def shut_down(self):
        self.update_progress("Instance shutdown procedure activated...", 99)
        self.push_message("Flashing instance clean-up initiated...", FP_TRACE_LEVEL_INFO)
        # try:
            # ser = serial.Serial('COM5', 115200, timeout=1) # open serial port
        # except SerialException:
            # print "Cannot open port as it does not exist or is already open"
        # else:
            # print(ser.name)         # check which port was really used
            # ser.write(b'hello')     # write a string
            # ser.close()             # close port
        del self.ldr
        self.update_progress("Done.", 100)
        self.push_message("Instance deinitialized!", FP_TRACE_LEVEL_INFO)
