/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";
const ee = require('event-emitter');
const spawn = require('child_process').spawn;
const Status = require('../../status');
const path = require('path').posix;

const map_state_to_descriptions_status = {
    "RUNNING" : "The external process is running",
    "CLOSED" : "The external process is closed"
};

const externals_map = [];

const get = input => {
    if (input.pid) {
        const index = externals_map.findIndex(external => external.pid === input.pid);
        if (~index) {
            return [externals_map[index]];
        } else {
            return [];
        }
    } else if (input.relative_path) {
        const absolute_path = path.join(process.cwd(), input.relative_path);
        const index = externals_map.findIndex(external => external.absolute_path === absolute_path);
        if (~index) {
            return [externals_map[index]];
        } else {
            return [];
        }
    } else {
        return externals_map;
    }
};

const create = relative_path => {
    
    let emitter;

    // input => { pid: , relative_path: }
    // returns external list => [{ pid, relative_path, status }]
  
    
    // input => relative_path
    // returns external => { pid, relative_path, absolute_path, status, stream }
    const start_child_process = () => {
        const status = new Status("External_status", map_state_to_descriptions_status);
        const absolute_path = path.join(process.cwd(), relative_path);
        let stream = spawn("node", [absolute_path], { 
            cwd: process.cwd(), 
            env: process.env 
        });
        status.set_state("RUNNING");
        status.set_info("update_time", new Date().toISOString());
        stream.stdout.on('data', data => {
            status.set_state("RUNNING");
            status.set_info("update_time", new Date().toISOString());
            const output = status.get_info("data");
            const all_output = output ? output : "" + data.toString('utf8');
            status.set_info("stdout", all_output);
            emitter.emit("output", all_output);
        });

        stream.stderr.on('data', data => {
            status.set_info("update_time", new Date().toISOString());
            status.set_info("stderr", data.toString('utf8'));
            emitter.emit("error", data);
        });

        stream.on('close', code => {
            status.set_state("CLOSED");
            status.set_info("update_time", new Date().toISOString());
            status.set_info("code", code);
            emitter.emit("close", code);
        });
        Object.assign(emitter, {
            pid: stream.pid,
            relative_path: relative_path,
            absolute_path: absolute_path,
            stream: stream,
            status: status
        });
        return emitter;
    };

    // input => { pid: , relative_path }
    // returns external =>  { pid, relative_path, absolute_path, status, stream }
    const start = () => {
        let externals = get({ relative_path: relative_path });
        externals = externals.filter(external => external.status.get_state() !== "CLOSED");
        if (externals.length) {
            throw relative_path + " external process is already running!";
        } else {
            const external = start_child_process(relative_path);
            const external_index = externals_map.findIndex(ext => ext.absolute_path === external.absolute_path);
            if (~external_index) {
                externals_map[external_index] = external;
            } else {
                externals_map.push(external);
            }
            return external;
        }
    };

    // input => { pid: , relative_path }
    // returns external => { pid, relative_path, status }
    const stop = () => {
        let externals = get({
            relative_path: relative_path
        });
        externals = externals.filter(external => external.status.get_state() !== "CLOSED");
        const length = externals.length;
        if (length === 1) {
            const external = externals[0];
            external.stream.stdin.pause();
            external.stream.stdout.pause();
            external.stream.stderr.pause();
            external.stream.kill();
            external.status.set_state("CLOSED");
            external.status.set_info("update_time", new Date().toISOString());
        } else if (length > 1) {
            throw "Several externals from given input have been found!";
        }
    };

    emitter = ee({
        start: start,
        stop: stop,
        get: get
    });

    return emitter;
};

module.exports = {
    get: get,
    create: create
};
