/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const sanitize = require("sanitize-filename");

var Validator = require('jsonschema');

Validator = new Validator.Validator();

Validator.attributes.is_date = instance => {
    if (typeof instance !== 'string') {
        if(instance !== null) {
            return;
        }
    } else {
        let date = Date.parse(instance);
        if (isNaN(date)) {
            return 'The date is invalid';
        }
    }
};

Validator.attributes.is_ref = instance => {
    if (typeof instance !== 'string') {
        return 'ref should be typed of String';
    }
    if (!/^\/(assets)\/.*/.test(instance)) {
        return 'Ref is invalid as it doesnt start with "/assets/" suffix';
    }
    instance.split('/').forEach(value => {
        let result = sanitize(value);
        if( result !== value ) {
            return value+' is invalid, '+result+' would be accepted instead';
        }
    });

};

const workspace_schema = {
    "id": "/workspaces",
    "type": "object",
    "properties": {
        "name": {
            "type":"string",
            "pattern": sanitize.regularExpression
        },
        "version": {
            "type":"string",
            "pattern": /^[0-9.]*$/
        },
        "guid": {
            "type":"string",
            "pattern": /^[a-zA-Z0-9]{40}$/
        },
        "host": {
            "type":"string",
            "pattern": /^github$/
        },
        "pushed_at": {
            "type": ["string", "null"],
            "is_date": ""
        },
        "created_at": {
            "type": "string",
            "is_date": ""
        },
        "updated_at": {
            "type": ["string", "null"],
            "is_date": ""
        },
        "author": {
            "type": "string",
            "pattern": /^[[\w/.-]{0,100}$/
        },
        "description": {
            "type": "string"
        },
        "file_uri": {
            "type": "string",
        },
        "tags": {
            "type": "array",
            "uniqueItems": true
        },
        "subscriptions": {
            "type": "array",
            "uniqueItems": true
        },
        "stage": {
            "type": "array",
            "uniqueItems": true
        }
    },
    required: ["name", "guid", "created_at", "pushed_at", "updated_at",
        "file_uri", "version", "tags", "subscriptions", "stage"]
};

const project_schema = {
    "id": "/projects",
    "type": "object",
    "properties": {
        "name": {
            "type":"string",
            "pattern": sanitize.regularExpression
        },
        "full_name": {
            "type":"string",
            "pattern": /^[[\w/.-]{0,100}$/
        },
        "url": {
            "type":"string"
        },
        "pushed_at": {
            "type": ["string", "null"],
            "is_date": ""
        },
        "created_at": {
            "type": "string",
            "is_date": ""
        },
        "updated_at": {
            "type": "string",
            "is_date": ""
        },
        "author": {
            "type": "string",
            "pattern": /^[[\w/.-]{0,100}$/
        },
        "description": {
            "type": "object"
        },
        "file_uri": {
            "type": "string",
        },
        "tags": {
            "type": "array",
            "uniqueItems": true
        },
        "subscriptions": {
            "type": "array",
            "uniqueItems": true
        },
        "stage": {
            "type": "array",
            "uniqueItems": true
        }
    },
    required: [ "name", "full_name", "url",
        "pushed_at", "created_at", "updated_at"]
};

const Workspace = function Workspace(workspace_adapter, get_internal_file_path) {
    const that = {};
    // Valid this workspace by looking file mime types of assets and folder structure
    const is_valid_by_stats = () => {

        // parse .bilrost folder
        return workspace_adapter.readdir('/' +  get_internal_file_path())
            .then(file_stats => {
                let valid_count = 0;
                for (let i=0; i<file_stats.length; i++){
                    if (
                        (file_stats[i].name === 'workspace' && !file_stats[i].isDirectory()) ||
                        (file_stats[i].name === 'project' && !file_stats[i].isDirectory()) ||
                        (file_stats[i].name === 'assets' && file_stats[i].isDirectory())
                    ) {
                        valid_count ++;
                    }
                }

                // checks if there are workspace and project resources and assets folder in .bilrost
                if (valid_count === 3) {
                    return;
                } else {
                    throw get_internal_file_path() +
                        " folder is corrupted, there should be workspace resource, project resource and assets folder";
                }
            }).catch(e => {
                throw { error : JSON.stringify(e) };
            });

    };

    // Validate this workspace by parsing the workspace resource
    const is_valid_by_workspace_resource = () => {
        // TODO retrieve resource from workpsace model
        const valid = Validator.validate(workspace_adapter.readJsonSync(get_internal_file_path('workspace')), workspace_schema);
        if (!valid.errors.length) {
            return true;
        } else {
            throw { error : JSON.stringify(valid.errors) };
        }
    };

    // Validate this workspace by parsing the project resource
    const is_valid_by_project_resource = () => {
        const valid = Validator.validate(workspace_adapter.readJsonSync(get_internal_file_path('project')), project_schema);
        if (!valid.errors.length) {
            return true;
        } else {
            throw { error : JSON.stringify(valid.errors) };
        }
    };

    that.run_workspace_validation = () => {
        return Promise.all([
            is_valid_by_stats(),
            is_valid_by_workspace_resource(),
            is_valid_by_project_resource()
        ]);
    };

    return that;
};

module.exports = Workspace;
