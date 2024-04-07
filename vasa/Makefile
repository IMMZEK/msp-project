# Paths
COMPILER_ROOT := makedir/__compiler/ti-cgt-c2000_22.6.1.LTS
DEVICE_ROOT := makedir/__device
DRIVERLIB_ROOT := $(DEVICE_ROOT)/driverlib
DRIVERLIB := $(DRIVERLIB_ROOT)/ccs/Release/driverlib.lib
PROJ_NAME := vasa

# Compiler and Flags
COMPILER := $(COMPILER_ROOT)/bin/cl2000
HEX_UTIL := $(COMPILER_ROOT)/bin/hex2000
PROGRAMMER := makedir/__programmer/dslite.sh
PROGRAMMER_CCXML := makedir/__ccxml/f28379d.ccxml

COMMON_FLAGS := \
		-v28 \
		-ml \
		-mt \
		--cla_support=cla1 \
		--float_support=fpu32 \
		--tmu_support=tmu0 \
		--vcu_support=vcu2 \
		-Ooff \
		--diag_suppress=10063 \
		--diag_warning=225 \
		--diag_wrap=off \
		--display_error_number \
		--abi=eabi

COMMON_DEFINES := \
		--define=CPU1 \
		--define=_FLASH

COMMON_INCLUDES := \
		--include_path="$(DEVICE_ROOT)" \
		--include_path="$(DRIVERLIB_ROOT)" \
		--include_path="$(COMPILER_ROOT)/include"

BUILD_DIR := build

SRC_C_OBJS := $(patsubst src/%.cc,build/%.obj,$(wildcard src/*.cc))
OBJS := \
		$(BUILD_DIR)/F2837xD_CodeStartBranch.obj \
		$(BUILD_DIR)/device.obj \
		$(SRC_C_OBJS)

# Libraries to include during linking
LIBS := \
		$(DRIVERLIB) \
		-llibc.a

# Linker Object Files and CMD file
LINKER_OBJS := \
		$(OBJS) \
		makedir/__cmd/2837xD_FLASH_lnk_cpu1.cmd

# Rule for C source files
$(BUILD_DIR)/%.obj: ./src/%.cc
		@echo $(SRC_C_OBJS)
		@echo 'Building file: "$<"'
		@echo 'Invoking: C2000 Compiler'
		"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) $(COMMON_INCLUDES) \
		--preproc_with_compile \
		--preproc_dependency="$(BUILD_DIR)/$(basename $(<F)).d_raw" \
		--obj_directory="$(BUILD_DIR)" \
		"$<"
		@echo 'Finished building: "$<"'

# Rule for ASM source files in device directory
$(BUILD_DIR)/%.obj: makedir/__device/%.asm
		@echo 'Building file: "$<"'
		@echo 'Invoking: C2000 Compiler'
		"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) \
		--obj_directory="$(BUILD_DIR)" \
		"$<"
		@echo 'Finished building: "$<"'

# Rule for C source files in device directory
$(BUILD_DIR)/%.obj: makedir/__device/%.c
		@echo 'Building file: "$<"'
		@echo 'Invoking: C2000 Compiler'
		"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) $(COMMON_INCLUDES) \
		--preproc_with_compile \
		--preproc_dependency="$(BUILD_DIR)/$(basename $(<F)).d_raw" \
		--obj_directory="$(BUILD_DIR)" \
		"$<"
		@echo 'Finished building: "$<"'

# Main target
all: build_dir $(OBJS) $(CMD_SRCS) $(LIB_SRCS)
		@$(MAKE) --no-print-directory -Onone "$(BUILD_DIR)/$(PROJ_NAME).out"
		@$(MAKE) --no-print-directory hex

build_dir:
		@mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/$(PROJ_NAME).out: $(LINKER_OBJS)
		@echo 'Building target: "$@"'
		@echo 'Invoking: C2000 Linker'
		"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) \
		-z \
		-m"$(BUILD_DIR)/$(PROJ_NAME).map" \
		--stack_size=0x100 \
		--warn_sections \
		-i"$(COMPILER_ROOT)/lib" \
		-i"$(COMPILER_ROOT)/include" \
		--reread_libs \
		--xml_link_info="$(BUILD_DIR)/$(PROJ_NAME)_linkInfo.xml" \
		--entry_point=code_start \
		--rom_model \
		-o "$@" \
		$(LINKER_OBJS) $(LIBS)
		@echo 'Finished building target: "$@"'

hex:
		@echo 'Hexing target: "$(BUILD_DIR)/$(PROJ_NAME).out" to the board...'
		"$(HEX_UTIL)" "$(BUILD_DIR)/$(PROJ_NAME).out" -boot -sci8 -a -o "$(BUILD_DIR)/$(PROJ_NAME).txt"
		@echo 'Finished hexing.'

flash: all
		@echo 'Flashing target: "$(BUILD_DIR)/$(PROJ_NAME).out" to the board...'
		"$(PROGRAMMER)" --config="$(PROGRAMMER_CCXML)" "$(BUILD_DIR)/$(PROJ_NAME).out"
		@echo 'Finished flashing.'

# Cleaning up generated files
clean:
		-@$(RM) -r $(OBJS) $(OBJS:.obj=.d) $(OBJS:.obj=.d_raw) "$(BUILD_DIR)/$(PROJ_NAME)_linkInfo.xml" "$(BUILD_DIR)/$(PROJ_NAME).map" "$(BUILD_DIR)/$(PROJ_NAME).out" "$(BUILD_DIR)"
		-@echo 'Finished clean'

.PHONY: all clean dependents

