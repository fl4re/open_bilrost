/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const Validator = require('../../../../assetmanager/validator/asset');

describe('Asset validator', function () {

    it('Check some resources are found equivalents', function (done) {
        const valid = new Validator({ adapter: {}, database: {} });
        const res = valid.are_equivalent_refs(['a.ext', 'b.ext', 'a.eXt', 'a.EXT', 'c.ext', 'C.eXt', 'a.EXt', 'a.Ext', 'd.Ext', 'a.ext', 'w.Extss']);
        should.deepEqual(res, ['a.eXt', 'a.EXT', 'a.EXt', 'a.Ext', 'a.ext', 'a.ext']);
        done();
    });

});
