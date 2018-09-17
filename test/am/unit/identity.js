/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const _path = require('path').posix;
const fs = require('fs-extra');
const should = require('should');

const identity = require('../../../assetmanager/identity');
const workspace_utilities = require('../../../assetmanager/workspace_utilities')(p => _path.join('.bilrost', p ? p : '/'));
const s = require('stream');

describe("Identity", function() {

    it('Get resource hash', function(done) {
        const hash_example = 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a';
        const ref = "/resources/a/b.json";
        const ifs_adapter = {
            readJson: path => {
                if (path === '.bilrost' + ref) {
                    return Promise.resolve({
                        hash: hash_example
                    });
                }
            }
        };
        const id = identity(ifs_adapter, undefined, workspace_utilities);
        id.get_resource_hash(ref)
            .then(hash => {
                should.equal(hash, hash_example);
                done();
            })
            .catch(done);
    });

    it('build and stage identity files', function(done) {
        let success_count = 0;
        const add_path = "/added/a.json";
        const modified_path = "/modified/m.json";
        const removed_path = "/removed/r.json";
        const ifs_adapter = {
            readJson: path => {
                if (path === add_path) {
                    return Promise.resolve('foo');
                } else if (path === modified_path) {
                    return Promise.resolve('bar');
                }
            },
            outputFormattedJson: path => {
                if (path === '.bilrost/resources' + add_path) {
                    success_count ++;
                    return Promise.resolve();
                } else if (path === '.bilrost/resources' + modified_path) {
                    success_count ++;
                    return Promise.resolve();
                }
            },
            removeFile: path => {
                if (path === '.bilrost/resources' + removed_path) {
                    success_count ++;
                    return Promise.resolve();
                }
            },
            createReadStream: path => {
                const stream = new s.Readable();
                let value = '';
                if (path === add_path) {
                    value = 'foo';
                } else if (path === modified_path) {
                    value = 'bar';
                }
                stream.push(value);
                stream.push(null);
                return stream;
            }
        };
        const git_repo_manager = {
            add_files: file_paths => {
                file_paths.forEach(path => {
                    if (path === '.bilrost/resources' + add_path) {
                        success_count ++;
                        return Promise.resolve();
                    } else if (path === '.bilrost/resources' + modified_path) {
                        success_count ++;
                        return Promise.resolve();
                    }
                });
            },
            remove_files: file_paths => {
                file_paths.forEach(path => {
                    if (path === '.bilrost/resources' + removed_path) {
                        success_count ++;
                        return Promise.resolve();
                    }
                });
            }
        };
        const list_parent_assets = () => Promise.resolve([
            '/assets/foo'
        ]);
        const id = identity(ifs_adapter, git_repo_manager, workspace_utilities, list_parent_assets);
        const commitable_files = {
            add_paths: [add_path],
            mod_paths: [modified_path],
            del_paths: [removed_path]

        };
        id.build_and_stage_identity_files(commitable_files)
            .then(() => {
                should.equal(success_count, 6);
                done();
            }).catch(done);
    });

    it('build and stage identity files with a resource removal which is referenced by two assets', function(done) {
        let success_count = 0;
        const removed_path = "/removed/r.json";
        const ifs_adapter = {
            removeFile: path => {
                if (path === '.bilrost/resources' + removed_path) {
                    success_count ++;
                    return Promise.resolve();
                }
            }
        };
        const git_repo_manager = {
            add_files: () => {},
            remove_files: file_paths => {
                file_paths.forEach(path => {
                    if (path === '.bilrost/resources' + removed_path) {
                        success_count ++;
                        return Promise.resolve();
                    }
                });
            }
        };
        const list_parent_assets = () => Promise.resolve([
            '/assets/foo',
            '/assets/bar'
        ]);
        const id = identity(ifs_adapter, git_repo_manager, workspace_utilities, list_parent_assets);
        const commitable_files = {
            add_paths: [],
            mod_paths: [],
            del_paths: [removed_path]

        };
        id.build_and_stage_identity_files(commitable_files)
            .then(() => {
                should.equal(success_count, 1);
                done();
            }).catch(done);
    });

    it('Compare identity file', function(done) {
        const unchanged_path = "/unchanged/a.json";
        const modified_path = "/modified/m.json";
        const removed_path = "/removed/r.json";
        const add_ref = '/resources/' + unchanged_path;
        const modified_ref = '/resources/' + modified_path;
        const removed_ref = '/resources/' + removed_path;
        const ifs_adapter = {
            readJson: path => {
                if (path === unchanged_path) {
                    return Promise.resolve('unchanged');
                } else if (path === modified_path) {
                    return Promise.resolve('modified');
                } else {
                    return Promise.resolve('renamed');
                }
            },
            createReadStream: () => fs.createReadStream('/dsadsadsafaf')
        };
        const git_repo_manager = {};
        const id = identity(ifs_adapter, git_repo_manager, workspace_utilities);
        Promise.all([
            id.compare(add_ref),
            id.compare(modified_ref)
        ]).then(res => {
            const unchanged = res[0];
            const modified = res[0];
            should.equal(unchanged, true);
            should.equal(modified, false);
            return id.compare(removed_ref);
        }).then(() => {
            done('This comparaison shouldnt be valid!');
        })
            .catch(err => {
                err.code.should.equal(2);
                done();
            });

    });

});
