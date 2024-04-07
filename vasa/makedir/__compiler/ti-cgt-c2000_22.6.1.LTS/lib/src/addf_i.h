/****************************************************************************/
/*  addf_i.h                                                                */
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

/* REAL _addf(REAL left, REAL right) */

#if IEEE_Hardware
  return left + right;
#else
#if (BPREAL == BPbigint)
   bigint lft , rgt ; /* int register versions of left,right REAL params   */
   bigint lfrc, rfrc; /* fraction of left/dest operand and right operand   */
   int    lexp, rexp; /* exponent of left/dest operand and right operand   */
   bigint sign;
   int    expdif;

   bigint guard_bit = 0, round_bit = 0, sticky_bit = 0;

   /*------------------------------------------------------------------------*/
   /* Transfer the left,right bits to lft,rgt.                               */
   /* REALasINT may force left and right to memory if dumb compiler.         */
   /* This is OK since they won't be needed again except for unusual cases.  */
   /* lft,rgt will hopefully wind up in integer registers.                   */
   /*------------------------------------------------------------------------*/
   REALasINT(lft,left); 
   REALasINT(rgt,right);

   /*------------------------------------------------------------------------*/
   /* Unpack fraction and exponent, ignoring signs for now.                  */
   /* Reinsert hidden bit or re-normalize fraction as appropriate.           */
   /*------------------------------------------------------------------------*/

   if ((lfrc = lft & ~MINUS) == 0) {        /* signed 0 + 0 rules */
      rfrc = rgt;
      if ((rfrc & ~MINUS) == 0) rfrc &= lft;
      return_INTasREAL(rfrc);
   }
   if ((rfrc = rgt & ~MINUS) == 0) return left;

#ifdef Support_INFNAN
   if (lfrc >= REAL_INFNAN) {       /*  lft == +/- INFINITY or NaN */
      if (lfrc < rfrc) return right;  /* return larger NaN */
      if ((lfrc == REAL_INFNAN) &&
          (lft ^ rgt) == MINUS) { /* INF-INF */
          lft = REAL_NAN;
          return_INTasREAL(lft);
      }
      return left;
   }
   if (rfrc >= REAL_INFNAN) return right;        /* INF or NaN */
#endif

   if (lexp = lfrc >> REAL_FRC_MSBs)
      lfrc = (lfrc & REAL_FRC_MASK) + REAL_HIDDEN_BIT; /*insert hidden bit*/
   else
#ifdef Support_DENORM
      RENORMF(lfrc, lexp);
#else
      return right;
#endif

   if (rexp = rfrc >> REAL_FRC_MSBs)
      rfrc = (rfrc & REAL_FRC_MASK) + REAL_HIDDEN_BIT; /*insert hidden bit*/
   else
#ifdef Support_DENORM
      RENORMF(rfrc, rexp);
#else
      return left;
#endif

   /*---------------------------------------------------------------------*/
   /* This algorithm relies on the fact that the left operand has	  */
   /* equal or large magnitude (exponent only).  Swap if necessary.	  */
   /*---------------------------------------------------------------------*/
   if (rexp > lexp) 
   {
       long temp_frc = lfrc;
       int temp_exp = lexp;
       lfrc = rfrc;
       rfrc = temp_frc;
       lexp = rexp;
       rexp = temp_exp;
       sign = rgt & MINUS;
   }
   else sign = lft & MINUS;

   /*------------------------------------------------------------------------*/
   /* If the signs of the inputs differ, negate the right significand.	     */
   /*------------------------------------------------------------------------*/
   if ((lft ^ rgt) & MINUS) rfrc = -rfrc; 

   /*------------------------------------------------------------------------*/
   /* Shift the rfrc to align radix point and add, keeping track of guard    */
   /* and rounding bits.						     */
   /*------------------------------------------------------------------------*/
   expdif = lexp - rexp;

   /*------------------------------------------------------------------------*/
   /* If the difference in exponent is too great, the addend will have no    */
   /* effect on the result.  We need to consider three bits beyond the edge  */
   /* of precision to account for the guard, round, and sticky bits.  The    */
   /* guard bit is needed in case the addends are of opposite sign and       */
   /* close enough that left-normalization will be needed, in which case     */
   /* the guard bit becomes a value bit.                                     */
   /*------------------------------------------------------------------------*/
   if (expdif < REAL_FRC_BITS+3)
   {
       lfrc += (rfrc >> expdif);

       if (expdif == 0) guard_bit = round_bit = sticky_bit = 0;
       else
       {
	   guard_bit = (rfrc << (BPbigint-expdif)) & MINUS;
	   if (expdif == 1) round_bit = sticky_bit = 0;
	   else
	   {
	       round_bit = (rfrc << (BPbigint-expdif+1)) & MINUS;
	       if (expdif == 2) sticky_bit = 0;
	       else sticky_bit = (rfrc << (BPbigint-expdif+2));
	   }
       }
   }

   /*------------------------------------------------------------------------*/
   /* If the result is negative, negate the significand.  This will only     */
   /* happen if (lexp-rexp==0).						     */
   /*------------------------------------------------------------------------*/
   if (lfrc <= 0 && !guard_bit) 
   {
      if (lfrc == 0) return_INTasREAL(lfrc);
      lfrc = -lfrc; sign ^= MINUS;
   }

   /*------------------------------------------------------------------------*/
   /* Round and normalize the result                                         */
   /*------------------------------------------------------------------------*/
   if (lfrc >= (REAL_HIDDEN_BIT << 1))
   {
       sticky_bit = guard_bit | round_bit | sticky_bit;
       round_bit = lfrc & 0x1;
       lfrc >>= 1;
       lexp++;
   }
   else if (lfrc < REAL_HIDDEN_BIT)
   {
       int count;
 
       for (count = 0; lfrc < REAL_HIDDEN_BIT; count++)
       {
	   lfrc <<= 1;
	   lexp--;
	   if (count == 0) lfrc |= (guard_bit != 0);
	   if (count == 1) round_bit = sticky_bit = 0;
       }
   }
   else 
   {
       sticky_bit = round_bit | sticky_bit;
       round_bit = guard_bit;
   }

   /*------------------------------------------------------------------------*/
   /* Round to even.  If the rounding bits are exactly one-half, round	     */
   /* the final result bit to an even number (this may round down).	     */
   /*------------------------------------------------------------------------*/
   if (round_bit && ((lfrc & 0x1) || sticky_bit)) lfrc += 1;

   /*------------------------------------------------------------------------*/
   /* Re-normalize if necessary                                              */
   /*------------------------------------------------------------------------*/
   if (lfrc >= (REAL_HIDDEN_BIT << 1))
   {
       lfrc >>= 1;
       lexp++;
   }

   /*------------------------------------------------------------------------*/
   /* Check for overflow and underflow                                       */
   /*------------------------------------------------------------------------*/
   if (lexp <= 0) { /* underflow? */
#ifdef Support_DENORM
      /* un-round, denormalize, and re-round the fraction */
      if (lexp > -REAL_FRC_BITS) lfrc = ((lfrc -1) >> (1-lexp)) +1;
      else lfrc = 0;  /* no significant bits remain */
#else
      lfrc = 0;  /* no significant bits remain */
#endif
      lexp = 0;
   }
   else if (lexp >= REAL_EXP_INFNAN) { /* overflow? */
#if defined(Support_INFNAN) || !defined(Support_SATURATION)
      lexp = REAL_EXP_INFNAN; lfrc = 0;
#else
      lexp = REAL_EXP_INFNAN-1; lfrc = (biguns)-1;
#endif
   }

   /*------------------------------------------------------------------------*/
   /* Assemble result and return                                             */
   /*------------------------------------------------------------------------*/
   lfrc = (lfrc & REAL_FRC_MASK) + (((bigint)lexp) << REAL_FRC_MSBs) +sign;

   return_INTasREAL(lfrc);

#elif (BPREAL == (BPbigint*2))
   /*------------------------------------------------------------------------*/
   /* The IEEE format is exactly as big as two int's (or two long's)         */
   /*------------------------------------------------------------------------*/

   long long lft, rgt; /* raw bits of the IEEEE double */
   long long lfrc, rfrc; /* fraction of left/dest operand and right operand  */
   long long sign;

   int    lexp, rexp; /* exponent of left/dest operand and right operand   */
   int    expdif;

   long long guard_bit = 0, round_bit = 0, sticky_bit = 0;

   /*------------------------------------------------------------------------*/
   /* Transfer the left,right bits to lft,rgt.                               */
   /* REALasINT may force left and right to memory if dumb compiler.         */
   /* This is OK since they won't be needed again except for unusual cases.  */
   /* lft,rgt will hopefully wind up in integer registers.                   */
   /*------------------------------------------------------------------------*/
#if defined(__TMS320C6X__)
   lft = _dtoll(left);
   rgt = _dtoll(right);
#else
   lft = __f64_bits_as_u64(left);
   rgt = __f64_bits_as_u64(right);
#endif

   /*------------------------------------------------------------------------*/
   /* Unpack fraction and exponent, ignoring signs for now.                  */
   /* Reinsert hidden bit or re-normalize fraction as appropriate.           */
   /*------------------------------------------------------------------------*/

   if ((lfrc = lft & ~((unsigned long long)MINUS << 32)) == 0) {
      /* signed 0 + 0 rules */
      rfrc = rgt;
      if ((rfrc & ~((unsigned long long)MINUS << 32)) == 0) rfrc &= lft;
#if defined(__TMS320C6X__)
      return _lltod(rfrc);
#else
      return __u64_bits_as_f64(rfrc);
#endif
   }
   if ((rfrc = rgt & ~((unsigned long long)MINUS << 32)) == 0) return left;

#ifdef Support_INFNAN
   if (lfrc >= ((unsigned long long)REAL_INFNAN << 32)) {
      /*  lft == +/- INFINITY or NaN */
      if (lfrc < rfrc) return right;  /* return larger NaN */
      if ((lfrc == ((unsigned long long)REAL_INFNAN << 32)) &&
          (lft ^ rgt) == ((unsigned long long)MINUS << 32)) { /* INF-INF */
          lft = ((unsigned long long)REAL_NAN << 32);
#if defined(__TMS320C6X__)
          return _lltod(lft);
#else
          return __u64_bits_as_f64(lft);
#endif
      }
      return left;
   }

   if (rfrc >= ((unsigned long long)REAL_INFNAN << 32))
      return right; /* INF or NaN */
#endif

   if (lexp = lfrc >> REAL_FRC_BITS)
      lfrc = (lfrc & ((1ull << REAL_FRC_BITS) - 1)) +
          ((unsigned long long)REAL_HIDDEN_BIT << 32); /*insert hidden bit*/
   else
#ifdef Support_DENORM
      RENORMF(lfrc, lexp);
#else
      return right;
#endif

   if (rexp = rfrc >> REAL_FRC_BITS)
      rfrc = (rfrc & ((1ull << REAL_FRC_BITS) - 1)) +
          ((unsigned long long)REAL_HIDDEN_BIT << 32); /*insert hidden bit*/
   else
#ifdef Support_DENORM
      RENORMF(rfrc, rexp);
#else
      return left;
#endif

   /*---------------------------------------------------------------------*/
   /* This algorithm relies on the fact that the left operand has	  */
   /* equal or large magnitude (exponent only).  Swap if necessary.	  */
   /*---------------------------------------------------------------------*/
   if (rexp > lexp)
   {
       unsigned long long temp_frc = lfrc;
       int temp_exp = lexp;
       lfrc = rfrc;
       rfrc = temp_frc;
       lexp = rexp;
       rexp = temp_exp;
       sign = rgt & ((unsigned long long)MINUS << 32);
   }
   else sign = lft & ((unsigned long long)MINUS << 32);

   /*------------------------------------------------------------------------*/
   /* If the signs of the inputs differ, negate the right significand.	     */
   /*------------------------------------------------------------------------*/
   if ((lft ^ rgt) & ((unsigned long long)MINUS << 32)) rfrc = -rfrc; 

   /*------------------------------------------------------------------------*/
   /* Shift the rfrc to align radix point and add, keeping track of guard    */
   /* and rounding bits.						     */
   /*------------------------------------------------------------------------*/
   expdif = lexp - rexp;

   /*------------------------------------------------------------------------*/
   /* If the difference in exponent is too great, the addend will have no    */
   /* effect on the result.  We need to consider three bits beyond the edge  */
   /* of precision to account for the guard, round, and sticky bits.  The    */
   /* guard bit is needed in case the addends are of opposite sign and       */
   /* close enough that left-normalization will be needed, in which case     */
   /* the guard bit becomes a value bit.                                     */
   /*------------------------------------------------------------------------*/
   if (expdif < REAL_FRC_BITS+3)
   {
       lfrc += (rfrc >> expdif);

       if (expdif == 0) guard_bit = round_bit = sticky_bit = 0;
       else
       {
	   guard_bit =
               (rfrc << (BPlonglong-expdif)) &
               ((unsigned long long)MINUS << 32);
	   if (expdif == 1) round_bit = sticky_bit = 0;
	   else
	   {
	       round_bit =
                   (rfrc << (BPlonglong-expdif+1)) &
                   ((unsigned long long)MINUS << 32);
	       if (expdif == 2) sticky_bit = 0;
	       else sticky_bit = (rfrc << (BPlonglong-expdif+2));
	   }
       }
   }

   /*------------------------------------------------------------------------*/
   /* If the result is negative, negate the significand.  This will only     */
   /* happen if (lexp-rexp==0).						     */
   /*------------------------------------------------------------------------*/
   if (lfrc <= 0 && !guard_bit)
   {
      if (lfrc == 0)
      {
#if defined(__TMS320C6X__)
          return _lltod(lfrc);
#else
          return __u64_bits_as_f64(lfrc);
#endif
      }
      lfrc = -lfrc; sign ^= ((unsigned long long)MINUS << 32);
   }

   /*------------------------------------------------------------------------*/
   /* Round and normalize the result                                         */
   /*------------------------------------------------------------------------*/
   if (lfrc >= (((unsigned long long)REAL_HIDDEN_BIT << 32) << 1))
   {
       sticky_bit = guard_bit | round_bit | sticky_bit;
       round_bit = lfrc & 0x1;
       lfrc >>= 1;
       lexp++;
   }
   else if (lfrc < ((unsigned long long)REAL_HIDDEN_BIT << 32))
   {
       int count;
       for (count = 0;
            lfrc < ((unsigned long long)REAL_HIDDEN_BIT << 32);
            count++)
       {
	   lfrc <<= 1;
	   lexp--;
	   if (count == 0) lfrc |= (guard_bit != 0);
	   if (count == 1) round_bit = sticky_bit = 0;
       }
   }
   else
   {
       sticky_bit = round_bit | sticky_bit;
       round_bit = guard_bit;
   }

   /*------------------------------------------------------------------------*/
   /* Round to even.  If the rounding bits are exactly one-half, round	     */
   /* the final result bit to an even number (this may round down).	     */
   /*------------------------------------------------------------------------*/
   if (round_bit && ((lfrc & 0x1) || sticky_bit)) lfrc += 1;

   /*------------------------------------------------------------------------*/
   /* Re-normalize if necessary                                              */
   /*------------------------------------------------------------------------*/
   if (lfrc >= (((unsigned long long)REAL_HIDDEN_BIT << 32) << 1))
   {
       lfrc >>= 1;
       lexp++;
   }

   /*------------------------------------------------------------------------*/
   /* Check for overflow and underflow                                       */
   /*------------------------------------------------------------------------*/
   if (lexp <= 0) { /* underflow? */
#ifdef Support_DENORM
      /* un-round, denormalize, and re-round the fraction */
      if (lexp > -REAL_FRC_BITS) lfrc = ((lfrc -1) >> (1-lexp)) +1;
      else lfrc = 0;  /* no significant bits remain */
#else
      lfrc = 0;  /* no significant bits remain */
#endif
      lexp = 0;
   }
   else if (lexp >= REAL_EXP_INFNAN) { /* overflow? */
#if defined(Support_INFNAN) || !defined(Support_SATURATION)
      lexp = REAL_EXP_INFNAN; lfrc = 0;
#else
      lexp = REAL_EXP_INFNAN-1; lfrc = (biguns)-1;
#endif
   }

   /*------------------------------------------------------------------------*/
   /* Assemble result and return                                             */
   /*------------------------------------------------------------------------*/
   lfrc = (lfrc & ((1ull << REAL_FRC_BITS) - 1)) +
       (((unsigned long long)lexp) << REAL_FRC_BITS) + sign;

#if defined(__TMS320C6X__)
    return _lltod(lfrc);
#else
    return __u64_bits_as_f64(lfrc);
#endif

#else
    #error "ADDF not yet implemented for this size REAL"
#endif
#endif
