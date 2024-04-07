/******************************************************************************
*                                                             \  ___  /       *
*                                                               /   \         *
* Edison Design Group C++ Runtime                            - | \^/ | -      *
*                                                               \   /         *
*                                                             /  | |  \       *
* Copyright 1992-2017 Edison Design Group Inc.                   [_]          *
*                                                                             *
******************************************************************************/
/*
Redistribution and use in source and binary forms are permitted
provided that the above copyright notice and this paragraph are
duplicated in all source code forms.  The name of Edison Design
Group, Inc. may not be used to endorse or promote products derived
from this software without specific prior written permission.
THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
Any use of this software is at the user's own risk.
*/
/*

set_new_handler routine to allow the user to affect the behavior of the
default operator new() when memory cannot be allocated.

*/

#include "basics.h"
#include "runtime.h"
#pragma hdrstop

#ifndef NULL
#define NULL 0
#endif /* ifndef NULL */

/*
If the runtime should be defined in the std namespace, open
the std namespace.
*/
#ifdef __EDG_RUNTIME_USES_NAMESPACES
namespace std {
#endif /* ifdef __EDG_RUNTIME_USES_NAMESPACES */

/*** START TI ADD ***/
new_handler get_new_handler() THROW_NOTHING()
/*
Get _new_handler if it exists, otherwise return __default_new_handler
*/
{
  return _new_handler != NULL ? _new_handler : __default_new_handler;
}
/*** END TI ADD ***/

new_handler set_new_handler(new_handler handler) THROW_NOTHING()
/*
Set _new_handler to the new function pointer provided and return the
previous value of _new_handler.
*/
{
  new_handler rr = _new_handler;
  _new_handler = handler;
  return rr;
}  /* set_new_handler */

/*
If the runtime should be defined in the std namespace, close
the std namespace.
*/
#ifdef __EDG_RUNTIME_USES_NAMESPACES
}  /* namespace std */
#endif /* ifdef __EDG_RUNTIME_USES_NAMESPACES */

/******************************************************************************
*                                                             \  ___  /       *
*                                                               /   \         *
* Edison Design Group C++ Runtime                            - | \^/ | -      *
*                                                               \   /         *
*                                                             /  | |  \       *
* Copyright 1992-2017 Edison Design Group Inc.                   [_]          *
*                                                                             *
******************************************************************************/
