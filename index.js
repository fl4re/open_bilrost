/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const bunyan = require('bunyan');

//
// CONFIGURATION
//

const name = 'Bilrost';
const version = require('./package.json').version;
const is_win = /^win/.test(process.platform);
const command_line_args = require('minimist')(process.argv.slice(2));

const INTERNAL_FOLDER_PATH = is_win ?
    path.join(process.env.APPDATA, 'Bilrost') :
    path.join(os.homedir(), 'Library/Bilrost');
const CACHE_PATH = path.join(INTERNAL_FOLDER_PATH, 'Cache');
const CONFIG_PATH = path.join(INTERNAL_FOLDER_PATH, 'Config');

try {
    fs.statSync(CONFIG_PATH);
} catch (err){
    if(err.code === 'ENOENT'){
        fs.mkdirsSync(CONFIG_PATH);
    }
}

const default_config = {
    BILROST_SERVER: "http://localhost:3000",
    PORT: 9224,
    CACHE_PATH,
    CONFIG_PATH,
    PROTOCOL: 'https',
    GIT_USERNAME: undefined,
    GIT_PASSWORD: undefined
};

const config = require('./lib/config')(default_config, CONFIG_PATH, process.env, command_line_args);

var logger = bunyan.createLogger({
    name,
    stream: process.stdout,
    level: 'info'
});
logger.info("Using bilrost server: " + config.BILROST_SERVER);
logger.info('Listening at port: %s', config.PORT);

//
// SERVER
//

const server = require('./lib/server')({
    name,
    log: logger
});

server.use((req, res, next) => {
    logger.info(req.method, req.url);
    next();
});

//
// CONTEXT
//

const bilrost_client = require('./lib/bilrost-client')(config.BILROST_SERVER, CONFIG_PATH);
const cache = require('./lib/cache')(config.CACHE_PATH);
const favorite = require('./lib/favorite')(config.CONFIG_PATH);
const amazon_client = require('./lib/amazon-client')(bilrost_client);

const version_control_system_context = {
    bilrost_client,
    amazon_client,
    cache,
    favorite,
    get protocol () {
        return config.PROTOCOL;
    },
    credentials: {
        get username () {
            return config.GIT_USERNAME;
        },
        get password () {
            return config.GIT_PASSWORD;
        }
    }
};

//
//  COMPONENTS
//

server.get('/', (req, res, next) => {
    res.end('Bilrost '+ version);
    next();
});

require('./lib/static')(server);

require('./authentication')(server, bilrost_client);
require('./config')(server, config);
require('./controllers')(server, version_control_system_context);

server.static({
    route: "api-ui",
    base_dir: path.join(__dirname, "static/api-ui")
});

//
// ERROR LISTENERS
// TODO: USE LOGGER
//

process.on('uncaughtException', function(err) {
    if(err.errno === 'EADDRINUSE') {
        logger.error('Some other server is using port %s -> bye bye !', config.PORT);
    } else {
        logger.error('uncaughtException: ' + err.message);
        logger.error('stack:');
        logger.error(err.stack);
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise_data) => {
    // eslint-disable-next-line no-console
    console.log("unhandledRejection");
    // eslint-disable-next-line no-console
    console.log(reason);
    // eslint-disable-next-line no-console
    console.log(promise_data);
});

//
// START SERVER
//

server.listen(config.PORT, () => {
    logger.info('%s started', server.name);
});
