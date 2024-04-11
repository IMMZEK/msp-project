/******************************************************************************/
/* LNK.CMD - COMMAND FILE FOR LINKING C PROGRAMS			      */
/*									      */
/*	Usage:	cl2000 -z <obj files...> -o <out file> -m <map file> lnk.cmd  */
/*		cl2000 <src files...> -z -o <out file> -m <map file> lnk.cmd  */
/*									      */
/*	Description: This file is a sample command file that can be used      */
/*		     for linking programs built with the C Compiler.	      */
/*		     Use it as a guideline; you	 may want to change the	      */
/*		     allocation scheme according to the size of your program  */
/*		     and the memory layout of your target system.	      */
/*									      */
/******************************************************************************/

-c		      /* Use C linking conventions: auto-init vars at runtime */

-stack	  0x8000      /* Stack size   */
-heap	  0x8000      /* Heap size    */
--args	  0x100

/*

   This linker command file is for large model only!

   This linker command file is a tradeoff between simplicity and
   documentation.  This file is somewhat modeled after Delfino
   dual-core, but it is greatly simplified to ignore sections the
   compiler does not deal with.  There are a lot of special memory
   locations, particularly in low memory, so don't try to add memory
   in arbitrary locations if you want to run this on the simulator!

   CLA:

   - Delfino has CLA, but this file does not support CLA!  To get CLA
     programs to run, you need to define a lot more sections for
     special registers.

   M0M1MAP: status bit, 1 at RESET

   - There are two memory blocks at the start of memory, M0 and M1.
     Depending on the value of the M0M1MAP bit, these blocks are
     swwapped on the program page.  Since this file does not use
     pages, we can pretty much just ignore that bit.  If you want to
     write a test case that uses pages, try to avoid M0 and M1!

   - Each core has its own copy of M0_RAM and M1_RAM.  We don't care
     because we are assuming a single program on CPU1.  Anything
     fancier than that will require a different linker command file.

   VMAP: status bit, 1 at RESET (required)

   - If 0, the top 64 words are interrupt vectors; we prefer the
     default, as low memory is scarce.

   Address 0:

   - For safety, never allow data or program to be placed at address
     zero, which resembles NULL.

   64k stack boundary:

   - .stack may not span higher than 0x10000 because the SP register
     is only 16 bits.  This means that the stack can be at most
     0x8000, because that's the largest continuous RAM range in low
     memory.

   Other special memory locations (don't touch!):

   - PIE vectors from 0xD00 - 0xEFF
   - various MMRs from 0xF00 - 0xFFF

*/

MEMORY
{
	M0M1       : origin = 0x000002, length = 0x0007FE
	RAM1       : origin = 0x008000, length = 0x008000
	EXT        : origin = 0x100000, length = 0x2E0000
	VECTORS (R): origin = 0x3FFFC0, length = 0x000040
}

SECTIONS {

	 /* Traditionally, initialized sections (except .const) go into
	    PROG (page 0); all other sections go into DATA (page 1) */

	 /* Initialized sections (assuming EABI) */

	.text	       : >> EXT
	.binit	       : >  EXT
	.cinit	       : >  EXT
	.pinit	       : >  EXT
	.init_array    : >  EXT
	.const	       : >> EXT
	.econst	       : >> EXT
	.switch	       : >> EXT
	.c28xabi.exidx : >  EXT
	.c28xabi.extab : >> EXT
	.cleanup       : >> EXT
	vectors	       : >  VECTORS

	/* Uninitialized sections (assuming EABI) */

	.stack	       : >  M0M1 | RAM1
	.cio	       : >  M0M1 | RAM1 | EXT
	.args	       : >  M0M1 | RAM1 | EXT
	.sysmem	       : >  M0M1 | RAM1 | EXT
	.esysmem       : >  M0M1 | RAM1 | EXT
	.bss	       : >> M0M1 | RAM1 | EXT
	.ebss	       : >> M0M1 | RAM1 | EXT
	.data	       : >> M0M1 | RAM1 | EXT
	.ppdata	       : >  M0M1 | RAM1 | EXT
	.ppinfo	       : >  M0M1 | RAM1 | EXT
	.TI.persistent : >> M0M1 | RAM1 | EXT
	.TI.noinit     : >> M0M1 | RAM1 | EXT

	/* Other */

	.TI.ramfunc    : load=EXT, run=M0M1|RAM1|EXT, table(BINIT)
}
