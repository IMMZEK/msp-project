# Paths
COMPILER_ROOT := ../__compiler/ti-cgt-c2000_22.6.1.LTS
DEVICE_ROOT := ../__device
DRIVERLIB_ROOT := $(DEVICE_ROOT)/driverlib
DRIVERLIB := $(DRIVERLIB_ROOT)/ccs/Release/driverlib.lib

# Compiler and Flags
COMPILER := $(COMPILER_ROOT)/bin/cl2000
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

# Object Files
OBJS := \
	./main.obj \
	./F2837xD_CodeStartBranch.obj \
	./device.obj \
	./foo.obj

# Libraries to include during linking
LIBS := \
	$(DRIVERLIB) \
	-llibc.a

# Linker Object Files
LINKER_OBJS := \
	$(OBJS) \
	../__cmd/2837xD_FLASH_lnk_cpu1.cmd

# Rule for C source files
%.obj: ../../src/%.c 
	@echo 'Building file: "$<"'
	@echo 'Invoking: C2000 Compiler'
	"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) $(COMMON_INCLUDES) \
	--preproc_with_compile \
	--preproc_dependency="$(basename $(<F)).d_raw" \
	"$<"
	@echo 'Finished building: "$<"'

# Rule for ASM source files in device directory
%.obj: ../__device/%.asm
	@echo 'Building file: "$<"'
	@echo 'Invoking: C2000 Compiler'
	"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) \
	--obj_directory="." \
	"$<"
	@echo 'Finished building: "$<"'

# Rule for C source files in device directory
%.obj: ../__device/%.c
	@echo 'Building file: "$<"'
	@echo 'Invoking: C2000 Compiler'
	"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) $(COMMON_INCLUDES) \
	--preproc_with_compile \
	--preproc_dependency="./$(basename $(<F)).d_raw" \
	--obj_directory="." \
	"$<"
	@echo 'Finished building: "$<"'

# Main target
all: $(OBJS) $(CMD_SRCS) $(LIB_SRCS)
	@$(MAKE) --no-print-directory -Onone "VASA.out"

VASA.out: $(LINKER_OBJS)
	@echo 'Building target: "$@"'
	@echo 'Invoking: C2000 Linker'
	"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) \
	-z \
	-m"VASA.map" \
	--stack_size=0x100 \
	--warn_sections \
	-i"$(COMPILER_ROOT)/lib" \
	-i"$(COMPILER_ROOT)/include" \
	--reread_libs \
	--xml_link_info="VASA_linkInfo.xml" \
	--entry_point=code_start \
	--rom_model \
	-o "$@" \
	$(LINKER_OBJS) $(LIBS)
	@echo 'Finished building target: "$@"'

# Cleaning up generated files
clean:
	-@$(RM) $(OBJS) $(OBJS:.obj=.d) $(OBJS:.obj=.d_raw) "VASA_linkInfo.xml" "VASA.map" "VASA.out"
	-@echo 'Finished clean'

.PHONY: all clean dependents

