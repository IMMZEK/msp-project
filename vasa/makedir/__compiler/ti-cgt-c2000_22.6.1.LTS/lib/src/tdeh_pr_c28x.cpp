/*****************************************************************************/
/*  tdeh_pr_c28x.cpp                                                         */
/*                                                                           */
/* Copyright (c) 2016 Texas Instruments Incorporated                         */
/* http://www.ti.com/                                                        */
/*                                                                           */
/*  Redistribution and  use in source  and binary forms, with  or without    */
/*  modification,  are permitted provided  that the  following conditions    */
/*  are met:                                                                 */
/*                                                                           */
/*     Redistributions  of source  code must  retain the  above copyright    */
/*     notice, this list of conditions and the following disclaimer.         */
/*                                                                           */
/*     Redistributions in binary form  must reproduce the above copyright    */
/*     notice, this  list of conditions  and the following  disclaimer in    */
/*     the  documentation  and/or   other  materials  provided  with  the    */
/*     distribution.                                                         */
/*                                                                           */
/*     Neither the  name of Texas Instruments Incorporated  nor the names    */
/*     of its  contributors may  be used to  endorse or  promote products    */
/*     derived  from   this  software  without   specific  prior  written    */
/*     permission.                                                           */
/*                                                                           */
/*  THIS SOFTWARE  IS PROVIDED BY THE COPYRIGHT  HOLDERS AND CONTRIBUTORS    */
/*  "AS IS"  AND ANY  EXPRESS OR IMPLIED  WARRANTIES, INCLUDING,  BUT NOT    */
/*  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR    */
/*  A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT    */
/*  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,    */
/*  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL  DAMAGES  (INCLUDING, BUT  NOT    */
/*  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,    */
/*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY    */
/*  THEORY OF  LIABILITY, WHETHER IN CONTRACT, STRICT  LIABILITY, OR TORT    */
/*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE    */
/*  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.     */
/*                                                                           */
/*                                                                           */
/*  Contains the target-dependent routines of the Personality Routine (PR)   */
/*  implementation (PR entry points pr0 - pr4, unwind processing)            */
/*  required by Table-Driven Exception Handling                              */
/*                                                                           */
/*****************************************************************************/
#if __EXCEPTIONS && defined(__TI_TABLE_DRIVEN_EXCEPTIONS)

#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include "tdeh_common.h"
#include "tdeh_c28x.h"

#if defined(DEBUG_CPPABI)
#define __STDC_FORMAT_MACROS
#include <inttypes.h>
#include <stdio.h>
#endif

extern "C" {

/*****************************************************************************/
/* EXTERNS - C++ EH Compiler Helper Functions                                */
/*****************************************************************************/
void __cxa_call_unexpected(_Unwind_Exception *);

/*****************************************************************************/
/* EXTERNS - ASM Routine to copy register buffer regs into machine regs      */
/*****************************************************************************/
void  __TI_Install_CoreRegs(void *core_regs);

_Unwind_Reason_Code __TI_Unwind_RaiseException(_Unwind_Exception *uexcep, 
                                               _Unwind_Context  *ph2_context);

_Unwind_Reason_Code __TI_Unwind_RaiseException2(_Unwind_Exception *uexcep, 
                                                _Unwind_Context  *ph1_context,
                                                _Unwind_Context  *ph2_context);

#include <string.h>

}


/*****************************************************************************/
/* Functions used to access the Register Buffer                              */
/*****************************************************************************/
typedef enum { _URB_Failure=0, _URB_Success } _URB_Status;
static _URB_Status regb_core_get(_Unwind_Context *, _Unwind_Reg_Id, _UINT32 *);
static _URB_Status regb_core_set(_Unwind_Context *, _Unwind_Reg_Id, _UINT32);

/*****************************************************************************/
/* Unwind Instr Handle  - Used to keep track of unwind instructions when a   */
/*                        frame is unwound. The function next_uw_byte uses   */
/*                        this struct to return the next unwind instr byte   */
/*****************************************************************************/
typedef struct
{
    _UINT32 *curr_pos;
    _UINT32  curr_word;

    _UINT32  words_remaining;
    _UINT32  bytes_remaining;
} _Unwind_Instr_Handle;

       static _UINT8  next_uw_byte(_Unwind_Instr_Handle *);
INLINE static _UINT32 read_uleb128(_Unwind_Instr_Handle *);


/*****************************************************************************/
/* Personality Routine  - main entry                                         */
/*****************************************************************************/
static _Unwind_Reason_Code __TI_unwind_cpp_pr(_Unwind_Phase      phase,
					      _Unwind_Exception *uexcep,
					      _Unwind_Context   *context,
					      _Unwind_PR_Kind    pr_kind);


extern bool __TI_process_descriptors(_Unwind_Phase        phase,
				_Unwind_Exception   *uexcep,
				_Unwind_Context     *context,
				_Unwind_PR_Kind      pr_kind,
				_UINT32             *descr_ptr,
				_Unwind_Reason_Code *reason,
				bool                *ph2_call_unexpected);


INLINE static _Unwind_Reason_Code process_unwind(_Unwind_Context *context, 
						 _Unwind_PR_Kind pr_kind, 
						 _UINT32 *estart_addr);


/*****************************************************************************/
/*                                                                           */
/* __c28xabi_unwind_cpp_pr0 - PR handling short frame unwinding, 16-bit scope*/
/*                                                                           */
/*****************************************************************************/
_Unwind_Reason_Code __c28xabi_unwind_cpp_pr0 (_Unwind_Phase      phase,
                                              _Unwind_Exception *uexcep, 
                                              _Unwind_Context   *context)
{
    return __TI_unwind_cpp_pr(phase, uexcep, context, _UPK_Su16);
}


/*****************************************************************************/
/*                                                                           */
/* __c28xabi_unwind_cpp_pr1 - PR handling long frame unwinding, 16-bit scope */
/*                                                                           */
/*****************************************************************************/
_Unwind_Reason_Code __c28xabi_unwind_cpp_pr1 (_Unwind_Phase      phase,
                                              _Unwind_Exception *uexcep, 
                                              _Unwind_Context   *context)
{
    return __TI_unwind_cpp_pr(phase, uexcep, context, _UPK_Lu16);
}


/*****************************************************************************/
/*                                                                           */
/* __c28xabi_unwind_cpp_pr2 - PR handling long frame unwinding, 32-bit scope */
/*                                                                           */
/*****************************************************************************/
_Unwind_Reason_Code __c28xabi_unwind_cpp_pr2 (_Unwind_Phase      phase,
                                              _Unwind_Exception *uexcep, 
                                              _Unwind_Context   *context)
{
    return __TI_unwind_cpp_pr(phase, uexcep, context, _UPK_Lu32);
}


/*****************************************************************************/
/*                                                                           */
/* __TI_unwind_cpp_pr - Implements pr0 - pr2.                                */
/*                      The personality routine for a frame is used by the   */
/*                      language-independent unwinder to:                    */
/*                      (1) Detect whether a barrier to exception propagation*/
/*                          exists in a given frame - Phase 1                */
/*                      (2) Set up internal state to perform the actual      */
/*                          unwinding i.e set up registers to invoke         */
/*                          cleanup/catch handlers for the frame, remove the */
/*                          frame from the stack using unwind instructions - */
/*                          Phase 2                                          */
/*                                                                           */
/*****************************************************************************/
static _Unwind_Reason_Code __TI_unwind_cpp_pr(_Unwind_Phase      phase,
					      _Unwind_Exception *uexcep,
					      _Unwind_Context   *context,
					      _Unwind_PR_Kind    pr_kind)
{
    _UINT32 *estart_addr;
    _UINT32 *descr_ptr;

    bool ph2_call_unexpected = false;

    /*-----------------------------------------------------------------------*/
    /* If the phase or pr_kind is not supported, return failure              */
    /*-----------------------------------------------------------------------*/
    if (phase != _UP_Phase1 && phase != _UP_Phase2_Start && 
	phase != _UP_Phase2_Resume)
	return _URC_FAILURE;
    if (pr_kind != _UPK_Su16 && pr_kind != _UPK_Lu16 && pr_kind != _UPK_Lu32)
	return _URC_FAILURE;

    estart_addr = uexcep->pr_data.eht_start;

    #ifdef DEBUG_PR
    printf("PR: U %p, C %p, uw exception object\n", uexcep, context);
    printf("PR: Kind %d, Phase %d, Fn Start %"PRIx32", EHT Start %p\n", 
	    pr_kind, phase, uexcep->pr_data.func_start, estart_addr);
    #endif /* DEBUG_PR */

    /*-----------------------------------------------------------------------*/
    /* Process descriptors if the EHT is not an inline EHT - inline EHTs do  */
    /* not have descriptors, only unwind instructions. Bit 0 of the          */
    /* additional field in pr_data is set to 1 if the EHT is inline          */
    /*-----------------------------------------------------------------------*/
    if ((uexcep->pr_data.additional & 1) != 1)
    {
        #ifdef DEBUG_PR
	printf("PR: Looking for process descriptors\n");
        #endif /* DEBUG_PR */

	/*-------------------------------------------------------------------*/
	/* Compute address to start processing descriptors from, this depends*/
	/* on the phase: Phase1, Phase2 start, compute from start of EHT     */
	/* Phase2 resume, restore saved value                                */
	/*-------------------------------------------------------------------*/
	if (phase == _UP_Phase1 || phase == _UP_Phase2_Start)
	{
	    _UINT8 additional_words = 0;

	    /*---------------------------------------------------------------*/
	    /* If long unwind format, compute additional words to skip over  */
	    /*---------------------------------------------------------------*/
	    if (pr_kind == _UPK_Lu16 || pr_kind == _UPK_Lu32)
		additional_words = (*estart_addr & 0x00ff0000) >> 16;

            #ifdef DEBUG_PR
	    printf("PR: Unwinding uses %d addl words\n", additional_words);
            #endif /* DEBUG_PR */

	    descr_ptr = estart_addr + 1 + additional_words;
	}
	else
            #pragma diag_suppress 1107
	    descr_ptr = (_UINT32*)(uintptr_t)uexcep->cleanup_data.cleanup_ehtp;
            #pragma diag_default 1107

	_Unwind_Reason_Code reason;
	if (__TI_process_descriptors(phase, uexcep, context, pr_kind, 
                                     descr_ptr, &reason, 
                                     &ph2_call_unexpected))
	{
            #ifdef DEBUG_PR
            printf("PR: __TI_unwind_cpp_pr returning because"
                   " a descriptor was found\n");
            #endif /* DEBUG_PR */

	    return reason;
	}
    }

    /*-----------------------------------------------------------------------*/
    /* Process unwind instructions                                           */
    /*-----------------------------------------------------------------------*/
    if (process_unwind(context, pr_kind, estart_addr) == _URC_FAILURE)
    {
	#ifdef DEBUG_PR
	printf("PR: __TI_unwind_cpp_pr returning because"
               " process_unwind returned _URC_FAILURE\n"); 
	#endif /* DEBUG_PR */
        
	return _URC_FAILURE;
    }

    /*-----------------------------------------------------------------------*/
    /* If fespec forms a propagation barrier, and __cxa_call_unexpected has  */
    /* to be called, perform setup required                                  */
    /*-----------------------------------------------------------------------*/
    if (ph2_call_unexpected)
    {
	#ifdef DEBUG_PR
	printf("PR: Phase 2 FEspec barrier, calling __cxa_call_unexpected\n"); 
	#endif /* DEBUG_PR */

        /*-------------------------------------------------------------------*/
        /* Copy this PC value into RETA to set up the return address for the */
        /* call to __cxa_call_unexpected. From Section 8.5.3, any permitted  */
        /* throw out of unexpected() must behave as if unwinding resumes at  */
        /* the call site to the func whose exception spec was violated.      */
        /*-------------------------------------------------------------------*/
        _UINT32 pc;
        regb_core_get(context, _UR_PC, &pc);
        regb_core_set(context, _UR_RETA, pc);

	/*-------------------------------------------------------------------*/
	/* Set A4, PC to call __cxa_call_unexpected                          */
	/*-------------------------------------------------------------------*/
	regb_core_set(context, _UR_PC, (_UINT32)&__cxa_call_unexpected);
	regb_core_set(context, _UR_ARG1, (_UINT32)uexcep);

	return _URC_INSTALL_CONTEXT;
    }

    /*-----------------------------------------------------------------------*/
    /* If we get here, ask the unwinder to process the next frame            */
    /*-----------------------------------------------------------------------*/
    return _URC_CONTINUE_UNWIND;
}

/*****************************************************************************/
/*                                                                           */
/* setup_uh - Set up unwinder instruction handle based on PR kind.           */
/*                                                                           */
/*****************************************************************************/
INLINE static void setup_uh(_Unwind_PR_Kind pr_kind, _UINT32 *estart_addr,
                            _Unwind_Instr_Handle *uh)
{
    /*-----------------------------------------------------------------------*/
    /* For Lu16 and Lu32, bits 16-23 contain a count of the number of        */
    /* additional 4-byte words                                               */
    /*-----------------------------------------------------------------------*/
    uh->curr_pos = estart_addr;

    _UINT32 tmp = *estart_addr;

    if (pr_kind == _UPK_Su16)
    {
	uh->words_remaining = 0;
	uh->bytes_remaining = 3;
	uh->curr_word       = tmp << 8;
    }
    else
    {
	uh->words_remaining = (tmp & 0x00ff0000) >> 16;
	uh->bytes_remaining = 2;
	uh->curr_word       = tmp << 16;
    }
}

/*---------------------------------------------------------------------------*/
/* Printable names of the registers.                                         */
/*---------------------------------------------------------------------------*/
#ifdef DEBUG_UW_INSTRS
static const char *name_from_id_data[] = 
{ 
    "XAR1", "XAR2", "XAR3",
    "R4", "R5", "R6", "R7"
};

#define name_from_id(id) name_from_id_data[id]
#endif /* DEBUG_UW_INSTRS */

typedef void (*function_pointer)(void);

/*****************************************************************************/
/*                                                                           */
/* FPU32/FPU64 registers are no longer modeled as 16bit regpairs/regquads.   */
/* A single-register implementation uses one register file for both 32bit    */
/* and 64bit registers including Ra, RaH, and RaL. So there is only one SOE  */
/* entry for a given Ra/RaH/RaL register.                                    */
/*                                                                           */
/*****************************************************************************/
enum soe_save_order {
    SOE_XAR1,
    SOE_XAR2,
    SOE_XAR3,
    SOE_R4,
    SOE_R5,
    SOE_R6,
    SOE_R7,
    SOE_LAST = SOE_R7
};

/*****************************************************************************/
/*                                                                           */
/* process_unwind - decode and simulate frame unwinding instructions.        */
/*                                                                           */
/*****************************************************************************/
INLINE static _Unwind_Reason_Code process_unwind(_Unwind_Context *context, 
						 _Unwind_PR_Kind  pr_kind, 
						 _UINT32         *estart_addr)
{
    #ifdef DEBUG_UW_INSTRS
    printf("PUW: Entering process_unwind\n");
    #endif /* DEBUG_UW_INSTRS */

    _Unwind_Instr_Handle uh;

    setup_uh(pr_kind, estart_addr, &uh);

    _Unwind_Register_Buffer *reg_buf = (_Unwind_Register_Buffer *)context; 

    /*-----------------------------------------------------------------------*/
    /* Process unwind instructions                                           */
    /*-----------------------------------------------------------------------*/
    while (1)
    {
	_UINT8 uw_byte = next_uw_byte(&uh);

        #ifdef DEBUG_UW_INSTRS
        __TI_dump_regbuf_context(context);
        printf("PUW: byte code %02x\n", uw_byte);
        #endif /* DEBUG_UW_INSTRS */
        
        /*-------------------------------------------------------------------*/
        /* 0000 0xxx           POP bitmask (XAR1-XAR3) + RET                 */
        /* 0000 1000 0xxx xxxx POP bitmask (XAR1-XAR3, R4-R7) + RET          */
        /*                                   FPU32 Ra represents RaH only    */
        /*                                   FPU64 Ra represents RaH and RaL */
        /*-------------------------------------------------------------------*/
	if ((uw_byte & 0xf0) == 0x00)
        {
            #pragma diag_suppress 1107
            _SAVED_REG_T *vsp = (_SAVED_REG_T *)reg_buf->core[_UR_SP];
            #pragma diag_default 1107

            /*---------------------------------------------------------------*/
            /* 0000 1000 0xxx xxxx POP bitmask (XAR1-XAR3, R4-R7) + RET      */
            /*---------------------------------------------------------------*/
            unsigned char mask = uw_byte;
            if ((uw_byte & 0x08) == 0x08)
            {
	        _UINT8 uw_next_byte = next_uw_byte(&uh);
                mask = ((uw_byte & 0x7) << 8 | uw_next_byte);
            }
            /*---------------------------------------------------------------*/
            /* 0000 0xxx           POP bitmask (XAR1-XAR3) + RET             */
            /*---------------------------------------------------------------*/
            else
            {
                mask = uw_byte;
            }


            /*---------------------------------------------------------------*/
            /* UR_offset maps soe_save_order enum in to _Unwind_Reg_Id enum  */
            /*           for reg_buf->core[id+UR_offset-fpu_part]            */
            /*                                                               */
            /*                           id   +UR_offset-fpu_part  UR_offset */
            /*      XARn   _UR_XARn = SOE_XARn+UR_offset-fpu_part    3       */
            /* FPU32 RnH   _UR_RnH  = SOE_Rn  +UR_offset-fpu_part    4       */
            /* FPU64 RnH/L _UR_RnH/L= SOE_Rn  +UR_offset-fpu_part    8,7,6,5 */
            /*                                       fpu_part=1 only for RnL */
            /*---------------------------------------------------------------*/
            int UR_offset = 4;
            #ifdef __TMS320C28XX_FPU64__
            UR_offset += 4;
            #endif

            for (int id = SOE_LAST; id >= SOE_XAR1; id--)
            {
                int is_fpu = id>=SOE_R4;
                if (id == SOE_XAR3) UR_offset -= 1; /* Skip XAR4 */

                if (mask & (1u << id))
                { 
                   for (int fpu_part = 0; fpu_part < 1+is_fpu; fpu_part++)
                   {
                      #ifndef __TMS320C28XX_FPU64__
                      if (fpu_part) continue;    /* Only FPU64 has RaL regs */
                      #endif

                      #ifdef DEBUG_UW_INSTRS
                      printf("PUW: POP: %s%s = *--SP = %#" _SAVED_REG_FMT "; "
                             "SP = %p\n", name_from_id(id), 
                             is_fpu ? fpu_part ? "L" : "H" : "",
                             *(vsp-1), vsp-1);
                      #endif /* DEBUG_UW_INSTRS */

                      reg_buf->core[id + UR_offset - fpu_part] = *--vsp;
                   }
                }

                #ifdef __TMS320C28XX_FPU64__
                if (is_fpu) UR_offset -= 1;  /* One SOE entry per RaL/RaH */
                #endif
            }

            reg_buf->core[_UR_SP] = (_SAVED_REG_T)vsp;
		
            /*---------------------------------------------------------------*/
            /* Now return                                                    */
            /*---------------------------------------------------------------*/
            #pragma diag_suppress 1107
            function_pointer *vsp2 = (function_pointer *)reg_buf->core[_UR_SP];
            #pragma diag_default 1107

            reg_buf->core[_UR_PC]   = reg_buf->core[_UR_RETA];
            reg_buf->core[_UR_RETA] = (_SAVED_REG_T)*--vsp2;
            reg_buf->core[_UR_SP]   = (_SAVED_REG_T)vsp2;
		
            #ifdef DEBUG_UW_INSTRS
            printf("PUW: RET [PC = %#"PRIxMAX", "
                   "RETA = %#"PRIxMAX", SP = %p]\n", 
                   (uintmax_t)reg_buf->core[_UR_PC],
                   (uintmax_t)reg_buf->core[_UR_RETA], vsp2);
            #endif /* DEBUG_UW_INSTRS */

            break;
        }

        /*-------------------------------------------------------------------*/
        /* 1xxx xxxx -> SP -= (xxxxxxx << 1) + 2                    [2, 256] */
        /*-------------------------------------------------------------------*/
        else if ((uw_byte & 0x80) == 0x80)
        {
            _UINT32 sp_inc_bits = uw_byte & 0x7f;
            _UINT32 addend = (sp_inc_bits << 1) + 2;

            reg_buf->core[_UR_SP] -= addend;

	    #ifdef DEBUG_UW_INSTRS
	    printf("PUW: SP -= (%"PRIu32" << 1) + 2, [%#"_SAVED_REG_FMT"]\n",
                   sp_inc_bits, reg_buf->core[_UR_SP]);
	    #endif /* DEBUG_UW_INSTRS */

	    continue;
        }

        /*-------------------------------------------------------------------*/
        /* 0001 0001 xxxx ... -> SP -= (ULEB128 << 1) + 512        [514-max] */
        /*-------------------------------------------------------------------*/
        else if (uw_byte == 0x11)
        {
	    _UINT32 sp_inc_bits = read_uleb128(&uh);
            _UINT32 addend = (sp_inc_bits << 1) + 512;

            reg_buf->core[_UR_SP] += addend;

	    #ifdef DEBUG_UW_INSTRS
	    printf("PUW: SP -= (%" PRIu32 " << 1) + 512, [%#"_SAVED_REG_FMT"]\n", 
		   sp_inc_bits, reg_buf->core[_UR_SP]);
	    #endif /* DEBUG_UW_INSTRS */
        }

        /*-------------------------------------------------------------------*/
        /* 0001 0000 CANTUNWIND                                              */
        /*-------------------------------------------------------------------*/
        else if (uw_byte == 0x10)
        {
            #ifdef DEBUG_UW_INSTRS
            printf("PUW: CANTUNWIND\n");
            #endif /* DEBUG_UW_INSTRS */

            return _URC_FAILURE;
        }

	/*-------------------------------------------------------------------*/
	/* If we get here, the instruction is spare/invalid                  */
	/*-------------------------------------------------------------------*/
	else
	{
	    #ifdef DEBUG_UW_INSTRS
	    printf("PUW: Instr not supported [%#x]\n", uw_byte);
	    #endif /* DEBUG_UW_INSTRS */
	    return _URC_FAILURE;
	}
    }

    #ifdef DEBUG_UW_INSTRS
    __TI_dump_regbuf_context(context);
    printf("PUW: Leaving process_unwind\n");
    #endif /* DEBUG_UW_INSTRS */

    return _URC_CONTINUE_UNWIND;
}


/*****************************************************************************/
/*                                                                           */
/* next_uw_byte - Returns the next unwind instruction, returns FINISH (0x00) */
/*                if there are 0 instructions remaining,                     */
/*                                                                           */
/*****************************************************************************/
static _UINT8 next_uw_byte(_Unwind_Instr_Handle *uwh)
{
    _UINT8 uw_byte;

    if (uwh->bytes_remaining == 0)
    {
	if (uwh->words_remaining == 0)
	    return UWINS_FINISH;
	else
	{
	    uwh->curr_word = *(++uwh->curr_pos);
	    uwh->words_remaining--;
	    uwh->bytes_remaining = 4;
	}
    }

    uw_byte = (uwh->curr_word & 0xff000000) >> 24;
    uwh->curr_word <<= 8;
    uwh->bytes_remaining--;

    return uw_byte;
}


/*****************************************************************************/
/*                                                                           */
/* read_uleb128 - Read a ULEB128 encoded offset stored in the unwind area    */
/*                                                                           */
/*****************************************************************************/
INLINE static _UINT32 read_uleb128(_Unwind_Instr_Handle *uh)
{
    _UINT8  uw_byte;
    _UINT32 val       = 0;
    _UINT8  shift_amt = 0;

    while (1)
    {
	uw_byte = next_uw_byte(uh);
	val |= (uw_byte & 0x7f) << shift_amt;
	/*-------------------------------------------------------------------*/
	/* The last group does not have MSB set to 1                         */
	/*-------------------------------------------------------------------*/
	if ((uw_byte & 0x80) == 0) break;
	shift_amt += 7;
    }
    return val;
}


/*****************************************************************************/
/*                                                                           */
/* regb_core_get - Returns value stored in register "index" in val           */
/*                                                                           */
/*****************************************************************************/
static _URB_Status regb_core_get(_Unwind_Context *context, 
			         _Unwind_Reg_Id   index, 
				 _UINT32          *val)
{
    _Unwind_Register_Buffer *reg_buf = (_Unwind_Register_Buffer *)context;

    if (index > _UR_REG_LAST) return _URB_Failure;

    *val = reg_buf->core[index];

    return _URB_Success;
}

/*****************************************************************************/
/*                                                                           */
/* regb_core_set - Update value stored in register "index" using val         */
/*                                                                           */
/*****************************************************************************/
static _URB_Status regb_core_set(_Unwind_Context *context, 
				 _Unwind_Reg_Id   index, 
				 _UINT32           val)
{
    _Unwind_Register_Buffer *reg_buf = (_Unwind_Register_Buffer *)context;

    if (index > _UR_REG_LAST) return _URB_Failure;

    reg_buf->core[index] = val;

    return _URB_Success;
}

/*****************************************************************************/
/*                                                                           */
/* __TI_targ_set_pr - Compute PR address from the EHT, update UE             */
/*                                                                           */
/*****************************************************************************/
bool __TI_targ_set_pr(_Unwind_Exception *uexcep)
{
    if (uexcep->pr_data.eht_start == (void *)0) return false;

    /*-----------------------------------------------------------------------*/
    /* The first word of the EHT encodes PR variant used to process eht      */
    /*-----------------------------------------------------------------------*/
    _UINT32 eht_first_word = *(uexcep->pr_data.eht_start);

    #ifdef DEBUG_UNWINDER
    printf("UW: ue %p\n", uexcep);
    fflush(stdout);
    #endif /* DEBUG_UNWINDER */

    #ifdef DEBUG_UNWINDER
    printf("UW: EHT @ %p First Word %"PRIx32", PR %d\n", 
           uexcep->pr_data.eht_start,
	    eht_first_word, (int)((eht_first_word & 0x0f000000) >> 24));
    fflush(stdout);
    #endif /* DEBUG_UNWINDER */

    /*-----------------------------------------------------------------------*/
    /* If MSB==1, Bits 27-24 contain index of PR used                        */
    /*-----------------------------------------------------------------------*/
    if ((eht_first_word & 0x80000000) != 0)
    {
        #ifdef DEBUG_UNWINDER
        printf("UW: (Compact) EHT First Word %"PRIx32", PR %d\n", 
               eht_first_word, (int)((eht_first_word & 0x0f000000) >> 24));
        #endif /* DEBUG_UNWINDER */

	switch ((eht_first_word & 0x0f000000) >> 24)
	{
	    case 0: 
		uexcep->unwinder_data.pr_addr = 
					    (_UINT32)&__c28xabi_unwind_cpp_pr0;
		break;
	    case 1: 
		uexcep->unwinder_data.pr_addr = 
					    (_UINT32)&__c28xabi_unwind_cpp_pr1;
		break;
	    case 2: 
		uexcep->unwinder_data.pr_addr = 
					    (_UINT32)&__c28xabi_unwind_cpp_pr2;
		break;
	    default:
		return false;
	}
    }
    /*-----------------------------------------------------------------------*/
    /* If MSB==0, Bits 30-0 contain the PR offset, conv from segrel to abs   */
    /*-----------------------------------------------------------------------*/
    else
    {
	uexcep->unwinder_data.pr_addr =__TI_prel2abs(uexcep->pr_data.eht_start);
    #ifdef DEBUG_UNWINDER
    printf("UW: (Generic) EHT First Word %"PRIx32", (addr %"PRIx32")\n", 
	   eht_first_word, uexcep->unwinder_data.pr_addr);
    #endif /* DEBUG_UNWINDER */

    }

    return true;
}


/*****************************************************************************/
/*                                                                           */
/* __TI_targ_regbuf_get_sp - Return SP from RegBuffer pointed to by context  */
/*                                                                           */
/*****************************************************************************/
_UINT32 __TI_targ_regbuf_get_sp(_Unwind_Context *context)
{
    _Unwind_Register_Buffer *regbuf = (_Unwind_Register_Buffer*)context;
    return regbuf->core[_UR_SP];
}


/*****************************************************************************/
/*                                                                           */
/* __TI_targ_regbuf_get_pc - Return PC from RegBuffer pointed to by context  */
/*                                                                           */
/*****************************************************************************/
_UINT32 __TI_targ_regbuf_get_pc(_Unwind_Context *context)
{
    _Unwind_Register_Buffer *regbuf = (_Unwind_Register_Buffer*)context;
    return regbuf->core[_UR_PC];
}


/*****************************************************************************/
/*                                                                           */
/* __TI_targ_regbuf_set_pc - Store into RegBuffer PC pointed by context      */
/*                                                                           */
/*****************************************************************************/
void __TI_targ_regbuf_set_pc(_Unwind_Context *context, _UINT32 val)
{
    _Unwind_Register_Buffer *regbuf = (_Unwind_Register_Buffer*)context;
    regbuf->core[_UR_PC] = val;
    return;
}

/*****************************************************************************/
/*                                                                           */
/* __TI_targ_regbuf_get_sb - Return Static Base (DP) from RegBuffer          */
/*                                                                           */
/*    This function is used to get the base address for type_info pointers   */
/*    encoded as SB-relative offsets. This implementation of TDEH does not   */
/*    use relative encodings; it uses absolute addresses. So return 0.       */
/*                                                                           */
/*****************************************************************************/
_UINT32 __TI_targ_regbuf_get_sb(_Unwind_Context *context)
{
   return 0; 
}

/*****************************************************************************/
/*                                                                           */
/* __TI_targ_rtti_address - Return address of referenced typeinfo object     */
/*                                                                           */
/*****************************************************************************/
_UINT32 __TI_targ_rtti_address(_UINT32 *offset, _Unwind_Context *context)
{
   return *offset;            // This implementation uses absolute addressing
}

#ifdef DEBUG_UNWINDER
/*****************************************************************************/
/*                                                                           */
/* __TI_dump_regbuf_context - Helper function for debug                      */
/*                                                                           */
/*****************************************************************************/
void __TI_dump_regbuf_context(_Unwind_Context *context)
{
    _Unwind_Register_Buffer *regbuf = (_Unwind_Register_Buffer *)context;

    printf("UW: context @ %p\n", context);

    printf("UW:  RETA: %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_RETA]);

    printf("UW:  SP:   %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_SP]);
    printf("UW:  PC:   %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_PC]);

    printf("UW:  XAR1: %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_XAR1]);
    printf("UW:  XAR2: %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_XAR2]);
    printf("UW:  XAR3: %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_XAR3]);
    printf("UW:  XAR4: %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_XAR4]);
#ifdef __TMS320C28XX_FPU32__
  #ifdef __TMS320C28XX_FPU64__
    printf("UW:  R4L:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R4L]);
  #endif
    printf("UW:  R4H:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R4H]);
  #ifdef __TMS320C28XX_FPU64__
    printf("UW:  R5L:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R5L]);
  #endif
    printf("UW:  R5H:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R5H]);
  #ifdef __TMS320C28XX_FPU64__
    printf("UW:  R6L:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R6L]);
  #endif
    printf("UW:  R6H:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R6H]);
  #ifdef __TMS320C28XX_FPU64__
    printf("UW:  R7L:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R7L]);
  #endif
    printf("UW:  R7H:  %#" _SAVED_REG_FMT "\n", regbuf->core[_UR_R7H]);
#endif
#if 0
    int i;
    for (i=-16;i<16;i++)
        printf("UW: %#"_SAVED_REG_FMT": %#"_SAVED_REG_FMT"\n",
               (unsigned long*)regbuf->core[_UR_SP] + i,
               *((unsigned long*)regbuf->core[_UR_SP] + i));
#endif
}
#endif /* DEBUG_UNWINDER */

/*****************************************************************************/
/*                                                                           */
/* __TI_targ_regbuf_install - Copy RegBuffer into machine registers          */
/*                                                                           */
/*****************************************************************************/
void __TI_targ_regbuf_install(_Unwind_Context *context)
{
    _Unwind_Register_Buffer *regbuf = (_Unwind_Register_Buffer*)context;

    __TI_Install_CoreRegs(&regbuf->core);
    /*************************************************************************/
    /* __TI_Install_CoreRegs transfers control out of the unwinder.  Do not  */
    /* add any code after this point.  It will not be executed.              */
    /*************************************************************************/
}


/*****************************************************************************/
/*                                                                           */
/* __TI_targ_setup_call_parm0 - Set up register buffer to make "val" the     */
/*                              first parameter to a function whose address  */
/*                              will be stored in the register buffer PC     */
/*                                                                           */
/*****************************************************************************/
void __TI_targ_setup_call_parm0(_Unwind_Context *context, _UINT32 val)
{
    _Unwind_Register_Buffer *regbuf = (_Unwind_Register_Buffer*)context;
    regbuf->core[_UR_ARG1] = val;
    return;
}

/*****************************************************************************/
/*                                                                           */
/* __TI_Unwind_RaiseException - This function exists to allocate the         */
/*          register context for __TI_Unwind_RaiseException2, which does     */
/*          all of the work, but doesn't need to know the size of the        */
/*          register context.                                                */
/*                                                                           */
/*****************************************************************************/
_Unwind_Reason_Code __TI_Unwind_RaiseException(_Unwind_Exception *uexcep, 
					       _Unwind_Context   *ph2_context)
{
    #ifdef DEBUG_UNWINDER
    printf("UW: In __TI_Unwind_RaiseException, UE @ %p, ph2_context @ %p\n", 
           uexcep, ph2_context);
    #endif

    /*-----------------------------------------------------------------------*/
    /* Make a copy of the register context for use by the Phase 1 unwinder.  */
    /* This needs to be a copy because we're going to simulate unwinding by  */
    /* writing to it, and we don't want to scribble on the original yet.     */
    /* Phase 2 will use the original, since at that time we are committed    */
    /* to unwinding the frame.                                               */
    /*-----------------------------------------------------------------------*/
    _Unwind_Register_Buffer ph1_regs;
    _Unwind_Context *ph1_context = (_Unwind_Context *)&ph1_regs;

    memcpy(ph1_context, ph2_context, sizeof(_Unwind_Register_Buffer));

    return __TI_Unwind_RaiseException2(uexcep,
                                      ph1_context,
                                      ph2_context);
}

#endif /* __EXCEPTIONS */
