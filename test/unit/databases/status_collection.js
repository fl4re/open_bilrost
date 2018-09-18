/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const status_collection = require('../../../assetmanager/databases/status_collection');

describe('Database object', function() {

    let collection;

    const alice_status = {
        ref: "alice",
        state: "VALID"
    };

    const bob_status = {
        ref: "bob",
        state: "VALID"
    };

    const where = function build_query(key, value) {
        const res = {};
        res[key] = value;
        return res;
    };

    before("create search index instance", function(done) {
        collection = status_collection("8e53db12318b48e0c8ea5b745e0806c2295dd787");
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
                .add(alice_status)
                .then(() => collection.total_docs())
                .then(total_docs => {
                    total_docs.should.equal(1);
                    done();
                })
                .catch(done);
        });

        it('#search', function(done) {
            collection
                .search(where('ref', 'alice'))
                .then(search_results => {
                    search_results.totalItems.should.equal(1);
                    search_results.items[0].should.deepEqual(alice_status);
                    done();
                })
                .catch(done);
        });

        it('#update', function(done) {
            collection
                .update("alice", { comment: 'hello' })
                .then(() => collection.get("alice"))
                .then(doc => {
                    doc.comment.should.equal('hello');
                    alice_status.comment = 'hello';
                    done();
                })
                .catch(done);
        });

        it('#get', function(done) {
            collection
                .get("alice")
                .then(document => {
                    document.should.deepEqual(alice_status);
                    done();
                })
                .catch(done);
        });

        it('#remove', function(done) {
            collection
                .remove("alice")
                .then(() => collection.total_docs())
                .then(total_docs => {
                    total_docs.should.equal(0);
                    done();
                })
                .catch(done);
        });

        describe('Search', function() {

            before("Add test statuses", function(done) {
                Promise.all([
                    collection.add(alice_status),
                    collection.add(bob_status)
                ]).then(() => done(), done);
            });

            it('searches by ref', function(done) {
                collection
                    .search(where('ref', 'alice'))
                    .then(result => {
                        const status = result.items[0];
                        status.should.deepEqual(alice_status);
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

            it('test 100 status addition one by one', function(done) {
                let promises = [];
                const ref_asset = alice_status;
                for (let i=0; i<100; i++) {
                    let status = JSON.parse(JSON.stringify(ref_asset));
                    status.ref = "/statuses/test+"+i;
                    status.state = "VALID";
                    promises.push(collection.add(status));
                }
                Promise.all(promises)
                    .then(() => collection.total_docs())
                    .then(total_docs => {
                        should.equal(total_docs, 100);
                        done();
                    })
                    .catch(done);
            });

            it('Search the 100 statuses added', function(done) {
                collection
                    .search(where('state', 'VALID'))
                    .then((search_results) => {
                        search_results.items.length.should.equal(100);
                        done();
                    })
                    .catch(done);
            });

            it('test 100 status addition by batch', function(done) {
                let statuses = [];
                const ref_asset = alice_status;
                for (let i=100; i<200; i++) {
                    let status = JSON.parse(JSON.stringify(ref_asset));
                    status.ref = "/statuses/test+"+i;
                    status.state = "VALID";
                    statuses.push(status);
                }
                collection
                    .add_batch(statuses)
                    .then(() => collection
                        .total_docs())
                    .then(total_docs => {
                        should.equal(total_docs, 200);
                        done();
                    })
                    .catch(done);
            });

            it('Search the 200 statuses added', function(done) {
                collection
                    .search(where('state', 'VALID'), { maxResults: 100 })
                    .then(search_results => {
                        search_results.items.length.should.equal(100);
                        return collection
                            .search(where('state', 'VALID'), { maxResults: 100, start: 100 })
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
