/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*
 This function converts a JSON object, also sanitizing it.
 */

function stringify (t) {
    return JSON.stringify(t, (k, v) => { if (v === undefined) { return null; } return v; }, 4); 
}

module.exports = stringify;
