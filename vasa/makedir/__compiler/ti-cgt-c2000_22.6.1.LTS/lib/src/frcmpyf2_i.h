/****************************************************************************/
/*  frcmpyf2_i.h                                                            */
/*                                                                          */
/* Copyright (c) 2007 Texas Instruments Incorporated                        */
/* http://www.ti.com/                                                       */
/*                                                                          */
/*  Redistribution and  use in source  and binary forms, with  or without   */
/*  modification,  are permitted provided  that the  following conditions   */
/*  are met:                                                                */
/*                                                                          */
/*     Redistributions  of source  code must  retain the  above copyright   */
/*     notice, this list of conditions and the following disclaimer.        */
/*                                                                          */
/*     Redistributions in binary form  must reproduce the above copyright   */
/*     notice, this  list of conditions  and the following  disclaimer in   */
/*     the  documentation  and/or   other  materials  provided  with  the   */
/*     distribution.                                                        */
/*                                                                          */
/*     Neither the  name of Texas Instruments Incorporated  nor the names   */
/*     of its  contributors may  be used to  endorse or  promote products   */
/*     derived  from   this  software  without   specific  prior  written   */
/*     permission.                                                          */
/*                                                                          */
/*  THIS SOFTWARE  IS PROVIDED BY THE COPYRIGHT  HOLDERS AND CONTRIBUTORS   */
/*  "AS IS"  AND ANY  EXPRESS OR IMPLIED  WARRANTIES, INCLUDING,  BUT NOT   */
/*  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR   */
/*  A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT   */
/*  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,   */
/*  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL  DAMAGES  (INCLUDING, BUT  NOT   */
/*  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,   */
/*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY   */
/*  THEORY OF  LIABILITY, WHETHER IN CONTRACT, STRICT  LIABILITY, OR TORT   */
/*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE   */
/*  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.    */
/*                                                                          */
/****************************************************************************/

/* _CODE_ACCESS unsigned long long __TI_frcmpyf(unsigned long long l,
                                                unsigned long long r) */

/*---------------------------------------------------------------------------*/
/* Fractional MultiPlY                                                       */
/* Forms the product (2*REAL_FRC_BITS bits) of l and r (each a fixed point   */
/* operand in range 1..2-, with radix point at REAL_FRC_BITS).               */
/* Returns in p the uppermost bits as a fixed point number in the range      */
/* 1..2-, with the radix point at REAL_FRC_BITS.                             */
/*---------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------*/
/* See also:								     */
/*                                                                           */
/* Knuth D., "The Art of Computer Programming", Volume 2, ch 4.2	     */
/* ("Floating Point Arithmetic")					     */
/*                                                                           */
/* Goldberg D., "What Every Computer Scientist Should Know About	     */
/* Floating-Point Arithmetic", ACM Computing Surveys, Vol 23, No 1, March    */
/* 1991									     */
/*                                                                           */
/* Goldberg D., "Computer arithmetic."  Appendix A in "Computer		     */
/* Architecture: A Quantitative Approach, Patterson and Hennessy.	     */
/*                                                                           */
/* IEEE-754 "IEEE Standard for Binary Floating-Point Arithmetic"             */
/*---------------------------------------------------------------------------*/

   /*------------------------------------------------------------------------*/
   /* Re-align the inputs, split them into halves,                           */
   /* form all the cross products and add 'em up.                            */
   /*------------------------------------------------------------------------*/

   #define BBITS (BPlonglong/2)
   #define BMSK ((1ull<< BBITS)-1)

   unsigned long long p, sticky;

   /*------------------------------------------------------------------------*/
   /* l and r come into this function as 53-bit float significands	     */
   /* (hidden bit, implied radix point, 52 fractional digits) in Q12.52	     */
   /* format.  (This assumes 64-bit double).				     */
   /*------------------------------------------------------------------------*/
   l <<= 10;
   r <<= 10;

   /*------------------------------------------------------------------------*/
   /* l and r are now in Q2.62 format.  This leaves plenty of room for the   */
   /* result bits in the high 64 bits of the upcoming multiplication.        */
   /*------------------------------------------------------------------------*/

   /*------------------------------------------------------------------------*/
   /* Do a Q2.62 * Q2.62 multiply to get a Q4.60 result.  This looks the     */
   /* same as a 64x64->128 multiplication, keeping the high 64 bits.         */
   /*------------------------------------------------------------------------*/

   {
      unsigned long l0, l1, r0, r1;
      unsigned long long t0, t1;

      l0 = l & BMSK;
      r0 = r & BMSK;
      l1 = l >> BBITS;
      r1 = r >> BBITS;

      t0 = (unsigned long long)l0 * r0;

      p = t0 >> BBITS;

      sticky = t0 << BBITS;

      t0 = (unsigned long long)l1 * r0;
      t1 = (unsigned long long)r1 * l0;

      p += t0;
      p += t1;

      sticky |= t0 << BBITS;
      sticky |= t1 << BBITS;
      sticky |= (p << BBITS);

      p = (unsigned long long)l1 * r1 + (p >> BBITS);

      /*---------------------------------------------------------------------*/
      /* Shift right to finally get Q10.54, which leaves two bits in the LSB */
      /* for rounding.  These two bits are the round bit and the sticky      */
      /* bit.  Rounding happens in MPYF.c                                    */
      /*---------------------------------------------------------------------*/

      sticky |= (p & ((1 << 6)-1));

      return (p >> 6) | (sticky != 0);
   }
