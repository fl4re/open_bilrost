/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*
 This function converts a node callback function to a promise.
 I don't understand why there is no such function in standard node.
 */
function promisify(f) {
    var g = function () {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function (fulfill, reject) {
            var callback = function (err) {
                if (err) {return reject(err);}
                var args2 = Array.prototype.slice.call(arguments, 1);
                fulfill.apply(undefined, args2);
            };
            args.push(callback);
            f.apply(undefined, args);
        });
    };
    return g;
}

module.exports = promisify;
