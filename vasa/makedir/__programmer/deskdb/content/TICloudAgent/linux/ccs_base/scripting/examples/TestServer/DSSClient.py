import socket
import json

class DSSClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.is_connected = 0

    def open(self):
        if(self.is_connected!=1):
            print("Connecting to port ["+str(self.port)+"] at ["+str(self.host)+"]\n")
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((self.host,self.port))
            if(s):
                self.connection = s
                self.is_connected = 1
            else:
                self.connection = None
                self.is_connected = 0
                raise Exception("Remote server at port- "+str(self.port)+" on "+str(self.host)+" seems to be down(or not started)\n")
        else:
            print("Connection already established\n")
        
    def close(self):
        if(self.is_connected):
            self.connection.close()
            self.connection = None
            self.is_connected=0
        else:
            print("Connection already closed\n")
            
    def execute(self,cmd):
        if(self.is_connected):
            temp = json.dumps(cmd)+"\n"
            cmd_json = temp.encode('UTF-8')
            self.connection.sendall(cmd_json)
            result = self.connection.recv(1024)
            return json.loads(result)
        else:
            print("Connection is not established")
            return None
            
