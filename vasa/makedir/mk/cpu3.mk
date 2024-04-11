#################################################################
# includes
#################################################################
-include $(MK_DIR)/common.mk

#################################################################
# paths
#################################################################
CPUx_BUILD_DIR := $(BUILD_DIR)/cpu3
CPUx_SRC := cpu3

#################################################################
# options
#################################################################
CPUx_DEFINES := \
		--define=CPU2 \
		$(COMMON_DEFINES)

CPUx_SRC_C_OBJS := $(patsubst $(CPUx_SRC)/%.cc,$(CPUx_BUILD_DIR)/%.obj,$(wildcard $(CPUx_SRC)/*.cc))
CPUx_OBJS := \
		$(CPUx_BUILD_DIR)/F2837xD_CodeStartBranch.obj \
		$(CPUx_BUILD_DIR)/device.obj \
		$(CPUx_SRC_C_OBJS)
CPUx_LINKER_OBJS := \
		$(CMD_ROOT)/2837xD_FLASH_lnk_cpu3.cmd \
		$(CPUx_OBJS)

#################################################################
# this needs to be after the CPUx_ things have been declared
#################################################################
-include $(MK_DIR)/tasks.mk

clean_cpu2:
		@$(RM) -r $(CPUx_BUILD_DIR)
