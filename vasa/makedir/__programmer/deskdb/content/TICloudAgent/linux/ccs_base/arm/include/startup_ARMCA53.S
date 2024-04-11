@******************************************************************************
@
@ startup_ARMCA53.S - Init code routine for Cortex A53 cores and Linaro baremetal
@
@******************************************************************************
@
@ Copyright (C) 2018 Texas Instruments Incorporated - http://www.ti.com/
@  (Rafael de Souza - 2018) initial Cortex A53 version
@
@
@  Redistribution and use in source and binary forms, with or without
@  modification, are permitted provided that the following conditions
@  are met:
@
@    Redistributions of source code must retain the above copyright
@    notice, this list of conditions and the following disclaimer.
@
@    Redistributions in binary form must reproduce the above copyright
@    notice, this list of conditions and the following disclaimer in the
@    documentation and/or other materials provided with the
@    distribution.
@
@    Neither the name of Texas Instruments Incorporated nor the names of
@    its contributors may be used to endorse or promote products derived
@    from this software without specific prior written permission.
@
@  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
@  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
@  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
@  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
@  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
@  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
@  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
@  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
@  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
@  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
@  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
@
@******************************************************************************

		.error "\n************************************\nAt the moment the file startup_ARMCA53.S is not functional.\nPlease use an example code from processor SDK.\n************************************"
@@****************************** Global Symbols*******************************
@
@        .global Entry
@        .global __stack
@        .global __bss_start__
@        .global __bss_end__
@        .global main
@
@        .balign 4
@@**************************** Code Section ***********************************
@        .text
@
@@
@@ This code is assembled for ARM instructions
@@
@        .code 32
@
@@******************************************************************************
@Entry:
@@Invalidate L1 I$
@    ic      IALLU
@    isb
@
@@Enable SMP
@    mrs     x0, S3_1_c15_c2_1
@    orr     x0, x0, #(1 << 6)
@    msr     S3_1_c15_c2_1, x0
@    isb
@
@@Enable D$
@    mrs x0, SCTLR_EL3
@    orr w0, w0,  #(1 << 2)
@    msr SCTLR_EL3, x0
@    isb
@
@@Setup C stack
@    ldr x0, =__StackTop
@    mov sp, x0
@    mov     x29, #0
@    stp     x29, x29, [sp, #-16]!
@    mov     x29, sp
@
@@
@@ Enter the main function.
@@ The symbol _start is the entry point for the runtime support library
@@
@
@@Call C main
@    bl main
@
@
@@Loader_exit() for CCS
@C$$EXIT:
@    nop
@Epilogue:
@    b       Epilogue
@
@    .end
@
@
