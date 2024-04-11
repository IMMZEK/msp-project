import os
import sys

dir_path1 = os.path.dirname(os.path.realpath(__file__)) + '/../'
sys.path.append(dir_path1)

from FlashPython import *
from stubs import *

def main():
    com_str = '/dev/ttyACM0'
    sbl_path = ''
    appimage_path = ''
    xip_path = ''

    images  = [ImageStub(sbl_path), ImageStub(appimage_path), ImageStub(xip_path),]
    propertiesMap = {'COMPort':com_str, 'partnum':"", 'FlashAppOffset':"", 'FlashBoardType':"EVM", 'CustomFlashEnable' : False ,'FlasherCustomPath':"",'FlasherCustomName':"sbl_uart_uniflash.release.tiimage"}

    flashObj = FlashPython(None)
    flashObj.load_image(images, propertiesMap)
    flashObj.shut_down()

main()
