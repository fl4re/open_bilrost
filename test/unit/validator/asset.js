/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const should = require('should');
const Validator = require('../../../assetmanager/validator/asset');
const valid = new Validator({ adapter: {}, database: {} });

describe('Asset validator', function() {

    it('Check some resources are found equivalents #1', function(done) {
        const res = valid.are_equivalent_refs([
            'a.ext',
            'b.ext',
            'a.eXt',
            'a.EXT',
            'C.eXt',
            'c.ext',
            'a.EXt',
            'a.Ext',
            'd.Ext',
            'a.ext',
            'w.Extss'
        ]);
        should.deepEqual(res, [
            'a.ext',
            'a.eXt',
            'a.EXT',
            'a.EXt',
            'a.Ext',
            'a.ext',
            'c.ext',
            'C.eXt'
        ]);
        done();
    });

    it('Check some resources are found equivalents #2', function(done) {
        const deps = [
            "/resources/a/b/1.png",
            "/resources/a/b/2.png",
            "/resources/a/b/3.png",
            "/resources/a/b/4.png",
            "/resources/a/b/5.png",
            "/resources/a/b/6.png",
            "/resources/a/c/a/1.png",
            "/resources/a/c/a/2.png",
            "/resources/a/c/a/1.PNG",
            "/resources/a/c/a/3.png",
            "/resources/a/c/a/4.png",
            "/resources/a/c/a/5.png",
            "/resources/a/c/a/6.png",
            "/resources/a/c/a/7.png",
            "/resources/a/c/a/8.png",
            "/resources/a/c/a/9.png",
            "/resources/a/c/a/10.png",
            "/resources/a/d/1.jpeg",
            "/resources/a/d/2.jpeg",
            "/resources/a/d/3.jpeg",
            "/resources/a/d/1.JPEG",
            "/resources/a/d/4.jpeg",
            "/resources/a/e/1.test",
            "/resources/a/e/2.test",
            "/resources/a/f/1.gc",
            "/resources/a/f/2.random",
            "/resources/a/f/3.random",
            "/resources/a/f/4.random",
            "/resources/a/f/5.random",
            "/resources/a/f/fivE.rAndom",
            "/resources/a/f/Five.ranDom",
            "/resources/a/f/7.random",
            "/resources/a/f/4.raNdom",
            "/resources/a/f/a/1.tga",
            "/resources/a/f/a/2.tga",
            "/resources/a/f/a/3.tga",
            "/resources/a/f/a/1.TGa",
            "/resources/a/f/a/4.png",
            "/resources/a/f/a/5.png",
            "/resources/a/f/a/6.test",
            "/resources/a/f/a/7.test",
            "/resources/a/f/a/8.test",
            "/resources/a/f/a/10.test",
            "/resources/a/f/a/11.TGA",
            "/resources/a/f/a/12.tga",
            "/resources/a/f/a/13.TGA",
            "/resources/a/f/a/14.tga",
            "/resources/a/f/a/15.TGA",
            "/resources/a/f/a/11.tga",
            "/resources/a/f/a/16.TGA",
            "/resources/a/f/a/17.tga",
            "/resources/a/f/1.random",
            "/resources/a/f/2.random",
            "/resources/a/g/1.xml",
            "/resources/a/g/a/1.png",
            "/resources/a/g/a/1.ttf",
            "/resources/a/g/a/2.png",
            "/resources/a/g/a/3.png",
            "/resources/a/g/a/4.png",
            "/resources/a/g/a/5.png",
            "/resources/a/g/a/6.png",
            "/resources/a/g/a/7.png",
            "/resources/a/g/a/8.ico",
            "/resources/a/g/a/9.png",
            "/resources/a/g/a/10.png",
            "/resources/a/g/a/11.png",
            "/resources/a/g/a/12.png",
            "/resources/a/g/a/13.PNG",
            "/resources/a/g/a/14.png",
            "/resources/a/g/a/15.png",
            "/resources/a/g/a/16.png",
            "/resources/a/g/a/17.gif",
            "/resources/a/g/a/18.png",
            "/resources/a/g/a/17.GiF",
            "/resources/a/g/a/19.png",
            "/resources/a/g/a/20.png",
            "/resources/a/g/a/21.png",
            "/resources/a/g/a/22.png",
            "/resources/a/g/a/23.png",
            "/resources/a/h/1.csv",
            "/resources/a/h/2.csv",
            "/resources/a/h/3.Csv",
            "/resources/a/h/1.csv",
            "/resources/a/i/1.png",
            "/resources/a/j/1.png",
            "/resources/a/j/2.Png",
            "/resources/a/j/1.pmg",
            "/resources/a/j/3.png"
        ];
        const res = valid.are_equivalent_refs(deps);
        should.deepEqual(res, [
            '/resources/a/c/a/1.PNG',
            '/resources/a/c/a/1.png',
            '/resources/a/d/1.JPEG',
            '/resources/a/d/1.jpeg',
            '/resources/a/f/4.random',
            '/resources/a/f/4.raNdom',
            '/resources/a/f/a/1.tga',
            '/resources/a/f/a/1.TGa',
            '/resources/a/f/a/11.tga',
            '/resources/a/f/a/11.TGA',
            "/resources/a/f/fivE.rAndom",
            "/resources/a/f/Five.ranDom",
            '/resources/a/g/a/17.GiF',
            '/resources/a/g/a/17.gif'
        ]);
        done();
    });

});
