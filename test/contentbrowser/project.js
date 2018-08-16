/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
var should = require('should');

describe('module', function () {

    const am_project = require('../../assetmanager/project_manager');

    /* faking bilrost-client
       we define a bilrost_client that simply calls the callback with
       the predefined parameters.
       These parameters are only declared here, and they are set in
       a before clause according to what we want to test.
     */
    let err, req, res, obj;
    const bilrost_client = {
        get: (url, callback) => callback(err, req, res, obj)
    };

    describe("#get", function () {
        describe('with bilrost successful answer', function () {
            before('set bilrost answer', function () {
                err = false;
                req = null;
                res = null;
                obj = {one: 1};
            });
            it('return an object', function () {
                const project = am_project({ bilrost_client: bilrost_client });
                return project.get('fake_project_id').then((project) => {
                    should.exist(project);
                    project.should.equal(obj);
                });
            });
        });

        describe('with bilrost error answer', function () {
            before('create setting', function () {
                err = true;
                req = null;
                res = {statusCode: 500, body: "Fake explanation of why it failed."};
                obj = {one: 1};
            });
            it('return an object', function () {
                const project = am_project({ bilrost_client: bilrost_client });
                return project.get('fake_project_id').then(() => {
                    throw new Error("should have failed and it didn't");
                }, (reason) => {
                    should.exist(reason);
                    reason.message.should.equal(res.body);
                    reason.statusCode.should.equal(500);
                });
            });
            after('remove setting', function (done) {
                done();
            });
        });

    });

});
