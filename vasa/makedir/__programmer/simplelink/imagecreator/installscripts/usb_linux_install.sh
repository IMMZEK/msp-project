#!/bin/bash

STARTDIR=`dirname $0`
USER=`whoami`
OPT=$1
UNINSTALL=0
TIUDEV_FILE="/etc/udev/rules.d/99-slusb.rules"
TIRULES_FILE="${STARTDIR}/99-slusb.rules"

# Usage
if [ "${OPT}" == "-h" -o "${OPT}" == "--help" ]; then
	echo "This program installs the FTDI USB Linux driver for CC3100 and CC3200 devices"
	echo "Usage: usb_linux_install.sh [options]"
	echo "Options:"
	echo " -h,--help       Display usage and exit"
	echo " -i,--install    Install and exit (default)"
	echo " -u,--uninstall  Uninstall and exit"
	exit 0
elif [ "${OPT}" == "-u" -o "${OPT}" == "--uninstall" ]; then
	UNINSTALL=1
fi


# Check root
if [ "${USER}" != "root" ]; then
	echo "This script must be run as root ..."
	#exit 1
fi


# For Redhat use the start_udev script
RESTARTUDEV="/sbin/start_udev"


# For others use "System V" service command
if [ ! -e ${RESTARTUDEV} ]; then
	RESTARTUDEV="sudo service udev restart"
fi


# Remove old rules file
if [ -e ${TIUDEV_FILE} ]; then
	echo "Uninstalling ${TIUDEV_FILE}"
	sudo rm -f ${TIUDEV_FILE}
	if [ $? -ne 0 ]; then
		echo "ERROR: failed to remove ${TIUDEV_FILE}"
		exit 1
	fi
fi


# If UNISTALL option then exit
if [ ${UNINSTALL} -ne 0 ]; then
	exit 0
fi


# Check rules file is not missing
if [ ! -e ${TIRULES_FILE} ]; then
	echo "ERROR: the required component ${TIRULES_FILE} is missing from the installation"
	exit 1
fi


# Copy the new rules file and change its permissions
sudo cp ${TIRULES_FILE} ${TIUDEV_FILE}
if [ $? -ne 0 ]; then
	echo "ERROR: failed to copy ${TIRULES_FILE} to ${TIUDEV_FILE}"
	exit 1
fi


# Change its permissions
PERMISSIONS=644
sudo chmod ${PERMISSIONS} ${TIUDEV_FILE}
if [ $? -ne 0 ]; then
	echo "ERROR: failed to set the permissions for ${TIRULES_FILE} to ${PERMISSIONS}"
	exit 1
fi

#Create a group called "usbusers"
#addgroup usbusers
#if [ $? -ne 0 ]; then
	#echo "ERROR: failed to create a group called \"usbusers\""
	#exit 1
#fi

#Add the user to the group
#usermod -a -G usbusers ${USER}
#if [ $? -ne 0 ]; then
#	echo "ERROR: failed to add the user to the group"
#	exit 1
#fi

# All done
echo "FTDI USB installation completed successfully.  Some versions of Linux"
echo "require a reboot in order for the driver to function properly.  For other"
echo "versions restarting udev is sufficient.  Restarting udev now ... "


# Restart udev
${RESTARTUDEV}
if [ $? -ne 0 ]; then
	echo "ERROR: failed to restart udev, reboot required"
	exit 1
fi
