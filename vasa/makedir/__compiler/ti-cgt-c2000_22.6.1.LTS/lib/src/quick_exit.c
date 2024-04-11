/*****************************************************************************/
/*  QUICK_EXIT.C                                                             */
/*                                                                           */
/* Copyright (c) 2018 Texas Instruments Incorporated                         */
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
/*****************************************************************************/
#include <stdlib.h>
#include <_mutex.h>
#include <_data_synch.h>

#define MAX_AT_QUICK_EXIT_FUN 32
static _DATA_ACCESS 
struct {
    int count;
    void (*(fptr[MAX_AT_QUICK_EXIT_FUN]))(void);
} 
quick_exit_funcs = { 0, {NULL} };

/******************************************************************************/
/* at_quick_exit() - C11. register a function to call at quick_exit().        */
/******************************************************************************/
_CODE_ACCESS int at_quick_exit(void (*func)(void))
{
    int err_code = 1;

    __TI_resource_lock(__TI_LOCK_ATEXIT);
    __TI_data_synch_INV(&quick_exit_funcs, sizeof(quick_exit_funcs));

    if (quick_exit_funcs.count < MAX_AT_QUICK_EXIT_FUN)
    {
        int allocated_entry = quick_exit_funcs.count++;

        quick_exit_funcs.fptr[allocated_entry] = func;
        __TI_data_synch_WB(&quick_exit_funcs, sizeof(quick_exit_funcs));

        err_code = 0;
    }

    __TI_resource_unlock(__TI_LOCK_ATEXIT);

    return err_code;
}

/*****************************************************************************/
/* quick_exit() - C11. Execute in reverse order any functions registered     */
/*                via at_quick_exit() and then call _Exit.                   */
/*****************************************************************************/
_TI_NORETURN _CODE_ACCESS void quick_exit(int status)
{

    __TI_resource_lock(__TI_LOCK_ATEXIT);
    __TI_data_synch_INV(&quick_exit_funcs, sizeof(quick_exit_funcs));

    while (quick_exit_funcs.count > 0)
    {
        int allocated_entry = --quick_exit_funcs.count;
        void (*fptr)(void) = quick_exit_funcs.fptr[allocated_entry];

        /*------------------------------------------------------------------*/
        /* The quick_exit_funcs.count may increase during call via fptr.    */
        /*------------------------------------------------------------------*/
        if (fptr) (*fptr)();
    } 

    __TI_data_synch_WB(&quick_exit_funcs.count, sizeof(quick_exit_funcs.count));
    __TI_resource_unlock(__TI_LOCK_ATEXIT);

    _Exit(status);
}
