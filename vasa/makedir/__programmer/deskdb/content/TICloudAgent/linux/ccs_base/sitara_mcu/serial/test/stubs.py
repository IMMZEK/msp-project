
class ImageStub:
    def __init__(self, path):
        self.path = path

class XMODEM1k:
    def __init__(self, getc, putc):
        self.getc = getc
        self.putc = putc
    
    def send(self, fstream, quiet, timeout, retry):

        while True:
            data = fstream.read(1024)
            if len(data) == 0:
                return True
            
            self.putc(data)

