/****************************************************************************/
/*  66AK2Gxx_C66.cmd                                                        */
/*  Copyright (c) 2016  Texas Instruments Incorporated                      */
/*  Author: Rafael de Souza                                                 */
/*                                                                          */
/*    Description: This file is a sample linker command file that can be    */
/*                 used for linking programs built with the C compiler and  */
/*                 running the resulting .out file on the C66x DSP core of  */
/*                 a 66AK2Gxx device.                                       */
/*                 Use it as a guideline.  You will want to                 */
/*                 change the memory layout to match your specific          */
/*                 target system.  You may want to change the allocation    */
/*                 scheme according to the size of your program.            */
/*                                                                          */
/****************************************************************************/

MEMORY
{

    L2_SRAM_0 :  o = 0x00800000 l = 0x00080000   /* 512kB internal SRAM */
    L2_SRAM_1 :  o = 0x00880000 l = 0x00080000   /* 512kB internal SRAM */
    MSMC_SRAM :  o = 0x0C000000 l = 0x00100000   /* 1MB MSMC Shared SRAM */
    DDR0      :  o = 0x80000000 l = 0x80000000   /* 2GB external DDR0 */

}

SECTIONS
{
    .text          >  L2_SRAM_0
    .stack         >  L2_SRAM_0
    .bss           >  L2_SRAM_0
    .cio           >  L2_SRAM_0
    .const         >  L2_SRAM_0
    .data          >  L2_SRAM_0
    .switch        >  L2_SRAM_0
    .sysmem        >  L2_SRAM_0
    .far           >  L2_SRAM_0
    .args          >  L2_SRAM_0
    .ppinfo        >  L2_SRAM_0
    .ppdata        >  L2_SRAM_0
  
    /* COFF sections */
    .pinit         >  L2_SRAM_0
    .cinit         >  L2_SRAM_0
  
    /* EABI sections */
    .binit         >  L2_SRAM_0
    .init_array    >  L2_SRAM_0
    .neardata      >  L2_SRAM_0
    .fardata       >  L2_SRAM_0
    .rodata        >  L2_SRAM_0
    .c6xabi.exidx  >  L2_SRAM_0
    .c6xabi.extab  >  L2_SRAM_0
}


