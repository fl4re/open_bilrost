/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const fs = require('fs-extra');
const Path = require('path');
const os = require('os');

const errors = require('../lib/errors')('favorite');

const ConfProvider = require('nconf').Provider;
const nconf = new ConfProvider();
const configPath =/^win/.test(process.platform)?
    Path.join(process.env.APPDATA,'/Bilrost/Config/workspaces.json'):
    Path.join(os.homedir(), '/Library/Bilrost/Config/workspaces.json');

//init "itsWorkspaces" nconf instance by creating the file if doesn't exist
try {
    fs.statSync(configPath);
} catch (err) {
    if (err.code === 'ENOENT') {
        fs.outputJsonSync(configPath, { favorite:[] });
    }
}
nconf.file(configPath);

const list = () => {
    const all = nconf.get("favorite");
    return all ? all : [];
};

const nconf_save = function () {
    return new Promise(function (resolve, reject) {
        nconf.save(err => err ? reject(err) : resolve());
    });
};

/*
 This save function is made reentrant because nconf is not.
 If nconf save is called twice then the json saved may be corrupted.
 Reentrancy is accomplished by memoizing the previous save
 operation as a Promise and only executing the current save
 when the previous has succeeded.
 */
let previous_save_operation = Promise.resolve();
const save = (list) => {
    nconf.set("favorite", list);
    return previous_save_operation.then(() => {
        previous_save_operation = nconf_save();
        return previous_save_operation;
    });
};

const _workspace_name_regex = /^[[\w\/\.-]{0,100}$/;
const _workspace_file_uri_regex = /^file:\/\/\/.*$/;

module.exports = () => {

    const favorite = {

        list,

        find_by_file_uri (file_uri) {
            return list().find(item => item.file_uri === file_uri);
        },

        find_by_name (name) {
            return list().find(item => item.name === name);
        },

        find (identifier) {
            if (typeof identifier === 'string') {
                if (_workspace_name_regex.test(identifier)) {
                    return favorite.find_by_name(identifier);
                } else if (_workspace_file_uri_regex.test(identifier)) {
                    return favorite.find_by_file_uri(identifier);
                }
            }
        },

        add (item) {
            const favorite_list = list();
            if (!favorite_list.find(favorite => favorite.name === item.name)) {
                favorite_list.push(item);
                return save(favorite_list);
            } else {
                return Promise.reject(errors.ALREADYEXIST('Workspace name'));
            }
        },

        update (identifier, object) {
            const favorite_list = list();
            let index_in_favorite_list;
            const object_to_update = favorite_list.find(function (element, index) {
                for (let z=0, keys=Object.keys(element); z<keys.length; z++){
                    if (element[keys[z]]===identifier){
                        index_in_favorite_list = index;
                        return element;
                    }
                }
            });
            if (object_to_update) {
                favorite_list[index_in_favorite_list] = Object.assign(object_to_update, object);
            } else {
                return Promise.reject("Favorite item to update not found");
            }
            return save(favorite_list);
        },

        remove (identifier) {
            const favorite_list = list().filter(element => !Object.keys(element).find(key => element[key] === identifier));
            return save(favorite_list);
        },

        flush () {
            return save([]);
        }

    };

    return favorite;
};
