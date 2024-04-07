;******************************************************************************
;* tdeh_uwentry_c28x.asm                                                      *
;*                                                                            *
;* Copyright (c) 2016 Texas Instruments Incorporated                          *
;* http://www.ti.com/                                                         *
;*                                                                            *
;*  Redistribution and  use in source  and binary forms, with  or without     *
;*  modification,  are permitted provided  that the  following conditions     *
;*  are met:                                                                  *
;*                                                                            *
;*     Redistributions  of source  code must  retain the  above copyright     *
;*     notice, this list of conditions and the following disclaimer.          *
;*                                                                            *
;*     Redistributions in binary form  must reproduce the above copyright     *
;*     notice, this  list of conditions  and the following  disclaimer in     *
;*     the  documentation  and/or   other  materials  provided  with  the     *
;*     distribution.                                                          *
;*                                                                            *
;*     Neither the  name of Texas Instruments Incorporated  nor the names     *
;*     of its  contributors may  be used to  endorse or  promote products     *
;*     derived  from   this  software  without   specific  prior  written     *
;*     permission.                                                            *
;*                                                                            *
;*  THIS SOFTWARE  IS PROVIDED BY THE COPYRIGHT  HOLDERS AND CONTRIBUTORS     *
;*  "AS IS"  AND ANY  EXPRESS OR IMPLIED  WARRANTIES, INCLUDING,  BUT NOT     *
;*  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR     *
;*  A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT     *
;*  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,     *
;*  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL  DAMAGES  (INCLUDING, BUT  NOT     *
;*  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,     *
;*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY     *
;*  THEORY OF  LIABILITY, WHETHER IN CONTRACT, STRICT  LIABILITY, OR TORT     *
;*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE     *
;*  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.      *
;*                                                                            *
;******************************************************************************

        .cdecls CPP, LIST, "tdeh_c28x.h"

	;
	; REG_SZ is the size of a saved SOE register
	;

	.asg 2, REG_SZ

	;
	; CONTEXT_SZ is the size of the register context buffer
	;

	.asg ((_Unwind_Reg_Id._UR_REG_LAST + 1) * REG_SZ), CONTEXT_SZ

	; 
	; RETADDRSZ is the size of the pushed return address pointer
	;

	.asg REG_SZ, RETADDRSZ

;------------------------------------------------------------------------------
; _Unwind_RaiseException - wrapper for C function __TI_Unwind_RaiseException
;
; _Unwind_Reason_Code _Unwind_RaiseException(_Unwind_Exception *);
;
; _Unwind_Reason_Code __TI_Unwind_RaiseException(_Unwind_Exception *uexcep,
;                                                _Unwind_Context   *context);
;------------------------------------------------------------------------------
; This function is the language-independent starting point for
; propagating an exception.  It is called by __cxa_throw.
;
; This function needs to capture the state of the caller, which means
; all of the SOE registers (including DP and SP) as well as the return
; address.  (The stack unwinder finds the data for the caller by
; looking up the return address in the EXIDX table to find the
; "apparently throwing call site.")
;
; The state is saved in an array allocated on the stack, which is
; passed as the second argument to __TI_Unwind_RaiseException.
;------------------------------------------------------------------------------

        .def _Unwind_RaiseException
        .ref __TI_Unwind_RaiseException
_Unwind_RaiseException: .asmfunc stack_usage(CONTEXT_SZ + RETADDRSZ)

	;
        ; This function must:
        ; 1. Save all of the SOE registers in stack-allocated "context,"
        ;    including RETA as "PC".
        ; 2. Call __TI_Unwind_RaiseException(uexcep, context)
        ;    If things go well, this call never returns.
        ; 3. If __TI_Unwind_RaiseException returns an error, return
        ;    its return value to the original caller (stored in "PC")
	;

	MOVL  XAR7, #__TI_Unwind_RaiseException

_Unwind_Resume_ENTRY:

	; The goal here is to capture the state in the caller
	; (__cxa_throw, __cxa_rethrow) as it would be if URE returned
	; like a normal function.  For instance, [PC] is the return
	; address of the call.

	;
	; 1. Save all of the SOE registers, plus RETA, SP, and PC
	;

	MOVZ    AR5, SP		; fetch SP as it is now, which is 
		     		; the address of the context.  This
				; also populates ARG2 (XAR5)
	MOVL    XAR6, XAR5
	SUBB	XAR6, #RETADDRSZ; compute what it was in the caller

	MOVL    XAR0, *-SP[2]	; grab previous RPC from the stack
                                ; this is the value of the RPC register
				; in the caller

	PUSH    XAR0		; [RETA] = caller's RPC
	PUSH    XAR6		; [SP] = caller's SP
	PUSH    RPC		; [PC] = URE's RPC
	PUSH    XAR1
	PUSH    XAR2
	PUSH    XAR3
	PUSH    XAR4		; [ARG1] - this just allocates context space

PUSHF   .macro  reg
	.if .TMS320C2800_FPU64
	MOV32   *SP++, :reg:L
	.endif
	MOV32   *SP++, :reg:H
	.endm

	.if .TMS320C2800_FPU32
	PUSHF   R4
	PUSHF   R5
	PUSHF   R6
	PUSHF   R7
	.endif

	;
	; 2. Call __TI_Unwind_RaiseException (or maybe __TI_Unwind_Resume)
	;

				; ARG1 (XAR4) is already set
				; ARG2 (XAR5) is already set
	LCR    *XAR7		; takes two pointer args, XAR0 and XAR1
				; returns a value in ... AL?

        ; 3. If __TI_Unwind_RaiseException returns (it can only return
        ;    with an error), return to the original caller
        ;    (__cxa_throw), but do not restore any of the other
        ;    registers.  (If __TI_Unwind_RaiseException returns, it's
        ;    a normal return, so it would have saved/restored the
        ;    SOEs).  Anyway, __cxa_throw is about to call
        ;    __cxa_call_terminate, so it's moot.
        ;

	LRETR

        .endasmfunc

;------------------------------------------------------------------------------
; _Unwind_Resume - wrapper for C function __TI_Unwind_Resume
;
; void _Unwind_Resume(_Unwind_Exception *);
;
; void __TI_Unwind_Resume(_Unwind_Exception *uexcep, _Unwind_Context *context);
;------------------------------------------------------------------------------
; This function is the language-independent "resume" function.  After
; each frame gets a chance to perform cleanup, this function is called
; to resume propagating the exception to the next call frame.  It is
; called by __cxa_end_cleanup, below.
;
; Creates a register buffer just as _Unwind_RaiseException does, but
; calls a different function afterward.  __TI_Unwind_Resume never returns.
;------------------------------------------------------------------------------

        .def _Unwind_Resume
        .ref __TI_Unwind_Resume
_Unwind_Resume: .asmfunc stack_usage(CONTEXT_SZ + RETADDRSZ)

        ;
        ; This function must:
        ; 1. Save all of the SOE registers in stack-allocated "context."
        ;    It need not save RETA, which will be clobbered by
        ;    __TI_Unwind_Resume.
        ; 2. Call __TI_Unwind_Resume(uexcept, context)
        ;    This call never returns.
        ;
        ; The code for _Unwind_RaiseException does all of what we
        ; want, so just tail call it.  Since __TI_Unwind_Resume never
        ; returns, this path will never reach the epilog of
        ; _Unwind_RaiseException.
        ;

	MOVL	XAR7, #__TI_Unwind_Resume ; takes two args, XAR4 and XAR5

	B	_Unwind_Resume_ENTRY, UNC

        .endasmfunc

;------------------------------------------------------------------------------
; __TI_Install_CoreRegs - Set machine state to effect return, branch, or call
;
; void __TI_Install_CoreRegs(void *core_regs);
;------------------------------------------------------------------------------
; __TI_Install_CoreRegs is where the unwinder finally writes to the
; actual registers.  It is called when the actual registers need to be
; modified, such as when unwinding is completely done, or when handler
; code needs to be executed.  It called by __TI_targ_regbuf_install,
; which is just a wrapper for this function.  This function performs
; either a simulated return or a call to a cleanup/catch handler or
; __cxa_call_unexpected.
;
; __TI_targ_regbuf_install is eventually called from two places,
; __TI_Unwind_RaiseException and __TI_Unwind_Resume.
;
; __TI_Unwind_RaiseException calls __TI_unwind_frame to begin phase 2
; unwinding if a handler was found for the current exception.  (Phase
; 2 unwinding actually unwinds the stack and calls cleanup/catch
; handlers).  __TI_unwind_frame unwinds the frame until a
; cleanup/catch handler which needs to be run is found, at which point
; it calls __TI_targ_regbuf_install.  The pseudo-PC in the register
; buffer will have been set by the personality routine to the landing
; pad for the handler, so instead of performing a simulated return, we
; call the catch handler landing pad.  The very first thing the catch
; handler landing pad does is call __cxa_begin_catch, which takes one
; argument, the _Unwind_Exception pointer.  For this reason, this
; function needs to install ARG1 from the register buffer.
;
; During phase 2 unwinding, __cxa_end_cleanup calls _Unwind_Resume,
; which calls __TI_Unwind_Resume.  __TI_Unwind_Resume calls
; __TI_unwind_frame when the personality routine returns
; _URC_CONTINUE_UNWIND, and things proceed as when
; __TI_Unwind_RaiseException calls __TI_unwind_frame.
;
; __TI_Unwind_Resume will also call __TI_targ_regbuf_install if the
; personality routine returns _URC_INSTALL_CONTEXT.  This happens when
; a cleanup/catch/fespec handler is found.  The personality routine
; sets PC to the handler landing pad and ARG1 to the _Unwind_Context
; pointer.
;
; Additionally, for FESPEC, the personality routine may set PC to
; "__cxa_call_unexpected" and ARG1 to the _Unwind_Context pointer, and
; return _URC_INSTALL_CONTEXT, which results in a call to
; __cxa_call_unexpected.
;
; Returns to the location in "PC."
;------------------------------------------------------------------------------

        .def __TI_Install_CoreRegs
__TI_Install_CoreRegs: .asmfunc stack_usage(RETADDRSZ)

	;
        ; This function must:
        ; 1. Restore all of the SOE registers from "context," which
        ;    lives in some ancestor call's frame.
        ; 2. Restore ARG1 (in case we are simulating a call).
        ; 3. Restore RETA from "PC" (in case we are simulating a call).
        ; 4. Branch to the address in "PC".
	;

	; The context is always the frame originally allocated by
	; _Unwind_RaiseException.  We are going to throw away higher
	; frames anyway, so we can go ahead and set the SP to just
	; past the last address of the context for popping.

	ADDB    XAR4, #CONTEXT_SZ
	MOV     SP, AR4		; set SP to the end of the context

	; The frames representing the callees of _Unwind_RaiseException
	; (the bulk of the unwinder) are now gone.

POPF   .macro  reg
	MOV32   :reg:H, *--SP
	.if .TMS320C2800_FPU64
	MOV32   :reg:L, *--SP
	.endif
	.endm

	.if .TMS320C2800_FPU32
	POPF    R7
	POPF    R6
	POPF    R5
	POPF    R4
	.endif

	POP     XAR4	; ARG1 if this turns out to be a call
	POP    	XAR3
	POP    	XAR2
	POP    	XAR1

	POP     XAR7	; [PC]
	POP     XAR6	; [SP]
	POP     RPC	; [RETA]

	; In most cases, this function performs an alternate return.
	; However, in one case (only for __cxa_call_unexpected) we use
	; this function to make a call.  We need to know whether to
	; simulate a CALL or RET here.  ARM and C6x don't have this
	; issue because a CALL doesn't push the RETA onto the stack.

	.global __cxa_call_unexpected
	MOVL    XAR0, #__cxa_call_unexpected
	MOVL    ACC, XAR0
	CMPL	ACC, XAR7

	B	#not_a_call, NEQ

is_a_call

	; case 2: call __cxa_call_unexpected
	; - We are virtually in the function that called the
	;   function that violated its FEspec
	; - We're going to do a combination of two steps:
	;   1. install the virtual context
	;   2. simulate a call to [PC] (__cxa_call_unexpected)

	; Note that the old RPC is living at address [SP]; we don't
	; need to rewrite it, but we do need to adjust the stack to
	; account for the simulated call pushing it.  Otherwise, this
	; is just the same as a branch, so fall through to not_a_call

	ADDB	XAR6, #2

not_a_call

	; case 1: catch, cleanup, etc
	; - We are virtually in the function that will be doing the
	;   catch/cleanup
	; - We're going to do a combination of two steps:
	;   1. install the virtual context
	;   2. simulate a branch to [PC] (the catch block)

	MOV     SP, AR6

	; The frames representing __cxa_throw and all of its calleees
	; are now gone, including the old context, so we can't refer to
	; it after this.

	LB	*XAR7

        .endasmfunc

;------------------------------------------------------------------------------
; __cxa_end_cleanup - generic C++ helper function
;
; void __cxa_end_cleanup(void)
;
; _Unwind_Exception *__TI_cxa_end_cleanup(void);
;
; void _Unwind_Resume(_Unwind_Exception *);
;------------------------------------------------------------------------------
; __cxa_end_cleanup is a C++-specific function, called directly in
; compiler-generated code.  It calls __TI_cxa_end_cleanup to perform
; bookkeeping for foreign exceptions and exceptions thrown during
; cleanup.  It calls _Unwind_Resume to continue unwinding the stack.
;
; Saves/restores state to preserve changes made during destructors
; from changes made in the course of executing __TI_cxa_end_cleanup.
;------------------------------------------------------------------------------
	.if .TMS320C2800_FPU64
	.asg 11, SOE_COUNT
	.elseif .TMS320C2800_FPU32
	.asg 7, SOE_COUNT
	.else
	.asg 3, SOE_COUNT
	.endif

        .def __cxa_end_cleanup
        .ref __TI_cxa_end_cleanup
__cxa_end_cleanup: .asmfunc stack_usage(SOE_COUNT * REG_SZ + RETADDRSZ)

        ; Doesn't need to store PC or SP

        ; There is some amount of confusion in this function.  I don't
        ; think we should need to save the SOE registers around the
        ; call to __TI_cxa_end_cleanup.

	PUSH    XAR1
	PUSH    XAR2
	PUSH    XAR3

	.if .TMS320C2800_FPU32
	PUSHF   R4
	PUSHF   R5
	PUSHF   R6
	PUSHF   R7
	.endif

	LCR	#__TI_cxa_end_cleanup	; returns a value in XAR4

	.if .TMS320C2800_FPU32
	POPF   	R7
	POPF   	R6
	POPF   	R5
	POPF   	R4
	.endif
	POP     XAR3
	POP     XAR2
	POP     XAR1

	LB	#_Unwind_Resume		; Don't use CALL here, because
					; we want to find the context of the 
					; function which calls 
					; __cxa_end_cleanup.
					; The value from __TI_cxa_end_cleanup
					; is passed to this function.
	
        .endasmfunc
