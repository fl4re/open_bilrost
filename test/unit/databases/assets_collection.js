/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const assets_collection = require('../../../assetmanager/databases/assets_collection');

describe('Database object', function() {

    let collection;

    const level_1_1_0 = {
        "meta":{
            "ref": "/assets/test_1_1_0.level",
            "type": "application/vnd.bilrost.level+json",
            "created": "2016-03-16T14:41:10.384Z",
            "modified": "2016-03-18T10:54:05.870Z",
            "author": "",
            "version":"1.1.0"
        },
        "comment": "This is a test asset!",
        "tags": ["TEST"],
        "main": "/resources/test",
        "dependencies": [
            "/resources/test/test"
        ],
        "semantics": []
    };

    const prefab_1_1_0 = {
        "meta":{
            "ref": "/assets/prefab/test_1_1_0.prefab",
            "type": "application/vnd.bilrost.prefab+json",
            "created": "2016-03-16T14:41:10.384Z",
            "modified": "2016-03-18T10:54:05.870Z",
            "author": "",
            "version":"1.1.0"
        },
        "comment": "This is a test asset!",
        "tags": ["TEST"],
        "main": "/resources/prefab/test",
        "dependencies": [
            "/resources/test/prefab/test"
        ],
        "semantics": []
    };

    const where = function build_query(key, value) {
        const res = {};
        res[key] = value;
        return res;
    };

    before("create search index instance", function(done) {
        collection = assets_collection("8e53db12318b48e0c8ea5b745e0806c2295dd787");
        collection.get_adapter()
            .then(db => should.exist(db))
            .then(() => done(), done);
    });

    after("Reset database", function() {
        return collection.close();
    });

    describe('collection', function() {
        it('#total_docs', function(done) {
            collection
                .total_docs()
                .then(total_docs => {
                    total_docs.should.equal(0);
                    done();
                })
                .catch(done);
        });

        it('#add', function(done) {
            collection
                .add(level_1_1_0)
                .then(() => collection.total_docs())
                .then(total_docs => {
                    total_docs.should.equal(1);
                    done();
                })
                .catch(done);
        });

        it('#search', function(done) {
            collection
                .search(where('ref', '/assets/test_1_1_0.level'))
                .then(search_results => {
                    search_results.totalItems.should.equal(1);
                    search_results.items[0].should.deepEqual(level_1_1_0);
                    done();
                })
                .catch(done);
        });

        it('#update', function(done) {
            collection
                .update("/assets/test_1_1_0.level", { comment: 'hello' })
                .then(() => collection.get("/assets/test_1_1_0.level"))
                .then(doc => {
                    doc.comment.should.equal('hello');
                    level_1_1_0.comment = 'hello';
                    done();
                })
                .catch(done);
        });

        it('#get', function(done) {
            collection
                .get("/assets/test_1_1_0.level")
                .then(document => {
                    document.should.deepEqual(level_1_1_0);
                    done();
                })
                .catch(done);
        });

        it('#remove', function(done) {
            collection
                .remove("/assets/test_1_1_0.level")
                .then(() => collection.total_docs())
                .then(total_docs => {
                    total_docs.should.equal(0);
                    done();
                })
                .catch(done);
        });

        describe('Search', function() {

            before("Add test assets", function(done) {
                Promise.all([
                    collection.add(level_1_1_0),
                    collection.add(prefab_1_1_0)
                ]).then(() => done(), done);
            });

            it('searches by ref', function(done) {
                collection
                    .search(where('ref', '/assets/test_1_1_0.level'))
                    .then(result => {
                        const asset = result.items[0];
                        asset.should.deepEqual(level_1_1_0);
                        done();
                    })
                    .catch(done);
            });

            it('searches by main', function(done) {
                collection
                    .search(where('main', '/resources/test'))
                    .then(result => {
                        const asset = result.items[0];
                        asset.should.deepEqual(level_1_1_0);
                        done();
                    })
                    .catch(done);
            });

            it('searches by dependencies', function(done) {
                collection
                    .search({
                        dependencies: {
                            $contains: '/resources/test/test'
                        }
                    })
                    .then(result => {
                        const asset = result.items[0];
                        asset.should.deepEqual(level_1_1_0);
                        done();
                    })
                    .catch(done);
            });

            it('searches by namespace', function(done) {
                collection
                    .search(where('namespace', '/assets/prefab/'))
                    .then(result => {
                        const asset = result.items[0];
                        asset.should.deepEqual(prefab_1_1_0);
                        done();
                    })
                    .catch(done);
            });

            it('Pagination', function(done) {
                collection
                    .search({}, { maxResults: 1 })
                    .then((search_results) => {
                        search_results.totalItems.should.equal(2);
                        search_results.items.length.should.equal(1);
                        return collection

                            .search({}, { maxResults: 1, start: 1 })
                            .then((search_results) => {
                                search_results.totalItems.should.equal(2);
                                search_results.items.length.should.equal(1);
                                done();
                            });
                    })
                    .catch(done);
            });

        });

        describe('Performance tests', function() {

            before("Flush database", () => collection.flush());

            it('test 100 asset addition one by one', function(done) {
                let promises = [];
                const ref_asset = level_1_1_0;
                for (let i=0; i<100; i++) {
                    let asset = JSON.parse(JSON.stringify(ref_asset));
                    asset.meta.ref = "/assets/test+"+i;
                    asset.main = "/resources/test+"+i;
                    promises.push(collection.add(asset));
                }
                Promise.all(promises)
                    .then(() => collection.total_docs())
                    .then(total_docs => {
                        should.equal(total_docs, 100);
                        done();
                    })
                    .catch(done);
            });

            it('Search the 100 assets added', function(done) {
                collection
                    .search(where('version', '1.1.0'))
                    .then((search_results) => {
                        search_results.items.length.should.equal(100);
                        done();
                    })
                    .catch(done);
            });

            it('test 100 asset addition by batch', function(done) {
                let assets = [];
                const ref_asset = level_1_1_0;
                for (let i=100; i<200; i++) {
                    let asset = JSON.parse(JSON.stringify(ref_asset));
                    asset.meta.ref = "/assets/test+"+i;
                    asset.main = "/resources/test+"+i;
                    assets.push(asset);
                }
                collection
                    .add_batch(assets)
                    .then(() => collection
                        .total_docs())
                    .then(total_docs => {
                        should.equal(total_docs, 200);
                        done();
                    })
                    .catch(done);
            });

            it('Search the 200 assets added', function(done) {
                collection
                    .search(where('version', '1.1.0'), { maxResults: 100 })
                    .then(search_results => {
                        search_results.items.length.should.equal(100);
                        return collection
                            .search(where('version', '1.1.0'), { maxResults: 100, start: 100 })
                            .then(search_results => {
                                search_results.items.length.should.equal(100);
                                done();
                            });
                    })
                    .catch(done);
            });

        });

    });

});
