/*****************************************************************************/
/*  memory.c       							     */
/*                                                                           */
/* Copyright (c) 1993 Texas Instruments Incorporated                         */
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
/*									     */
/*  IMPORTANT!!!                                                             */
/*									     */
/*  This module contains the functions which implement the dynamic memory    */
/*  management routines. The following assumptions/rules apply:              */
/*									     */
/*   1) We can only allocate in multiples of MIN_PAYLOAD_ALIGN.  This will   */
/*      take a while to explain...                                           */
/*									     */
/*   2) The size of the heap is set at link time, using the -heap flag       */
/*      The allocation and sizing of the heap is a cooperative effort        */
/*      involving the linker, this file, and "sysmem.c".                     */
/*                                                                           */
/*   3) The heap can be reset at any time by calling the function "minit"    */
/*                                                                           */
/*   4) For multi-threaded applications, the heap is considered a SHARED     */
/*      resource. RTS takes responsibility for ensuring single-threaded      */
/*      access to the packet free list via use of the __TI_LOCK_HEAP_ALLOC   */
/*      mutex. The RTS does not support coherency of dynamically allocated   */
/*      objects at this time (which includes the packet free list itself).   */
/*      It is anticipated that a multi-threaded application will use a       */
/*      shared heap memory system provided by the underlying runtime OS      */
/*      (instead of the RTS heap memory system).                             */
/*									     */
/*  The following global functions are defined in this module :		     */
/*    minit()	 : Function to initialize dynamic memory management	     */
/*    malloc()	 : Function to allocate memory from mem mgmt system.	     */
/*    calloc()	 : Allocate an clear memory from mem mgmt system.	     */
/*    realloc()  : Reallocate a packet					     */
/*    free()	 : Function to free allocated memory.			     */
/*    aligned_alloc() : Allocate a block with a specific alignment.          */
/*    __TI_heap_stats : Summarize allocation bookkeeping                     */
/*    __TI_heap_check : Sanity check existing packets                        */
/*    __TI_heap_total_available : How much is available for allocation?      */
/*    __TI_heap_largest_available : What is the largest chunk available?     */
/*									     */
/*****************************************************************************/
#ifdef MALLOC_DEBUG
#include <stdio.h>
#endif
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <_mutex.h>
#include <_data_synch.h>

/*---------------------------------------------------------------------------*/
/* MIN_PAYLOAD_ALIGN must be the strictest alignment of any built-in type.   */
/* The standard requires that the payload returned from malloc be aligned    */
/* strictly enough that it can be used as a pointer to any built-in type.    */
/*---------------------------------------------------------------------------*/
#if defined(__PRU__) || defined(__MSP430__)
/*---------------------------------------------------------------------------*/
/* PRU and MSP are weird because they have pointers that are bigger than the */
/* worst-case alignment.  Because we want to use the LSB to indicate         */
/* free/used, we'll pretend that the minimum alignment is >= 2 to simplify   */
/* calculations.  It turns out we also need it to be >=sizeof(ptr) so that   */
/* packets will always be big enough to be returned to the free list.        */
/*---------------------------------------------------------------------------*/
#define MIN_PAYLOAD_ALIGN 4
#else
union worst_case_align
{
    void *ptr;
    long double ld;
    long long ll;
};
#ifdef __clang__
#define MIN_PAYLOAD_ALIGN _Alignof(union worst_case_align)
#else
#define MIN_PAYLOAD_ALIGN __ALIGNOF__(union worst_case_align)
#endif
#endif

/*---------------------------------------------------------------------------*/
/* "PACKET" is the template for a data packet.  payload_size contains the    */
/* number of bytes allocated for the user, excluding the size required for   */
/* management of the packet (PACKET_OVERHEAD bytes).  Packets are always     */
/* allocated memory in MIN_PAYLOAD_ALIGN chunks of bytes.  The next_free     */
/* field is used to manage the free list, and is a pointer to the next       */
/* element in the free list.                                                 */
/*---------------------------------------------------------------------------*/
/* There are a couple of reasons we choose to allocate in multiples of       */
/* MIN_PAYLOAD_ALIGN, but the bottom line is that it makes the code simpler. */
/* In theory it is possible to create an allocator that is slightly more     */
/* efficient in terms of space overhead per allocated packet, but the gain   */
/* is very small and not worth the code complexity.                          */
/*---------------------------------------------------------------------------*/
/* For the following,                                                        */
/* A = __ALIGNOF__(PACKET)                                                   */
/* O = offsetof(payload, PACKET)                                             */
/*---------------------------------------------------------------------------*/
/* When freeing an allocated block, we find the containing packet by moving  */
/* backward PACKET_OVERHEAD bytes, so every payload must be a constant       */
/* offset from the start of its packet.                                      */
/*---------------------------------------------------------------------------*/
/* In aligned_alloc, we need to be able to create a packet with stricter     */
/* alignment than normal.  To do so, we advance the start of the packet by   */
/* A bytes at a time; we must use a multiple of the alignment of the         */
/* packet, or the members wouldn't be aligned properly.  Now, if O = 0 mod   */
/* A, we will always be able to reach any desired alignment greather than    */
/* A, because we only support power-of-two alignment.  On the other hand,    */
/* if O != 0 mod A, we will never reach a greater alignment.  The easiest    */
/* way to guarantee O = 0 mod A is to align the payload, which in turn       */
/* forces the struct to the same alignment.  The obvious alignment is        */
/* MIN_PAYLOAD_ALIGN.                                                        */
/*---------------------------------------------------------------------------*/
/* When allocating a packet, we split a free packet into the allocated       */
/* packet, and the remainder into a new free packet, if the original packet  */
/* was big enough.  This new packet must be aligned, which means that there  */
/* may be padding after the payload for some allocated packets.  This        */
/* padding must be accounted for in the packet size, which means the         */
/* allocation size must be rounded up to the alignment of the packet, or     */
/* MIN_PAYLOAD_ALIGN.  Thus, every allocation is effectively of a size       */
/* which is a multiple of MIN_PAYLOAD_ALIGN.                                 */
/*---------------------------------------------------------------------------*/
typedef struct pack
{
    size_t payload_size;
    struct
    {
#ifdef MALLOC_GUARD
        uint32_t guard;
#endif
        union
        {
            struct pack  *next_free;
            unsigned char payload[1] __attribute__((aligned(MIN_PAYLOAD_ALIGN)));
        };
    };
} PACKET;

#define PACKET_OVERHEAD (offsetof(struct pack, payload))

#ifdef MALLOC_GUARD
#define GUARDWORD 0xdeadbeef
#endif

/*---------------------------------------------------------------------------*/
/* __TI_SYSMEM_SIZE is a symbol whose *address* is set by the linker to the  */
/* size of the heap, via the -heap flag.                                     */
/*---------------------------------------------------------------------------*/
#if defined(__ARM_ARCH) || defined(__MSP430__)
#define __TI_SYSMEM_SIZE __SYSMEM_SIZE
#endif

#if (defined(__TMS320C2000__) && !defined(__TI_EABI__))
#define __TI_SYSMEM_SIZE _SYSMEM_SIZE
#endif

extern _DATA_ACCESS int __TI_SYSMEM_SIZE;          /* address = size of heap */

/*---------------------------------------------------------------------------*/
/* Define the heap memory area.  Note that allocated space is actually       */
/* (re)allocated in the linker.  The object must appear in the ".sysmem"     */
/* data section, and it must be aligned properly.                            */
/*---------------------------------------------------------------------------*/
#if defined(__TMS320C2000__) && !defined(__TI_EABI__)
__attribute__((section(".esysmem"),aligned(MIN_PAYLOAD_ALIGN)))
#else
__attribute__((section(".sysmem"),aligned(MIN_PAYLOAD_ALIGN)))
#endif
_DATA_ACCESS PACKET _sys_memory[1];

static int memory_is_initialized = 0;

/*---------------------------------------------------------------------------*/
/* SYS_FREE - This variable is a pointer to the free list.                   */
/*---------------------------------------------------------------------------*/
static PACKET *sys_free;

/*****************************************************************************/
/*                                                                           */
/*  HEAP_SIZE - The allocatable size of the heap before allocation           */
/*                                                                           */
/*****************************************************************************/
static inline size_t heap_size()
{
#ifdef __clang__
    size_t ss = (size_t)(&__TI_SYSMEM_SIZE);
#else
    size_t ss = _symval(&__TI_SYSMEM_SIZE);
#endif

    /*-----------------------------------------------------------------------*/
    /* Be careful to return zero if the heap is pathologically tiny.         */
    /*-----------------------------------------------------------------------*/
    return (ss >= PACKET_OVERHEAD) ? (ss - PACKET_OVERHEAD) : 0;
}

/*****************************************************************************/
/*                                                                           */
/*  HEAP_START - The start of the allocatable heap memory                    */
/*                                                                           */
/*****************************************************************************/
static inline unsigned char *heap_start()
{
#if defined(__MSP430__) && defined(__LARGE_DATA_MODEL__)
    /*-----------------------------------------------------------------------*/
    /* Use _addr20 because --near_data=globals option would cause a C        */
    /* assignment to produce incorrect code because _sys_memory appears to   */
    /* be initialized data.                                                  */
    /*-----------------------------------------------------------------------*/
    unsigned char * volatile workaround = _addr20(_sys_memory);
    return (unsigned char*)workaround;
#else
    return (unsigned char *)_sys_memory;
#endif
}

/*****************************************************************************/
/*                                                                           */
/*  HEAP_END - One byte beyond the end of the heap                           */
/*                                                                           */
/*****************************************************************************/
static inline unsigned char *heap_end()
{
    return (unsigned char *)&(heap_start()[heap_size()]);
}

/*****************************************************************************/
/*                                                                           */
/*  PACKET_PAYLOAD_SIZE - Usable size of this packet's payload.              */
/*                                                                           */
/*****************************************************************************/
static inline size_t packet_payload_size(PACKET *packet)
{
    return packet->payload_size & ~(size_t)1;
}

/*****************************************************************************/
/*                                                                           */
/*  NEXT_PACKET - Next packet by address                                     */
/*                                                                           */
/*****************************************************************************/
static inline PACKET *next_packet(PACKET *packet)
{
    return (PACKET*)((unsigned char *)packet +
                     packet_payload_size(packet) + PACKET_OVERHEAD);
}

/*****************************************************************************/
/*                                                                           */
/*  PACKET_IS_FREE - Is this packet free or in use?                          */
/*                                                                           */
/*****************************************************************************/
static inline int packet_is_free(PACKET *packet)
{
    return !(packet->payload_size & 1);
}

/*****************************************************************************/
/*                                                                           */
/*  MARK_PACKET_FREE - Mark this packet available for allocation             */
/*                                                                           */
/*****************************************************************************/
static inline void mark_packet_free(PACKET *packet)
{
    packet->payload_size &= ~(size_t)1;
}

/*****************************************************************************/
/*                                                                           */
/*  MARK_PACKET_USED - Mark this packet as in use                            */
/*                                                                           */
/*****************************************************************************/
static inline void mark_packet_used(PACKET *packet)
{
    packet->payload_size |= 1;
}

/*****************************************************************************/
/*                                                                           */
/*  SET_PAYLOAD_SIZE_AND_MARK_FREE - Set the packet's payload size and at    */
/*                                   the same time, mark it free.  (The size */
/*                                   and in use fields share space.)         */
/*                                                                           */
/*****************************************************************************/
static inline void set_payload_size_and_mark_free(PACKET *packet, size_t size)
{
    packet->payload_size = size;
}

/*****************************************************************************/
/*                                                                           */
/*  SET_PAYLOAD_SIZE_AND_MARK_USED - Set the packet's payload size and at    */
/*                                   the same time, mark it used.  (The size */
/*                                   and in use fields share space.)         */
/*                                                                           */
/*****************************************************************************/
static inline void set_payload_size_and_mark_used(PACKET *packet, size_t size)
{
    packet->payload_size = size | 1;
}

#if 0
/*****************************************************************************/
/* NOTE: In a multi-threaded application that is using RTS heap allocation,  */
/*       we need to write-back the value of all elements on the packet free  */
/*       list before leaving a critical region. This ensures that the        */
/*       shared memory retains the latest up-to-date value of the packet     */
/*       free list.                                                          */
/*									     */
/*       Alternatively, we can require that heap memory be non-cacheable.    */
/*       In either solution, there is a performance penalty.                 */
/*****************************************************************************/

/*****************************************************************************/
/*									     */
/*  INV_PACKET_LIST - Clear any local copies of a free list packet.          */
/*									     */
/*****************************************************************************/
static void inv_packet_list(void)
{
    /*------------------------------------------------------------------------*/
    /* The RTS heap allocation maintains a list of free heap memory packets   */
    /* that is pointed to by 'sys_free'. Since this is a shared resource,     */
    /* the RTS takes on the responsibility of keeping all copies of the       */
    /* packet list in the system up-to-date.                                  */
    /*------------------------------------------------------------------------*/
    /* For each PACKET on the sys_free list, write-back and/or invalidate the */
    /* cache line that the PACKET resides on.                                 */
    /*------------------------------------------------------------------------*/
    PACKET *current = sys_free;
    PACKET *last    = NULL;

    while (current)
    {
        last = current;
        current = current->next_free;
        __TI_data_synch_INV(last, sizeof(PACKET));
    }
}

/*****************************************************************************/
/*									     */
/*  WB_INV_PACKET_LIST - Write-back (and invalidate) any local copies of a   */
/*                       free list packet.                                   */
/*									     */
/*****************************************************************************/
static void wb_inv_packet_list(void)
{
    /*------------------------------------------------------------------------*/
    /* The RTS heap allocation maintains a list of free heap memory packets   */
    /* that is pointed to by 'sys_free'. Since this is a shared resource,     */
    /* the RTS takes on the responsibility of keeping all copies of the       */
    /* packet list in the system up-to-date.                                  */
    /*------------------------------------------------------------------------*/
    /* For each PACKET on the sys_free list, write-back and/or invalidate the */
    /* cache line that the PACKET resides on.                                 */
    /*------------------------------------------------------------------------*/
    PACKET *current = sys_free;
    PACKET *last    = NULL;

    while (current)
    {
        last = current;
        current = current->next_free;
        __TI_data_synch_WBINV(last, sizeof(PACKET));
    }
}
#endif

/*****************************************************************************/
/*									     */
/*  MEMINIT - This function performs the initial setup of the heap.          */
/*									     */
/*---------------------------------------------------------------------------*/
/* NOTE: All calls to meminit() must occur inside a critical section that    */
/*       is guarded by the __TI_LOCK_HEAP_ALLOC resource mutex.              */
/*****************************************************************************/
static void meminit(void)
{
    /*-----------------------------------------------------------------------*/
    /* If we can allocate even one byte, set up the free list.  Otherwise,   */
    /* set it to NULL so that we won't even have a free list to go through   */
    /* to look for blocks to allocate.                                       */
    /*-----------------------------------------------------------------------*/
    if (heap_size())
    {
        sys_free              = (PACKET*)heap_start();
        sys_free->next_free   = NULL;
#ifdef MALLOC_GUARD
        sys_free->guard       = GUARDWORD;
#endif
        set_payload_size_and_mark_free(sys_free, heap_size());
    }
    else sys_free = NULL;

    memory_is_initialized = 1;
    __TI_data_synch_WBINV(&memory_is_initialized, sizeof(memory_is_initialized));
}

/*****************************************************************************/
/*									     */
/*  MINIT - This function is not used by the compiler or RTS, but may be     */
/*          called directly by the user.  If this function is called,        */
/*          the heap is put into an uninitialized state, and the next call   */
/*          to an allocation function will re-initialize the heap.           */
/*                                                                           */
/*          WARNING: It is dangerous to call this function.  It does not     */
/*          deal with any existing pointers your program may have, so those  */
/*          pointers will be pointing to invalid objects in the free list.   */
/*          This is particularly bad for C++ objects, which sometimes        */
/*          allocate their own storage using pointers you do not have access */
/*          to.  Furthermore, some global C++ objects have an associated     */
/*          guard bit indicating that the object has already been allocated; */
/*          this bit does not get cleared if you call minit, so those C++    */
/*          objects will no longer be valid and cannot be used.  In summary, */
/*          you should probably never call this function.                    */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void minit(void)
{
    memory_is_initialized = 0;
    __TI_data_synch_WBINV(&memory_is_initialized, sizeof(memory_is_initialized));
}

/*****************************************************************************/
/*									     */
/*  FREE_LIST_INSERT - Add a packet into the free list.  This list is sorted */
/*	               by increasing size, giving a best-fit algorithm.      */
/*									     */
/*****************************************************************************/
/* NOTE: All calls to free_list_insert() must occur inside a critical        */
/* section that is guarded by the __TI_LOCK_HEAP_ALLOC resource mutex.       */
/*****************************************************************************/
static void free_list_insert(PACKET *packet)
{
    /*-----------------------------------------------------------------------*/
    /* Scan through list, looking for a larger packet.			     */
    /*-----------------------------------------------------------------------*/
    PACKET **location = &sys_free;
    size_t size = packet_payload_size(packet);

    while (*location && packet_payload_size(*location) < size)
        location = &((*location)->next_free);

    packet->next_free = *location;
    *location = packet;
}

/*****************************************************************************/
/*									     */
/* FREE_LIST_REMOVE - remove an item from the free list. 		     */
/*									     */
/*****************************************************************************/
/* NOTE: All calls to free_list_remove() must occur inside a critical        */
/* section that is guarded by the __TI_LOCK_HEAP_ALLOC resource mutex.       */
/*****************************************************************************/
static void free_list_remove(PACKET *packet)
{
    PACKET **location = &sys_free;

    /*-----------------------------------------------------------------------*/
    /* Scan through list, looking for packet to remove                       */
    /*-----------------------------------------------------------------------*/
    while (*location && *location != packet)
        location = &((*location)->next_free);

    if (*location)
    {
        *location = packet->next_free;
    }
    else
    {
#ifdef MALLOC_DEBUG
        fputs("free_list_remove: packet is not on the free list\n", stderr);
#endif
    }
}

/*---------------------------------------------------------------------------*/
/* SPLIT - Split a large packet into smaller packets.  This is a helper      */
/* function to trim packets when they are bigger than they need to be.       */
/* n.b. pay very close attention to the conditions for this function!        */
/*---------------------------------------------------------------------------*/
/* NOTE: All calls to split() must occur inside a critical section that      */
/*       is guarded by the __TI_LOCK_HEAP_ALLOC resource mutex.              */
/*---------------------------------------------------------------------------*/
/* preconditions:                                                            */
/* - "original" is big enough.                                               */
/* - "original" is free.                                                     */
/* - "original" is NOT on the free list.  If it starts out that way,         */
/*      remove it BEFORE calling this function.                              */
/* - "size" is a multiple of MIN_ALN                                         */
/*---------------------------------------------------------------------------*/
/* postconditions:                                                           */
/* - "original" will be set to the appropriate size                          */
/* - "original" will be marked "used"                                        */
/* If a split occurred, the new packet will be                               */
/* - marked free                                                             */
/* - added to the free list                                                  */
/* - merged with the next packet, if that packet is free                     */
/*---------------------------------------------------------------------------*/
static void split(PACKET *original, size_t size)
{
    /*-----------------------------------------------------------------------*/
    /* If packet is larger than needed, free extra space at end	             */
    /* by inserting the remaining space into free list.			     */
    /*-----------------------------------------------------------------------*/
    if (packet_payload_size(original) - size >= sizeof(PACKET))
    {
        PACKET *next =
            (PACKET*)((unsigned char *)original + size + PACKET_OVERHEAD);
        set_payload_size_and_mark_free(next,
                                      packet_payload_size(original) -
                                      size - PACKET_OVERHEAD);

        /*-------------------------------------------------------------------*/
        /* We may need to coalesce with the *next* packet, but not the       */
        /* previous packet, which is the one we're trying to allocate!       */
        /*-------------------------------------------------------------------*/
        PACKET *after = next_packet(next);
        if ((unsigned char*)after < heap_end() && packet_is_free(after))
        {
            free_list_remove(after);
            set_payload_size_and_mark_free(next,
                                           packet_payload_size(next) +
                                           packet_payload_size(after) +
                                           PACKET_OVERHEAD);
        }

#ifdef MALLOC_GUARD
        next->guard = GUARDWORD;
#endif

        free_list_insert(next);

        set_payload_size_and_mark_used(original, size);
    }

    /*-----------------------------------------------------------------------*/
    /* If packet is not big enough to split, just mark it used.              */
    /*-----------------------------------------------------------------------*/
    else mark_packet_used(original);
}

/*****************************************************************************/
/*									     */
/*  MALLOC - Allocate a packet of a given size, and return a pointer to it.  */
/*	     The returned pointer is guaranteed to be aligned to the         */
/*           strictest alignment of any built-in type.                       */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void *malloc(size_t size)
{
    return memalign(MIN_PAYLOAD_ALIGN, size);
}

/*****************************************************************************/
/*									     */
/*  CALLOC - Allocate a packet of a given size, set the data in the packet   */
/*	     to all-bits-zero, and return a pointer to it.		     */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void *calloc(size_t num, size_t size)
{
    /*-----------------------------------------------------------------------*/
    /* Reject impossibly huge allocations.  Test before the multiplication   */
    /* in case it overflows.                                                 */
    /*-----------------------------------------------------------------------*/
    if (heap_size() / size < num)
    {
#ifdef MALLOC_DEBUG
        fputs("calloc: unreasonably huge request\n", stderr);
#endif
        return NULL;
    }

    size_t esz = size * num;

    void *ptr = malloc(esz);

    if (ptr) memset(ptr, 0, esz);

    return ptr;
}

/*****************************************************************************/
/*									     */
/*  REALLOC - Resize a packet, moving it if necessary.                       */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void *realloc(void *userptr, size_t size)
{
    if (userptr == NULL) return malloc(size);
    if (size == 0) { free(userptr); return NULL; }

    /*-----------------------------------------------------------------------*/
    /* Reject impossibly huge allocations.                                   */
    /*-----------------------------------------------------------------------*/
    if (size > heap_size())
    {
#ifdef MALLOC_DEBUG
        fputs("realloc: unreasonably huge request\n", stderr);
#endif
        return NULL;
    }

    /*-----------------------------------------------------------------------*/
    /* Round requested size up to a multiple of minimum alignment.           */
    /*-----------------------------------------------------------------------*/
    size = (size + (MIN_PAYLOAD_ALIGN-1)) & ~(MIN_PAYLOAD_ALIGN-1);

    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    PACKET *packet = (PACKET*)((unsigned char*)userptr - PACKET_OVERHEAD);

    if (packet_is_free(packet))
    {
#ifdef MALLOC_DEBUG
        fputs("realloc: attempt to resize an unallocated packet\n", stderr);
#endif
        __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
        return 0;
    }

    /*-----------------------------------------------------------------------*/
    /* If the current packet is large enough to hold the new size, keep it.  */
    /*-----------------------------------------------------------------------*/
    if (size <= packet_payload_size(packet))
    {
        /*-------------------------------------------------------------------*/
        /* Trim the block if possible and add the leftover to the free list. */
        /*-------------------------------------------------------------------*/
        split(packet, size);
    }

    /*-----------------------------------------------------------------------*/
    /* If the current packet is not large enough....                         */
    /*-----------------------------------------------------------------------*/
    else
    {
        /*-------------------------------------------------------------------*/
        /* If the next packet is free, and by coalescing we would have a     */
        /* packet that is large enough, do so.                               */
        /*-------------------------------------------------------------------*/
        PACKET *next = next_packet(packet);
        size_t combined_size =
            packet_payload_size(packet) + packet_payload_size(next) + PACKET_OVERHEAD;

        if (((unsigned char *)next < heap_end()) && packet_is_free(next) &&
            combined_size >= size)
        {
            free_list_remove(next);
            set_payload_size_and_mark_used(packet, combined_size);
            /*---------------------------------------------------------------*/
            /* Trim the block if possible and add leftover to the free list. */
            /*---------------------------------------------------------------*/
            split(packet, size);
        }

        /*-------------------------------------------------------------------*/
        /* Otherwise we must allocate a new packet and move the data.        */
        /*-------------------------------------------------------------------*/
        else
        {
            unsigned char *new = malloc(size);
            if (new != 0)
            {
                memcpy(new, userptr, packet_payload_size(packet));
                free(userptr);
            }
            __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
            return new;
        }
    }

    __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
    return &packet->payload;
}

/*****************************************************************************/
/*									     */
/*  FREE - Return an allocated packet to the free memory list                */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void free(void *userptr)
{
    if (userptr == NULL) return;

    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    PACKET *packet = (PACKET *)((unsigned char *)userptr - PACKET_OVERHEAD);

#ifdef MALLOC_GUARD
    if (packet->guard != GUARDWORD)
    {
#ifdef MALLOC_DEBUG
        fputs("free: corrupt guard word\n", stderr); fflush(NULL);
#endif
        abort();
    }
#endif

    /*-----------------------------------------------------------------------*/
    /* Search for the adjacent packets                                       */
    /*-----------------------------------------------------------------------*/
    PACKET *prev = NULL;
    PACKET *current;
    PACKET *next = NULL;

    current = _sys_memory;
    while (current < packet)
    {
        prev    = current;
        current = next_packet(current);
    }

    next = next_packet(current);
    if ((unsigned char *)next > heap_end())
	next = NULL;

    /*-----------------------------------------------------------------------*/
    /* Check for pointer or packet errors.				     */
    /*-----------------------------------------------------------------------*/
    if ((current != packet) || packet_is_free(current))
    {
#ifdef MALLOC_DEBUG
        if (current != packet)
            fputs("free: invalid packet\n", stderr);
        else if (packet_is_free(current))
            fputs("free: packet already free\n", stderr);
#endif
        __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
        return;
    }

    if (prev && !packet_is_free(prev)) prev = NULL;
    if (next && !packet_is_free(next)) next = NULL;

    if (prev) free_list_remove(prev);
    if (next) free_list_remove(next);

    /*-----------------------------------------------------------------------*/
    /* Attempt to coalesce (prev, packet, next)                              */
    /*-----------------------------------------------------------------------*/
    if (prev && next)
    {
        set_payload_size_and_mark_free(prev, packet_payload_size(prev) +
                                      packet_payload_size(packet) + packet_payload_size(next) +
                                      PACKET_OVERHEAD + PACKET_OVERHEAD);
        packet = prev;
    }

    /*-----------------------------------------------------------------------*/
    /* Attempt to coalesce (prev, packet)                                    */
    /*-----------------------------------------------------------------------*/
    else if (prev)
    {
        set_payload_size_and_mark_free(prev, packet_payload_size(prev) +
                                      packet_payload_size(packet) + PACKET_OVERHEAD);
        packet = prev;
    }

    /*-----------------------------------------------------------------------*/
    /* Attempt to coalesce (packet, next)                                    */
    /*-----------------------------------------------------------------------*/
    else if (next)
    {
        set_payload_size_and_mark_free(packet, packet_payload_size(packet) +
                                      packet_payload_size(next) + PACKET_OVERHEAD);
    }
    else
        mark_packet_free(packet);

    /*-----------------------------------------------------------------------*/
    /* No coalescence possible, just insert this packet into list	     */
    /*-----------------------------------------------------------------------*/
    free_list_insert(packet);
    __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
}

void *memalign(size_t alignment, size_t size) 
   __attribute__((__alias__("aligned_alloc")));

/*****************************************************************************/
/*                                                                           */
/*  MEMALIGN - Allocate a packet of a given size, and on a given boundary.   */
/*                                                                           */
/*****************************************************************************/
_CODE_ACCESS void *aligned_alloc(size_t alignment, size_t size)
{
    /*-----------------------------------------------------------------------*/
    /* Some implementations treat malloc(0) as malloc(1) so that malloc(0)   */
    /* returns a unique pointer.  If you want that, change this line.        */
    /*-----------------------------------------------------------------------*/
#if 0
    if (size == 0) size = 1;
#else
    if (size == 0) return NULL;
#endif

    /*-----------------------------------------------------------------------*/
    /* Reject impossibly huge allocations.                                   */
    /*-----------------------------------------------------------------------*/
    if (size > heap_size())
    {
#ifdef MALLOC_DEBUG
        fputs("aligned_alloc: unreasonably huge request\n", stderr);
#endif
        return NULL;
    }

    /*-----------------------------------------------------------------------*/
    /* Round requested size up to a multiple of minimum alignment.           */
    /*-----------------------------------------------------------------------*/
    size = (size + (MIN_PAYLOAD_ALIGN-1)) & ~(MIN_PAYLOAD_ALIGN-1);

    /*-----------------------------------------------------------------------*/
    /* If alignment is less than minimum alignment, or if it is not a power  */
    /* of two, just use the default alignment.                               */
    /*-----------------------------------------------------------------------*/
    if (alignment < MIN_PAYLOAD_ALIGN || (alignment & (alignment-1)))
        alignment = MIN_PAYLOAD_ALIGN;

    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    if (!memory_is_initialized) meminit();
    else __TI_data_synch_INV(&memory_is_initialized, sizeof(memory_is_initialized));

    PACKET       *current = sys_free;
    PACKET       *aln_packet;
    size_t        aln_mask = alignment - 1;
    unsigned char *aln_start;
    unsigned char *un_aln_start;

    /*-----------------------------------------------------------------------*/
    /* Scan through free list for packet large enough to contain aligned     */
    /* packet.                                                               */
    /*-----------------------------------------------------------------------*/
    for ( ; current; current = current->next_free)
    {
        /*-------------------------------------------------------------------*/
        /* Start of usable portion of the current packet.                    */
        /*-------------------------------------------------------------------*/
        un_aln_start = (unsigned char *) current + PACKET_OVERHEAD;

        /*-------------------------------------------------------------------*/
        /* First aligned address in usable portion of the current packet.    */
        /*-------------------------------------------------------------------*/
#if defined(__MSP430__) && !defined(__LARGE_DATA_MODEL__)
        /*-------------------------------------------------------------------*/
        /* MSP430 defines uintptr_t to be 32 bits if either code or data     */
        /* model is large, but in large code small data model, the parser    */
        /* gives an invalid pointer conversion from uintptr_t to a pointer.  */
        /*-------------------------------------------------------------------*/
        aln_start = (unsigned char *) (((unsigned int) un_aln_start + aln_mask) & ~(unsigned int)aln_mask);
#else
        aln_start = (unsigned char *) (((uintptr_t) un_aln_start + aln_mask) & ~(uintptr_t)aln_mask);
#endif

        /*-------------------------------------------------------------------*/
        /* If the block is not already sufficiently aligned, we will slice a */
        /* small part of it from the beginning to create a packet which      */
        /* satisfies the alignment.  This slice must itself be big enough    */
        /* to be a packet on its own, and must be added to the free list.    */
        /* We want to keep the aligned address aligned, so increment the     */
        /* proposed start address by alignment.                              */
        /*-------------------------------------------------------------------*/
        if (un_aln_start != aln_start)
            while ((unsigned char *)current+sizeof(PACKET) > aln_start - PACKET_OVERHEAD)
                aln_start += alignment;

        /*-------------------------------------------------------------------*/
        /* Now we know where the actual packet will be if the current packet */
        /* is big enough.  Make sure it does not overlap the next packet.    */
        /*-------------------------------------------------------------------*/

        /*-------------------------------------------------------------------*/
        /* Actual start of the next packet (either free or in use).          */
        /*-------------------------------------------------------------------*/
        unsigned char *next_packet_start = un_aln_start + packet_payload_size(current);

        /*-------------------------------------------------------------------*/
        /* End of proposed new packet.                                       */
        /*-------------------------------------------------------------------*/
        unsigned char *proposed_packet_end = aln_start + size;

        if (next_packet_start >= proposed_packet_end)
            break;
    }

    if (!current)
    { __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC); return 0; }

    free_list_remove(current);

    /*-----------------------------------------------------------------------*/
    /* Potential split 1: If the original block was sufficiently aligned, no */
    /* split is necessary.  If we do split, we must return the split part    */
    /* to the free list; however, we know we do not need to coalesce,        */
    /* because if the previous packet were free, it would already have been  */
    /* coalesced with the free packet we are about to use.                   */
    /*-----------------------------------------------------------------------*/
    if (aln_start != un_aln_start)
    {
        size_t slice_size = aln_start - un_aln_start - PACKET_OVERHEAD;
        size_t new_size = packet_payload_size(current) - slice_size - PACKET_OVERHEAD;
        PACKET *slice = current;
        set_payload_size_and_mark_free(slice, slice_size);
        aln_packet = next_packet(slice);
        set_payload_size_and_mark_used(aln_packet, new_size);
	free_list_insert(slice);
    }
    else
        aln_packet = current;

#ifdef MALLOC_GUARD
    aln_packet->guard = GUARDWORD;
#endif

    /*-----------------------------------------------------------------------*/
    /* Split 2: If the packet is large enough to split a free block off the  */
    /* end, do so.                                                           */
    /*-----------------------------------------------------------------------*/
    split(aln_packet, size);

    __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
    return &aln_packet->payload;
}

#ifndef MAX
#define MAX(a,b) ((a) > (b) ? (a) : (b))
#endif

#ifdef MALLOC_DEBUG
/*****************************************************************************/
/*									     */
/*  __TI_HEAP_STATS -  Print dynamic memory allocation statistics            */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void __TI_heap_stats(void)
{
    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    if (!memory_is_initialized) meminit();
    else __TI_data_synch_INV(&memory_is_initialized, sizeof(memory_is_initialized));

    int    free_packets      = 0;
    size_t freed	     = 0;
    size_t free_max	     = 0;
    int    allocated_packets = 0;
    size_t allocated	     = 0;
    size_t allocated_max     = 0;

    puts("Freelist:");
    PACKET *current = sys_free;
    while (current)
    {
	size_t size = packet_payload_size(current);
        size_t used = !packet_is_free(current);

        printf(">> Used:%zu size:%zu addr:%p\n", used, size, current);

        current = current->next_free;
    }
    puts("All packets:");
    current = (PACKET *)heap_start();
    while ((unsigned char *)current < heap_end())
    {
	size_t size = packet_payload_size(current);
        size_t used = !packet_is_free(current);

        printf(">> Used:%zu size:%zu addr:%p\n", used, size, current);

        if (used)
	{
	    allocated_packets++;
	    allocated += size;
	    allocated_max = MAX(allocated_max, size);
	}
	else
	{
	    free_packets++;
	    freed += size;
	    free_max = MAX(free_max, size);
	}

        current = next_packet(current);
    }

    printf("free: %zu bytes (max %zu) in %d packets; "
           "used: %zu bytes (max %zu) in %d packets; "
           "overhead: %zu bytes\n\n",
           freed, free_max, free_packets,
           allocated, allocated_max, allocated_packets,
           (free_packets + allocated_packets) * PACKET_OVERHEAD);

    fflush(stdout);

    __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
}

#endif /* MALLOC_DEBUG */

/*****************************************************************************/
/*									     */
/*  __TI_HEAP_CHECK - Check the integrity of the memory heap.  If the heap   */
/*	      is corrupt, returns the address of the corrupt header, else    */
/*	      returns 0.  Always returns 0 in release version.		     */
/*									     */
/*****************************************************************************/
_CODE_ACCESS void *__TI_heap_check(void)
{
#ifdef MALLOC_GUARD
    /*-----------------------------------------------------------------------*/
    /* It's pointless to spend the code/cycles to go through the packets     */
    /* unless we're going to actually test something.                        */
    /*-----------------------------------------------------------------------*/
    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    if (memory_is_initialized)
    {
        PACKET *packet = (PACKET *)heap_start();

        while ((unsigned char *)packet < heap_end())
        {
#ifdef MALLOC_GUARD
            if (packet->guard != GUARDWORD)
            {
#ifdef MALLOC_DEBUG
                fputs("heap_check: corrupted guard word\n", stderr);
#endif
                __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
                return (void *) &packet->guard;
            }
#endif

            packet = next_packet(packet);
        }

        __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
    }
#endif

    return NULL;
}


/*****************************************************************************/
/*									     */
/*  __TI_HEAP_TOTAL_AVAILABLE - returns the total amount of free memory      */
/*                available for	allocation.  The memory may be fragmented.   */
/*									     */
/*****************************************************************************/
_CODE_ACCESS size_t __TI_heap_total_available(void)
{
    size_t avail = 0;

    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    if (memory_is_initialized)
    {
        PACKET *packet = sys_free;

	while (packet)
	{
	    avail += packet_payload_size(packet);
	    packet = packet->next_free;
	}
    }

    __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
    return avail;
}

/*****************************************************************************/
/*									     */
/*  __TI_HEAP_LARGEST_AVAILABLE - Returns the largest payload size available.*/
/*									     */
/*****************************************************************************/
_CODE_ACCESS size_t __TI_heap_largest_available(void)
{
    size_t largest = 0;

    __TI_resource_lock(__TI_LOCK_HEAP_ALLOC);

    if (memory_is_initialized)
    {
        PACKET *packet = sys_free;

	while (packet)
	{
            largest = MAX(largest, packet_payload_size(packet));
	    packet = packet->next_free;
	}
    }

    __TI_resource_unlock(__TI_LOCK_HEAP_ALLOC);
    return largest;
}
