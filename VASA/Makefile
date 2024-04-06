# Makefile for VASA project using TI CGT for C2000

CC = "/opt/ccstudio/ccs/tools/compiler/ti-cgt-c2000_22.6.1.LTS/bin/cl2000"
LINKER = $(CC) # Using the same tool for both compiling and linking

# Compiler flags
#         -v28                                    # Selects the language standard/version.
#         -ml                                     # Enables long addressing mode.
#         -mt                                     # Enables multi-threading support.
#         --cla_support=cla1                      # Enables CLA (Control Law Accelerator) support, version 1.
#         --float_support=fpu32                   # Selects the floating-point unit (FPU) support, 32-bit.
#         --tmu_support=tmu0                      # Enables Trigonometric Math Unit (TMU) support, version 0.
#         --vcu_support=vcu2                      # Enables Viterbi/Complex Math Unit (VCU) support, version 2.
#         --include_path="..."                    # Specifies a directory to search for include files (repeated for multiple directories).
#         -g                                      # Generates debug information.
#         --diag_warning=225                      # Sets the diagnostic warning level.
#         --diag_wrap=off                         # Controls diagnostic message wrapping.
#         --display_error_number                  # Displays error numbers in diagnostic messages.
#         --abi=coffabi                           # Selects the ABI (Application Binary Interface).
#         --preproc_with_compile                  # Runs the preprocessor in the same step as compilation.

# Compiler flags
CFLAGS_BASE = -v28 \
			-ml \
			-mt \
			--cla_support=cla1 \
			--float_support=fpu32 \
			--tmu_support=tmu0 \
			--vcu_support=vcu2 \
			--include_path="$(F28379D_HEADERS)device_support/f2837xd/common/include" \
            --include_path="$(F28379D_HEADERS)driverlib/f2837xd/driverlib" \
			--include_path="/opt/ccstudio/ccs/tools/compiler/ti-cgt-c2000_22.6.1.LTS/include" \
			-g \
			--diag_warning=225 \
			--diag_wrap=off \
			--display_error_number \
			--abi=coffabi \
			--preproc_with_compile

# Add CPU specific flags here
CFLAGS_CPU1 = $(CFLAGS_BASE) -DCPU1
CFLAGS_CPU2 = $(CFLAGS_BASE) -DCPU2

# Linker flags
#         -v28                                    # Selects the language standard/version.
#         -ml                                     # Enables long addressing mode.
#         -mt                                     # Enables multi-threading support.
#         --cla_support=cla1                      # Enables CLA support, version 1.
#         --float_support=fpu32                   # Selects FPU support, 32-bit.
#         --tmu_support=tmu0                      # Enables TMU support, version 0.
#         --vcu_support=vcu2                      # Enables VCU support, version 2.
#         -g                                      # Generates debug information.
#         --diag_warning=225                      # Sets the diagnostic warning level.
#         --diag_wrap=off                         # Controls diagnostic message wrapping.
#         --display_error_number                  # Displays error numbers in diagnostic messages.
#         -z                                      # Instructs the linker to remove unused sections.
#         -m"VASA.map"                            # Specifies the name of the map file to be generated.
#         --stack_size=0x200                      # Sets the stack size.
#         --warn_sections                         # Enables warnings for section mismatches.
#         -i"..."                                 # Specifies a directory to search for system libraries and include files (repeated for multiple directories).
#         --reread_libs                           # Forces the linker to reread libraries to resolve symbols as needed.
#         --xml_link_info="VASA_linkInfo.xml"     # Generates linker information in XML format.
#         --rom_model                             # Selects the ROM model for linking.

# Linker flags
LFLAGS = -v28 \
		-ml \
		-mt \
		--cla_support=cla1 \
		--float_support=fpu32 \
		--tmu_support=tmu0 \
		--vcu_support=vcu2 \
		-g \
		--diag_warning=225 \
		--diag_wrap=off \
		--display_error_number \
		-z \
		-m"VASA.map" \
		--stack_size=0x200 \
		--warn_sections \
		--reread_libs \
		--xml_link_info="VASA_linkInfo.xml" \
		--rom_model \
		-i"$(F28379D_HEADERS)device_support/f2837xd/common/include" \
		-i"$(F28379D_HEADERS)driverlib/f2837xd/driverlib" \
		-i"/opt/ccstudio/ccs/tools/compiler/ti-cgt-c2000_22.6.1.LTS/include" \
		-i"/opt/ccstudio/ccs/tools/compiler/ti-cgt-c2000_22.6.1.LTS/lib" \
		-l"$(F28379D_HEADERS)driverlib/f2837xd/driverlib/ccs/Release/driverlib_coff.lib" \

TARGET = VASA.out
SOURCES = ./main.c
OBJECTS = $(SOURCES:./%.c=%.obj)
DEPENDS = $(SOURCES:./%.c=%.d)

# Default target
all: cpu1 cpu2

cpu1: CFLAGS = $(CFLAGS_CPU1)
cpu1: $(TARGET)

cpu2: CFLAGS = $(CFLAGS_CPU2)
cpu2: $(TARGET)


$(TARGET): $(OBJECTS)
	$(LINKER) $(LFLAGS) -o $@ $^ "./2837xD_FLASH_lnk_cpu1.cmd" -llibc.a

%.obj: ./%.c
	$(CC) $(CFLAGS) --preproc_dependency="$*.d" $< -o $@

# Include dependency files if they exist
-include $(DEPENDS)

clean:
	rm -f $(OBJECTS) $(TARGET) $(DEPENDS) VASA.map VASA_linkInfo.xml

.PHONY: all clean cpu1 cpu2

