/*
    This module provides functions to:
    -open a connection to a server given a host and a port
    -close the connection
    -send a given function to the server and return the server's response.

*/


// Import necessary packages for network interaction.
importPackage(java.net);
importPackage(java.io);

load(java.lang.System.getenv("SCRPITING_ROOT") + "/examples/TestServer/json2.js");


function DSSClient(host, port) {
    this.host = host;
    this.port = port;
    this.is_connected = 0;
};

//Open a connection to the server
DSSClient.prototype.open = function () {
    if (this.is_connected != 1) {
        var port = this.port;
        var host = this.host;
        print("Connecting to port [" + String(port) + "] at [" + String(host) + "]\n");

        s = new Socket(host, port);

        if (s) {
            this.connection = s;
            this.is_connected = 1;
            this.input = new BufferedReader(new InputStreamReader(this.connection.getInputStream()));
            this.output = new PrintWriter(this.connection.getOutputStream(), true);

        } else {
            this.connection = null;
            this.is_connected = 0;

            throw "Remote server at port- " + String(this.port) + " on " + String(this.host) + " seems to be down(or not started)\n";
        }

    } else {
        print("Connection already established\n");
    }
}

//Close the connection to the server
DSSClient.prototype.close = function () {
    if (this.is_connected) {
        this.connection.close();
        this.connection = null;
        this.is_connected = 0;
    } else {
        print("Connection already closed\n");
    }
}


//Send a command to the server. Returns the received message from the server. 
DSSClient.prototype.execute = function (cmd) {
    if (this.is_connected) {

        this.output.println(JSON.stringify(cmd));
        var o = this.input.readLine();
        return JSON.parse(String(o));

    } else {
        throw "Connection is not established\n";
    }
}
