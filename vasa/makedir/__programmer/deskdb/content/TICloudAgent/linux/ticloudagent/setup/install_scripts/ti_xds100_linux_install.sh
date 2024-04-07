#!/bin/bash


STARTDIR=`dirname "$0"`
USER=`whoami`
OPT=$1
UNINSTALL=0
TIUDEV_FILE="/etc/udev/rules.d/71-ti-permissions.rules"
TIRULES_FILE="${STARTDIR}/71-ti-permissions.rules"


# Usage
if [ "${OPT}" == "-h" -o "${OPT}" == "--help" ]; then
	echo "This program installs the Texas Instruments XDS100 Linux driver"
	echo "Usage: ti_xds100_linux_install.sh [options]"
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
	echo "ERROR: this script must be run as root"
	exit 1
fi


# For Redhat use the start_udev script
RESTARTUDEV="/sbin/start_udev"


# For others use "System V" service command
if [ ! -e ${RESTARTUDEV} ]; then
	RESTARTUDEV="service udev restart"
fi


# Remove old rules file
if [ -e ${TIUDEV_FILE} ]; then
	echo "Uninstalling ${TIUDEV_FILE}"
	rm -f ${TIUDEV_FILE}
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
if [ ! -e "${TIRULES_FILE}" ]; then
	echo "ERROR: the required component ${TIRULES_FILE} is missing from the installation"
	exit 1
fi


# Copy the new rules file and change its permissions
cp "${TIRULES_FILE}" ${TIUDEV_FILE}
if [ $? -ne 0 ]; then
	echo "ERROR: failed to copy ${TIRULES_FILE} to ${TIUDEV_FILE}"
	exit 1
fi


# Change its permissions
PERMISSIONS=644
chmod ${PERMISSIONS} ${TIUDEV_FILE}
if [ $? -ne 0 ]; then
	echo "ERROR: failed to set the permissions for ${TIRULES_FILE} to ${PERMISSIONS}"
	exit 1
fi


# All done
echo "TI XDS100 installation completed successfully.  Some versions of Linux"
echo "require a reboot in order for the driver to function properly.  For other"
echo "versions restarting udev is sufficient.  Restarting udev now ... "


# Restart udev
${RESTARTUDEV}
if [ $? -ne 0 ]; then
	echo "ERROR: failed to restart udev, reboot required"
	exit 1
fi
