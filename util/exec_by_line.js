/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const exec = require('child_process').exec;
const errors = require('../lib/errors')("Exec by line");

const max_buffer = 1024 * 1024 * 50; //50MB in case of operations that involves many files

const exec_by_line = (command, cwd, filter) => new Promise((resolve, reject) => {
    exec(command, { cwd: cwd, maxBuffer: max_buffer }, (error, stdout, stderr) => {
        if (error) {
            reject(errors.INTERNALERROR(error));
        } else if (stderr) {
            const lines = stderr.split('\n').filter(line => !line.includes('warning') || !line.includes('The file will have its original line endings'));
            if (errors.length) {
                reject(errors.INTERNALERROR(lines.join('\n')));
            }
        } else {
            resolve(stdout.split('\n').reduce((lines, line) => {
                const filtered_output = filter(line);
                if (filtered_output) {
                    lines.push(filtered_output);
                }
                return lines;
            }, []));
        }
    });
});

module.exports = exec_by_line;
