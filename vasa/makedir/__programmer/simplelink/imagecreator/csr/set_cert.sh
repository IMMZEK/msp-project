#!/bin/bash

# Bash file to set certificate file to ImageCreator project automatically
#
# v.0.4
#
# Usage : ./set_cert.sh <proj_name> <pem_file_name_in_the_project_file_system> <pem_file_source>
echo
echo set_cert.sh v.0.4
echo
# directory of script
SCRIPTFILEPATH=$(cd "$(dirname "$0")"; pwd)
IMAGECREATORPATH=$SCRIPTFILEPATH/../bin

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

PROJNAME=$1
FILENAME=$2
FILESOURCE=$3


echo
echo ProjectName        -- $PROJNAME
echo FileName        -- $FILENAME
echo FileSource        -- $FILESOURCE
echo


echo
echo Done
echo



RUNCMD=./SLImageCreator



echo pushd $IMAGECREATORPATH
pushd $IMAGECREATORPATH

echo
echo Deleting old pem file from the project
echo
$RUNCMD -q project del_file  --name $PROJNAME --file $FILENAME

echo
echo Adding csr file to the project
echo
$RUNCMD -q project add_file  --name $PROJNAME --fs_path $FILENAME --file $FILESOURCE



echo
echo popd
echo
popd
