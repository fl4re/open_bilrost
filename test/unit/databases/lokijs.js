/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const loki = require('../../../assetmanager/databases/lokijs');

const deep_clone = obj => JSON.parse(JSON.stringify(obj));

describe('Database object', function() {

    let db_instance;

    const level_1_1_0 = {
        ref: 'level'
    };

    const prefab_1_1_0 = {
        ref: 'prefab'
    };

    const where = function build_query(key, value) {
        const res = {};
        res[key] = value;
        return res;
    };

    before("create search index instance", function(done) {
        db_instance = loki("8e53db12318b48e0c8ea5b745e0806c2295dd787");
        db_instance.get_adapter()
            .then(db => should.exist(db))
            .then(() => done(), done);
    });

    after("Reset database", function() {
        return db_instance.get_collection('test').close();
    });

    describe("has singleton db connection", function() {
        let db_instance_2;

        before(function(done) {
            db_instance_2 = loki("8e53db12318b48e0c8ea5b745e0806c2295dd787");
            db_instance_2.get_adapter()
                .then(() => done(), done);
        });

        it("returns same database for different objects sharing guid", function(done) {
            Promise.all([db_instance.get_adapter(), db_instance_2.get_adapter()])
                .then(dbs => {
                    let db1 = dbs[0];
                    let db2 = dbs[1];
                    db1.should.equal(db2);
                    done();
                })
                .catch(done);
        });
    });

    describe("#get_collection", () => {
        it('returns a collection', () => {
            const col = db_instance.get_collection('test');
            (typeof col.total_docs).should.equal('function');
            (typeof col.add).should.equal('function');
            (typeof col.search).should.equal('function');
            (typeof col.update).should.equal('function');
            (typeof col.remove).should.equal('function');
        });
        it("creates a new collection if collection doesn't exist", () => {
            const col = db_instance.get_collection('brand_new');
            (typeof col.total_docs).should.equal('function');
            (typeof col.add).should.equal('function');
            (typeof col.search).should.equal('function');
            (typeof col.update).should.equal('function');
            (typeof col.remove).should.equal('function');
        });
    });

    describe('collection', function() {
        let collection;
        before(() => {
            collection = db_instance.get_collection('test');
        });

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
                .add(deep_clone(level_1_1_0))
                .then(() => db_instance.get_collection('test').total_docs())
                .then(total_docs => {
                    total_docs.should.equal(1);
                    done();
                })
                .catch(done);
        });

        it('#search', function(done) {
            collection
                .search(where('ref', 'level'))
                .then(search_results => {
                    search_results.totalItems.should.equal(1);
                    delete search_results.items[0].$loki;
                    delete search_results.items[0].meta;
                    search_results.items[0].should.deepEqual(level_1_1_0);
                    done();
                })
                .catch(done);
        });

        it('#update', function(done) {
            collection
                .update("level", { comment: 'hello' })
                .then(() => db_instance.get_collection('test').get("level"))
                .then(doc => {
                    doc.comment.should.equal('hello');
                    level_1_1_0.comment = 'hello';
                    done();
                })
                .catch(done);
        });

        it('#get', function(done) {
            collection
                .get("level")
                .then(document => {
                    delete document.$loki;
                    delete document.meta;
                    document.should.deepEqual(level_1_1_0);
                    done();
                })
                .catch(done);
        });

        it('#get', function(done) {
            collection
                .get("test")
                .then(() => {
                    done();
                })
                .catch(done);
        });

        it('#remove', function(done) {
            collection
                .remove("level")
                .then(() => db_instance.get_collection('test').total_docs())
                .then(total_docs => {
                    total_docs.should.equal(0);
                    done();
                })
                .catch(done);
        });

        describe('Search', function() {

            before("Add test docs", function(done) {
                Promise.all([
                    collection.add(level_1_1_0),
                    collection.add(prefab_1_1_0)
                ]).then(() => done(), done);
            });

            it('searches by ref', function(done) {
                collection
                    .search(where('ref', 'level'))
                    .then(result => {
                        const doc = result.items[0];
                        delete doc.$loki;
                        delete doc.meta;
                        doc.should.deepEqual(level_1_1_0);
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
                        return db_instance
                            .get_collection('test')
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

            before("Flush database", () => db_instance.get_collection('test').flush());

            it('test 100 doc addition one by one', function(done) {
                let promises = [];
                const ref_doc = level_1_1_0;
                for (let i=0; i<100; i++) {
                    let doc = JSON.parse(JSON.stringify(ref_doc));
                    doc.ref = "/docs/test+"+i;
                    doc.info = "/resources/test";
                    promises.push(collection.add(doc));
                }
                Promise.all(promises)
                    .then(() => collection
                        .total_docs()
                    )
                    .then(total_docs => {
                        should.equal(total_docs, 100);
                        done();
                    })
                    .catch(done);
            });

            it('Search the 100 docs added', function(done) {
                collection
                    .search(where('info', '/resources/test'))
                    .then((search_results) => {
                        search_results.items.length.should.equal(100);
                        done();
                    })
                    .catch(done);
            });

            it('test 100 doc addition by batch', function(done) {
                let docs = [];
                const ref_doc = level_1_1_0;
                for (let i=100; i<200; i++) {
                    let doc = JSON.parse(JSON.stringify(ref_doc));
                    doc.ref = "/docs/test+"+i;
                    doc.info = "/resources/test";
                    docs.push(doc);
                }
                collection
                    .add_batch(docs)
                    .then(() => db_instance
                        .get_collection('test')
                        .total_docs())
                    .then(total_docs => {
                        should.equal(total_docs, 200);
                        done();
                    })
                    .catch(done);
            });

            it('Search the 200 docs added', function(done) {
                collection
                    .search(where('info', '/resources/test'), { maxResults: 100 })
                    .then(search_results => {
                        search_results.items.length.should.equal(100);
                        return db_instance
                            .get_collection('test')
                            .search(where('info', '/resources/test'), { maxResults: 100, start: 100 })
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
