/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const spawn = require('child_process').spawn;
const readline = require('readline');
const supertest = require('supertest');

module.exports = {
    start: () => new Promise(resolve => {
        const server = spawn('node', ['index']);
        const stop = () => new Promise(resolve => {
            server.kill('SIGINT');
            server.on('close', () => resolve());
        });
        const client = supertest('http://localhost:9224');
        readline.createInterface({ input: server.stdout })
            .on('line', line => {
                let msg;
                try {
                    msg = JSON.parse(line).msg;
                } catch(e) {
                    // eslint-disable-next-line no-console
                    console.log(line.toString());
                }
                if (msg === 'Listening at port: 9224') {
                    resolve({
                        client,
                        stop
                    });
                }
            });
    })
};
