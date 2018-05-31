/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
  This file is required from the mocha.opts file, this file is use to specify default
  mocha options.
  This setup.js should be used for any initialization common to all tests.
 */
'use strict';

const fs = require('fs-extra');
const Path = require('path').posix;
console.log('Mocha setup');

fs.removeSync(Path.join(process.cwd(), 'tmp'));
fs.mkdirpSync(Path.join(process.cwd(), 'tmp'));

// Print stack trace for debugging
global.debug = true;
