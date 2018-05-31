/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

var fs = require('fs-extra');
var should = require('should');
var restify = require('restify');
var ifs = require('../ifs');
var fixtures = process.cwd() + '/tmp/fixtures_ifs';

describe('IFS server module', function () {
    var client;
    before("start a server with IFS module", function(done) {
        var server = restify.createServer();
        server.use(restify.queryParser());
        ifs(server);
        server.listen(8781, done);
    });

    before("create fixtures", function () {
        fs.removeSync(fixtures);
        fs.mkdirSync(fixtures);
        fs.mkdirSync(fixtures + '/buit');
        fs.mkdirSync(fixtures + '/ple');
        fs.writeFileSync(fixtures + '/ple/bar.js', 'bar');
        fs.mkdirSync(fixtures + '/ple/subdir');
        fs.writeFileSync(fixtures + '/ple/subdir/index.js', 'blablabla');
        fs.writeFileSync(fixtures + '/ple/subdir/foo_1.js', 'foo');
        fs.writeFileSync(fixtures + '/ple/subdir/foo_2.js', 'foo');
        fs.writeFileSync(fixtures + '/ple/subdir/foo_3.js', 'foo');
    });

    after("remove fixtures", function (done) {
        fs.remove(fixtures, done);
    });

    before('create a client', function (done) {
        client = restify.createStringClient({url: 'http://localhost:8781', accept: 'application/json'});
        client.put('/ifs/test/' + fixtures , {}, done);
    });

    it('should get error non existing file', function (done) {
        client.get('/ifs/test/test.txt', function (err, req, res, obj) {
            should.exist(err);
            res.headers['content-type'].should.equal("application/json");
            err.statusCode.should.equal(404);
            done();
        });
    });
    it('should get metadata for existing file', function (done) {
        fs.writeFileSync(fixtures + '/test.txt', 'blablabla');
        client.get('/ifs/test/test.txt', function (err, req, res, obj) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            var file = JSON.parse(obj);
            file.id.should.equal("test.txt");
            file.fileSize.should.equal(9);
            file.fileExtension.should.equal("txt");
            file['mime-type'].should.equal("text/plain");
            done();
        });
    });
    it('should get metadata for directories', function (done) {
        client.get('/ifs/test/?name=buit', function (err, req, res, obj) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            var directory = JSON.parse(obj);
            directory.kind.should.equal( 'file-list');
            directory.items.length.should.equal(1);
            done();
        });
    });
    describe('should inform hasChildren for directories', function (done) {
        it('without content', function (done) {
            client.get('/ifs/test/?name=buit', function (err, req, res, obj) {
                should.not.exist(err);
                res.statusCode.should.equal(200);
                var directory = JSON.parse(obj);
                var dir = directory.items[0];
                dir.hasChildren.should.equal(false);
                done();
            });
        });
        it('with content', function (done) {
            client.get('/ifs/test/?name=ple', function (err, req, res, obj) {
                should.not.exist(err);
                res.statusCode.should.equal(200);
                var directory = JSON.parse(obj);
                var dir = directory.items[0];
                dir.hasChildren.should.equal(true);
                done();
            });
        });
    });

    it('should get directory items', function (done) {
        client.get('/ifs/test/', function (err, req, res, obj) {
            JSON.parse(obj).items.length.should.greaterThan(1);
            done();
        });
    });
    it('should filter by name', function (done) {
        client.get('/ifs/test/?name=test.txt', function (err, req, res, obj) {
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            var test_file = items[0];
            test_file.id.should.equal('test.txt');
            test_file.fileSize.should.equal(9);
            test_file.kind.should.equal('file');
            done();
        });
    });
/*    describe('filter by type', function () {
        it("should filter only directories", function (done) {
            client.get('/ifs/test/test?type=dir', function (err, req, res, obj) {
                var items = JSON.parse(obj).items;
                items.length.should.equal(1);
                done();
            });
        });
        it("should filter only files", function (done) {
            client.get('/ifs/test/test?name=buit&type=file', function (err, req, res, obj) {
                var items = JSON.parse(obj).items;
                items.length.should.lessThan(1);
                done();
            });
        });
    });*/
    it('should go deep', function (done) {
        client.get('/ifs/test/ple/subdir?name=index.*', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            var test_file = items[0];
            test_file.id.should.equal('index.js');
            test_file.kind.should.equal('file');
            done();
        });
    });
    it('should max results', function (done) {
        client.get('/ifs/test/ple/subdir?name=*.js&maxResults=2&start=1', function (err, req, res, obj) {
            res.headers['content-type'].should.equal("application/json");
            var result = JSON.parse(obj),
                items = result.items;
            items.length.should.equal(2);
            should.exist(result.nextLink);
            result.totalItems.should.greaterThan(2);
            done();
        });
    });
    
    //index
    it('Should find one file', function (done) {
        client.get('/ifs/test/?q=index', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            var test_file = items[0];
            test_file.id.should.equal('index.js');
            test_file.kind.should.equal('file');
            done();
        });
    });
    
    //subdir
    it('Should find one directory', function (done) {
        client.get('/ifs/test/?q=subdir', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            var test_file = items[0];
            test_file.id.should.equal('subdir');
            test_file.kind.should.equal('dir');
            done();
        });
    });
    
    //index kind: file
    it('Should find one file with "kind" macro', function (done) {
        client.get('/ifs/test/?q=index%20kind%3A%20file', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            var test_file = items[0];
            test_file.id.should.equal('index.js');
            test_file.kind.should.equal('file');
            done();
        });
    });

    //index kind: directory
    it('Should find one directory with "kind" macro', function (done) {
        client.get('/ifs/test/?q=subdir%20kind%3A%20directory', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            var test_file = items[0];
            test_file.id.should.equal('subdir');
            test_file.kind.should.equal('dir');
            done();
        });
    });

    //index kind: file OR subdir kind: directory
    it('Should find one directory or one file with "kind" macro', function (done) {
        client.get('/ifs/test/?q=index%20kind%3A%20file%20OR%20subdir%20kind%3A%20directory', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(2);
            var test_file = items[0];
            test_file.id.should.equal('subdir');
            test_file.kind.should.equal('dir');
            test_file = items[1];
            test_file.id.should.equal('index.js');
            test_file.kind.should.equal('file');
            done();
        });
    });

    //index kind: directory
    it('Should not find one file with invalid "kind" macro', function (done) {
        client.get('/ifs/test/?q=index%20kind%3A%20directory', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(0);
            done();
        });
    });

    //subdir kind: file
    it('Should not find one directory with invalid "kind" macro', function (done) {
        client.get('/ifs/test/?q=subdir%20kind%3A%20file', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(0);
            done();
        });
    });
    
    //ple/ bar
    it('Should not find one file within its sub directory', function (done) {
        client.get('/ifs/test/ple/subdir?q=bar', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(0);
            done();
        });
    });

    //mime: application/javascript
    it('Should get all javascript files with "mime" macro', function (done) {
        client.get('/ifs/test/?q=mime%3A%20application%2Fjavascript', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(5);
            done();
        });
    });

    //extension: javascript
    it('Should get all javascript files with "extension" macro', function (done) {
        client.get('/ifs/test/?q=extension%3A%20js', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(5);
            done();
        });
    });

    /* //extension: javascript
    it('Should get one file with NOT operator in the query', function (done) {
        client.get('/ifs/test/?q=NOT%20extension%3A%20js%20AND%20NOT%20kind%3A%20directory', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(1);
            done();
        });
    });

   //size: 3
    it('Should get all files equal to 3 bytes with "size" macro', function (done) {
        client.get('/ifs/test/?q=size%3A%203', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(4);
            done();
        });
    });

    //size:> 6
    it('Should get all files greater to 6 bytes with "size" macro', function (done) {
        client.get('/ifs/test/?q=size%3A%3E%206', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(2);
            done();
        });
    });

    //size:>= 9
    it('Should get all files greater or equal to 9 bytes with "size" macro', function (done) {
        client.get('/ifs/test/?q=size%3A%3E%3D%209', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(2);
            done();
        });
    });

    //size:< 3
    it('Should get all files inferior to 3 bytes with "size" macro', function (done) {
        client.get('/ifs/test/?q=size%3A%3C%203', function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(4);
            done();
        });
    });
*/
    //created: {new Date().toISOString()}
    it('Should get all files created at this time with "created" macro', function (done) {
        client.get('/ifs/test/?q='+encodeURIComponent("created:"+new Date().toISOString()), function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(0);
            done();
        });
    });

    //created:< 2040-10-21
    it('Should get all files created before 2040 this time with "created" macro', function (done) {
        client.get('/ifs/test/?q='+encodeURIComponent("created:< 2040-10-21"), function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(10);
            done();
        });
    });

    //created:.. 2000-10-21 2400-10-21
    it('Should get all files created  between 2000 and 2040  with "created" macro', function (done) {
        client.get('/ifs/test/?q='+encodeURIComponent("created:.. 2000-10-21 2400-10-21"), function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(10);
            done();
        });
    });

    //modified: {new Date().toISOString()}
    it('Should get all files created at this time with "modified" macro', function (done) {
        client.get('/ifs/test/?q='+encodeURIComponent("modified:"+new Date().toISOString()), function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(0);
            done();
        });
    });

    //modified:< 2040-10-21
    it('Should get all files modified before 2040 with "modified" macro', function (done) {
        client.get('/ifs/test/?q='+encodeURIComponent("modified:< 2040-10-21"), function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(10);
            done();
        });
    });

    //modified:.. 2000-10-21 2400-10-21
    it('Should get all files modified between 2000 and 2040 with "modified" macro', function (done) {
        client.get('/ifs/test/?q='+encodeURIComponent("modified:.. 2000-10-21 2400-10-21"), function (err, req, res, obj) {
            should.not.exist(err);
            res.headers['content-type'].should.equal("application/json");
            var items = JSON.parse(obj).items;
            items.length.should.equal(10);
            done();
        });
    });

});
