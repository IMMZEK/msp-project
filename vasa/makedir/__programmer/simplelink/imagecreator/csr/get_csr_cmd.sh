#!/bin/bash

# Bash file to get csr from device automatically with ImageCreator
#
# v.0.3
#
# Usage : ./get_csr.sh <device(CC3220S,CC3220SF)> <port(COM+number)>
echo
echo get_csr.sh v.0.3
echo
# directory of script
SCRIPTFILEPATH=$(cd "$(dirname "$0")"; pwd)
IMAGECREATORPATH=$SCRIPTFILEPATH/../bin
SDKINSTALLPATH=/home/user/ti/simplelink_cc32xx_sdk_1_60_00_04
SPNAME=sp_3.6.0.3_2.0.0.0_2.2.0.6.bin
SP_PATH=$SDKINSTALLPATH/tools/cc32xx_tools/servicepack-cc3x20
DUMMY_CERT_NAME=dummy-root-ca-cert
DUMMY_KEY_NAME=dummy-root-ca-cert-key
DUMMY_CERT_PATH=$SDKINSTALLPATH/tools/cc32xx_tools/certificate-playground

# csr params
# Certificate serial number (up to  8 bytes)
CERT_SERIAL_NUM="0111000"
# Validity period in days (> 0)
VALIDITY="2"
# Is certificate CA? (0-No/1-Yes )
ISCA="1"
# Subject country( 2 capital letters, i.e US)
COUNTRY="US"
# Subject state (max size is 64)
STATE='Texas Inst'
# Subject locality (max size is 64)
LOCALITY="Dallas"
# Subject surname (max size is 64)
SURNAME="cc3xxx"
# Subject organization  (max size is 64)
ORGANIZATION="Texas"
# Subject organization unit (max size is 64)
ORG_UNIT="Infra"
# Subject common name (max size is 64)
NAME="Archibald"
# Subject email (max size is 64)
EMAIL="email@email.com"

echo
echo Parameters verification
echo
# Verify Path to UniFlash
if [ ! -d $IMAGECREATORPATH ] ;then
echo
echo Error: ImageCreator folder not Found at $IMAGECREATORPATH
echo
exit 1
fi

# Verify Path to UniFlash
if [ ! -d $SDKINSTALLPATH ] ;then
echo
echo Error: SDK folder not Found at $SDKINSTALLPATH
echo
exit 1
fi



if [[ ! $1 ]]; then
    echo
    echo Error: Device name not specified. Supports only CC3220S or CC3220SF or CC3235S or CC3225SF
    echo
exit 1
fi
if [ "$1" != "CC3220S" ] && [ "$1" != "CC3220SF" ] && [ "$1" != "CC3235S" ] && [ "$1" != "CC3235SF" ] ; then
    echo
    echo Error: Bad device name. Should be CC3220S or CC3220SF or CC3235S or CC3225SF
    echo
exit 1
fi


PROJDEVICE=$1
COMPORT=$2
BINFILENAME=$(basename $SCRIPTFILEPATH/$PROJDEVICE/*)
OUTBINFILEPATH=$SCRIPTFILEPATH/Output

if [ ! -d $OUTBINFILEPATH ] ;then
    mkdir -p $OUTBINFILEPATH
fi

EXT="_CSR"
PROJNAME=$PROJDEVICE$EXT

# Test existance of the Binary File
if [ ! -f $SCRIPTFILEPATH/$PROJDEVICE/$BINFILENAME ]  ; then
    echo
    echo Error: Binary File $SCRIPTFILEPATH/$PROJDEVICE/$BINFILENAME Not Found
    exit  1
fi

# Test existance of the Service Pack
if [ ! -f $SP_PATH/$SPNAME ] ; then
    echo
    echo Error: SP File $SP_PATH/$SPNAME Not Found
    exit  1
fi

# Test existance of the Certificates
if [ ! -f $DUMMY_CERT_PATH/$DUMMY_CERT_NAME ]  ; then
    echo
    echo Error: Certificate File $DUMMY_CERT_PATH/$DUMMY_CERT_NAME Not Found
    exit  1
fi

echo
echo Done
echo

echo
echo ProjectName        -- $PROJNAME
echo BinFileName        -- $BINFILENAME
echo OutputFileFolder   -- $OUTBINFILEPATH
echo ServicePack        -- $SP_PATH$/$SPNAME
echo Certificate        -- $DUMMY_CERT_PATH/$DUMMY_CERT_NAME
echo

RUNCMD=./SLImageCreator
XDSREset=./xds110reset
CSREXE=./csr


echo pushd $IMAGECREATORPATH
pushd $IMAGECREATORPATH



echo
echo sleep 10
echo
sleep 10

echo
echo reset device
echo
$XDSREset

echo
echo popd
echo
popd

echo
echo pushd $SCRIPTFILEPATH
echo
pushd $SCRIPTFILEPATH

if [[ ! $COMPORT ]]; then
    echo
    echo  $CSREXE --file "$OUTBINFILEPATH/csr.pem" --1 "$CERT_SERIAL_NUM" --2 "$VALIDITY" --3 "$ISCA" --4 "$COUNTRY" --5 "$STATE" --6 "$LOCALITY" --7 "$SURNAME" --8 "$ORGANIZATION" --9 "$ORG_UNIT" --10 "$NAME" --11 "$EMAIL"
    echo
    $CSREXE --file "$OUTBINFILEPATH/csr.pem" --1 "$CERT_SERIAL_NUM" --2 "$VALIDITY" --3 "$ISCA" --4 "$COUNTRY" --5 "$STATE" --6 "$LOCALITY" --7 "$SURNAME" --8 "$ORGANIZATION" --9 "$ORG_UNIT" --10 "$NAME" --11 "$EMAIL"
else
    echo
    echo $CSREXE --port $COMPORT --file "$OUTBINFILEPATH/csr.pem" --1 $CERT_SERIAL_NUM --2 $VALIDITY --3 $ISCA --4 $COUNTRY --5 $STATE --6 $LOCALITY --7 $SURNAME --8 $ORGANIZATION --9 $ORG_UNIT --10 $NAME --11 $EMAIL
    echo
    $CSREXE --port "$COMPORT" --file "$OUTBINFILEPATH/csr.pem" --1 "$CERT_SERIAL_NUM" --2 "$VALIDITY" --3 "$ISCA" --4 "$COUNTRY" --5 "$STATE" --6 "$LOCALITY" --7 "$SURNAME" --8 "$ORGANIZATION" --9 "$ORG_UNIT" --10 "$NAME" --11 "$EMAIL"
fi

echo
echo popd
echo
popd

