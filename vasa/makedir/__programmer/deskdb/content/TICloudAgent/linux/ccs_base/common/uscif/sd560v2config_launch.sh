#!/bin/bash

currentpath=$PWD
scriptpath=$(dirname $0)
cd $scriptpath 

../../../eclipse/jre/bin/java -jar sd560v2config.jar

cd $currentpath
