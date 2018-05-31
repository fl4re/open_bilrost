/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

// Status object for bilrost server
class Status {

    constructor (ref, map) {
        this.status = {
            "state": undefined,
            "description": undefined,
            "ref": ref,
            "info": {}
        };
        this.map_states_to_descriptions = map || {};
    }

    get () {
        return this.status;
    }

    get_state () {
        return this.status.state;
    }

    get_ref () {
        return this.status.ref;
    }

    set_state (state) {
        this.status.state = state;
        let description = this.map_states_to_descriptions[state];
        if (description) {
            this.status.description = description;
        }
    }

    get_info (key) {
        if (key) {
            return this.status.info[key];
        } else {
            return this.status.info;
        }
    }

    remove_info (key) {
        delete this.status.info[key];
    }

    set_info (key, value) {
        this.status.info[key] = value;
    }

}

module.exports = Status;
