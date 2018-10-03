/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const fs = require('fs-extra');
const should = require('should');
const fixture = require('../util/fixture')('unit_favorite');
const favorite = require('../../lib/favorite')(fixture.get_config_path());

describe('Favorite object', function() {
    const favorite_path = favorite.get_path();
    const example_1 = {
        name: 'example_1',
        file_uri: 'file:///a/b/example_1'
    };

    const example_2 = {
        name: 'example_2',
        file_uri: 'file:///a/b/example2'
    };

    after('Flush favorite list', done => {
        fs.removeSync(favorite_path);
        done();
    });

    describe('Adding', async () => {
        it('Add example1 workspace to favorite list', async () => {
            await favorite.add(example_1);
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, [example_1]);
        });
        it('Dont add workspace with same name', async () => {
            try {
                await favorite.add(example_1);
            } catch (err) {
                if (err.statusCode !== 403) {
                    throw err;
                }
            }
        });
        it('Add example2 workspace to favorite list', async () => {
            await favorite.add(example_2);
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, [example_1, example_2]);
        });
    });

    describe('Removing', () => {
        it('removes a workspace by file_uri', async () => {
            await favorite.remove(example_2.file_uri);
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, [example_1]);
        });
        it('doesnt complain removing unexisting workspaces', async () => {
            await favorite.remove(example_2.file_uri);
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, [example_1]);
        });
    });

    describe('Finding', () => {
        it('finds by name', async () => {
            const found_workspace = await favorite.find_by_name(example_1.name);
            should.deepEqual(found_workspace, example_1);
        });
        it('finds by file_uri', async () => {
            const found_workspace = await favorite.find_by_file_uri(example_1.file_uri);
            should.deepEqual(found_workspace, example_1);
        });
    });

    describe('Updating', () => {
        it('change name', async () => {
            const new_example = {
                name: 'example_3'
            };
            await favorite.update(example_1.name, new_example);
            new_example.file_uri = example_1.file_uri;
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, [new_example]);
            example_1.name = new_example.name;
        });
        it('change file uri', async () => {
            const new_example = {
                file_uri: 'file:///a/b/example4'
            };
            await favorite.update(example_1.file_uri, new_example);
            new_example.name = example_1.name;
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, [new_example]);
        });
    });

    describe('Flushing', () => {
        it('flush', async () => {
            await favorite.flush();
            should.deepEqual(fs.readJsonSync(favorite_path).favorite, []);
        });
    });

});
