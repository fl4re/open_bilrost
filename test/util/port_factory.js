/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const BASE_PORT = 9225;
let port_index = 0;

module.exports = () => BASE_PORT + port_index++;