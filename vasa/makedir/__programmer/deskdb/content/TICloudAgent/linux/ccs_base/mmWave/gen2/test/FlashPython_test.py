import os
import sys

dir_path1 = os.path.dirname(os.path.realpath(__file__)) + '/../'
sys.path.append(dir_path1)

from FlashPython import *
from stubs import *

def main():
    com_str = 'COM3'
    sbl_path = 'C:/ti/mmwave_mcuplus_sdk_04_02_00_02/mcu_plus_sdk_awr294x_08_01_01_06/tools/boot/sbl_prebuilt/awr294x-evm/sbl_qspi.release.tiimage'
    # appimage_path = 'C:/ti/mmwave_mcuplus_sdk_04_02_00_02/mmwave_mcuplus_sdk_04_02_00_02/ti/utils/ccsdebug/awr2944_ccsdebug.appimage'
    appimage_path = 'C:/ti/mmwave_mcuplus_sdk_04_02_00_02/mmwave_mcuplus_sdk_04_02_00_02/ti/demo/awr294x/mmw/awr2944_mmw_demoTDM.appimage'

    images  = [ImageStub(sbl_path), ImageStub(appimage_path)]
    propertiesMap = {'COMPort':com_str}

    flashObj = FlashPython(None)
    flashObj.load_image(images, propertiesMap)
    flashObj.shut_down()

main()
