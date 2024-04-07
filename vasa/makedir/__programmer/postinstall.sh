#!/bin/sh
#
#check if .0 version exists. If not, check for .1 version and create a link if it is there.
if [ ! $(/sbin/ldconfig -p|grep 'libudev.so.0 .*64') ]; then
  #64-bit libudev.so.0 is not present
  UDEVPATH=`ldconfig -p|grep 'libudev.so.1 .*64'|awk '{print $NF}'`
  if [ ! -z "$UDEVPATH" ]; then
    #64-bit libudev.so.1 is present, create the symlink
    CA_UDEV_LINK=`dirname $UDEVPATH`/libudev.so.0
    if [ ! -f $CA_UDEV_LINK ]; then
      ln -s $UDEVPATH $CA_UDEV_LINK
    fi
  fi
fi

"/home/brighton/Documents/UTILS/ti/uniflash/deskdb/content/TICloudAgent/linux/ticloudagent/setup/install.sh" --install
"/home/brighton/Documents/UTILS/ti/uniflash/simplelink/imagecreator/installscripts/ti_debug_probes_linux_install.sh"
"/home/brighton/Documents/UTILS/ti/uniflash/simplelink/imagecreator/installscripts/usb_linux_install.sh"
