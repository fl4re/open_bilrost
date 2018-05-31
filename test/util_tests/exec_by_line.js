/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const exec_by_line = require('../../util/exec_by_line');

describe('Exec by line module', function () {
    it('Exec git status on local directory', function (done) {
        let items = [];
        
        exec_by_line('git status', __dirname, line => {
            let item = line.split(' ');
            items.push(item);
            return item;
        })
            .then(result_list => {
                result_list.should.be.an.Array();
                should.deepEqual(result_list, items);
                done();
            })
            .catch(err => {
                done(err);
            });
    });
    
    it('Get empty list by returning null on the callback', function (done) {
        exec_by_line('git status', __dirname, line => null)
            .then(result_list => {
                result_list.should.be.empty();
                done();
            })
            .catch(err => {
                done(err);
            });
    });

});