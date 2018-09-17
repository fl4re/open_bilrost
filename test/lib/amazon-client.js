/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const should = require('should');
const amazon_client = require('../../lib/amazon-client');
const start_bilrost_client = require('../util/local_bilrost_client');

describe('amazon-client', function() {

    let amazon;
    before('Init bilrost', function(done) {
        this.timeout(20000);
        start_bilrost_client()
            .then(bilrost_client => {
                bilrost_client.set_session_id("1234");
                amazon = amazon_client(bilrost_client);
                done();
            });
    });

    it('Simple client', function(done) {
        const input = {
            method: 'post',
            path: '56dsagdsfadasant8684ujnuolrydasdsd8wqeqwe'
        };
        amazon.simple_client(input)
            .then(req => {
                req.on('result', res => {
                    should.equal(res.statusCode, 405);
                    done();
                });
                req.end();
            }).catch(done);
    });


    it('XML client', function(done) {
        const hash = 'c6535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a';
        const input = {
            method: 'post',
            path: hash,
            queries: {
                uploads: ''
            },
            headers: {
                'x-amz-acl': 'public-read',
                'Content-Disposition': 'attachment; filename=' + hash,
                'Content-Type': 'application/octet-stream'
            }
        };
        amazon.xml_client(input)
            .then(parsed_xml_to_json => {
                should.exists(parsed_xml_to_json.InitiateMultipartUploadResult);
                done();
            }).catch(done);
    });


});
