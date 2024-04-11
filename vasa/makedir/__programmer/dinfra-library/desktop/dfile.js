// Copyright (C) 2015-2017 Texas Instruments Incorporated - http://www.ti.com/
const stream = require('stream');
const events = require('events');
const npath = require('path');
const fs = require('fs');
const util = require('util');
const denum = require('./denum');
const STATE = denum.cardinals(
    'END',
    'STEP',
    'STAT',
    'DIR');

util.inherits(FileTreeStepper, events.EventEmitter);

/**
 * A FileTreeStepper allows you to efficiently step through a
 * file tree one entry at a time without loading the whole tree
 * into memory.  Each node reports its results with a "stat" event
 * called with (path, lstat).  The next node will not report until
 * next() is called, until finally an "end" event is issued.  The
 * event event is also used to report errors.  The next() call will
 * have no effect once the "end" event has been issued.   Internally
 * this works as a stack and stack machine.  Note that directories
 * are listed prior to their children and there are no "." or ".."
 * entries reported.  The current implementation lists directory
 * contents in unicode general collating order (ie. not by locale),
 * in order to be consistent with the output of name-ordered
 * ResourceQuery.
 *
 * A straight scan of 300000 nodes with each node reported using
 * a synchronous console.log() call will take about 180s on typical
 * Linux hardware, 90s if cached.
 *
 * The choice of lexical order versus directory order just determines
 * whether the directory entries immediately follow the directories
 * themselves.  In directory order, they do, in lexical order, they
 * appear in their character code order (of the total path, ignorant
 * of directory transitions).
 *
 * @param root - the path to the root directory
 * @param lexicalOrder - true for lexical order results, false for directory.
 */
function FileTreeStepper(root, lexicalOrder) {
    events.EventEmitter.call(this);

    this.root = root; 
    this.stack = [[""], 0];
    this.state = STATE.STEP;
    this.lexicalOrder = !!lexicalOrder;
}

/*
    Sort the directory list in the same order as the database would
    return it.

    When the add parameter is used it assumes the list is already sorted
    and it adds the add parameter to it.
*/
FileTreeStepper.prototype.sortDirList = function (list, add) {
    return (denum.stringSort(list, add));
}

FileTreeStepper.prototype.openReadable = function(path) {
    return (fs.createReadStream(this.root + path));
}

FileTreeStepper.prototype.nextOrder = function (path, stat) {
    if (this.lexicalOrder) {
        if (!stat.isSymbolicLink() && stat.isDirectory()) {
            // insert a dir marker in the sort list ...
            this.sortDirList(this.stack[this.stack.length - 3],
                npath.basename(path) + "/");
        }

        this.stack.pop(); // pop the path off
        this.state = STATE.STEP;

        return (this.emit('result', path, stat));
    }

    if (!stat.isSymbolicLink() && stat.isDirectory()) {
        // insert a dir marker in the sort list ...
        this.stack.pop(); // pop the path off
        this.stack.push(path + "/"); // add the dir slash
        this.state = STATE.DIR;
    }
    else {
        this.stack.pop(); // pop the path off
        this.state = STATE.STEP;
    }

    return (this.emit('result', path, stat));
}

FileTreeStepper.prototype.nextResolve = function (path, stat) {
    if (!stat.isSymbolicLink()) {
        return (this.nextOrder(path, stat));
    }

    return (fs.readlink(this.root + path, function (error, target) {
            if (error != null) {
                this.state = STATE.END;
                return (this.emit('error', error));
            }

            stat.target = target;

            return (this.nextOrder(path, stat));
        }.bind(this)));
}

FileTreeStepper.prototype.next = function () {
    if (this.state === STATE.END) {
        // do nothing
        return;
    }

    if (this.state === STATE.STAT) {
        var path = this.stack[this.stack.length - 1];

        return (fs.lstat(this.root + path, function (error, stat) {
                if (error != null) {
                    this.state = STATE.END;
                    return (this.emit('error', error));
                }

                return (this.nextResolve(path, stat));
            }.bind(this)));
    }

    if (this.state === STATE.DIR) {
        var path = this.stack[this.stack.length - 1];

        return (fs.readdir(this.root + path, function (error, list) {
                if (error != null) {
                    this.state = STATE.END;
                    this.emit('error', error);
                }
                else {
                    this.sortDirList(list);
                    this.stack.push(list);
                    this.stack.push(0);
                    this.state = STATE.STEP;

                    this.next();
                }
            }.bind(this)));
    }

    if (this.state === STATE.STEP) {
        var stack = this.stack;

        if (stack.length == 0) {
            this.step = STATE.END;
            return (this.emit('end')); // no error
        }

        if (stack.length < 2) {
            throw new denum.StateError();
        }

        var peek = stack.length - 1;
        var index = stack[peek];
        var list = stack[peek - 1];

        if (index >= list.length) {
            this.stack.pop();
            this.stack.pop();
            this.stack.pop();

            return (this.next());
        }

        var prefix;

        if (stack.length > 2) {
            prefix = stack[peek - 2];
        }
        else {
            prefix = "";
        }

        var name = list[index++];
        var path = prefix + name;

        if (name.indexOf("/") >= 0) {
            stack.push(path);
            stack[peek] = index;
            this.state = STATE.DIR;

            return (this.next());
        }

        stack.push(path);
        stack[peek] = index;
        this.state = STATE.STAT;

        return (this.next());
    }

    throw new denum.StateError("unsuported state " + this.state);
}

exports.FileTreeStepper = FileTreeStepper;

