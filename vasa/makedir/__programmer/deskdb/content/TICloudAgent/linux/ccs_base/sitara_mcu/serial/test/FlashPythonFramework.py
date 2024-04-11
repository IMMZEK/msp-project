import sys


FP_TRACE_LEVEL_FATAL   = 3
FP_TRACE_LEVEL_ERROR   = 2
FP_TRACE_LEVEL_WARNING = 1
FP_TRACE_LEVEL_INFO    = 0

class FlashPythonInstance:
    '''Stub for FlashPythonInstance to be used for testing.'''

    def __init__(self, server):
        return

    def update_progress(self, message, percentage):
        assert(type(message) == str)  #This is needed. If message type isn't string, Uniflash hangs
        print(f'update_progress("{message}", {percentage}%)')
    
    def push_message(self, message, trace_level):
        
        print(f'push_message("{message}",', end=' ')

        if trace_level == FP_TRACE_LEVEL_INFO:
            print('FP_TRACE_LEVEL_INFO', end='')
        elif trace_level == FP_TRACE_LEVEL_WARNING:
            print('FP_TRACE_LEVEL_WARNING', end='')
        elif trace_level == FP_TRACE_LEVEL_ERROR:
            print('FP_TRACE_LEVEL_ERROR', end='')
        elif trace_level == FP_TRACE_LEVEL_FATAL:
            print('FP_TRACE_LEVEL_FATAL', end='')
        else:
            assert(False)

        print(')')

        if trace_level in [FP_TRACE_LEVEL_ERROR, FP_TRACE_LEVEL_FATAL]:
            sys.exit()
        