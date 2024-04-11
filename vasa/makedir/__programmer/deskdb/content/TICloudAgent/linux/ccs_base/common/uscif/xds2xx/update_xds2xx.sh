#!/bin/bash

xds200()
{
    cd "$( dirname "$0" )"
    if [ -f xds200_firmware_v1009.bin ];then
        echo .
        echo "Updating Firmware ..."
        ./xds2xx_conf update  xds2xxu 0 xds200_firmware_v1009.bin
        echo .
        echo "Rebooting, please wait ..."
        ./xds2xx_conf boot xds2xxu 0
    fi 

    if [ -f xds2xx_cpld_v1009.xsvf ];then
        echo .
        echo "Updating CPLD ..."
        ./xds2xx_conf program xds2xxu 0 xds2xx_cpld_v1009.xsvf
    fi
    
    if [ -f xds200_firmware_v1009.bin ];then
        echo .
        echo "Reading Configuration ..."
        echo .
        echo "Check swRev is 1.0.0.9 or higher."
        echo .
        ./xds2xx_conf get xds2xxu 0
    fi 
}

xds220()
{
    cd "$( dirname "$0" )"
    if [ -f xds220_firmware_v1009.bin ];then
        echo .
        echo "Updating Firmware ..."
        ./xds2xx_conf update  xds2xxu 0 xds220_firmware_v1009.bin
        echo .
        echo "Rebooting, please wait ..."
        ./xds2xx_conf boot xds2xxu 0
    fi 

    if [ -f xds2xx_cpld_v1009.xsvf ];then
        echo .
        echo "Updating CPLD ..."
        ./xds2xx_conf program xds2xxu 0 xds2xx_cpld_v1009.xsvf
    fi
    
    if [ -f xds220_firmware_v1009.bin ];then
        echo .
        echo "Reading Configuration ..."
        echo .
        echo "Check swRev is 1.0.0.9 or higher."
        echo .
        ./xds2xx_conf get xds2xxu 0
    fi 
}

if [ "$1" == "xds200" ];then
    xds200  
elif [ "$1" == "xds220" ];then
    xds220
else    
    echo "ERROR: Unknown option $1".
    echo "Valid options are xds200 or xds220."
    echo "Do not run this script on an XDS220 ISO."
fi


