/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

"use strict";

const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const bunyan = require('bunyan');
const repo_manager = require('./assetmanager/repo_manager');

//
// CONFIGURATION
//

const is_win = /^win/.test(process.platform);

const command_line_args = require('minimist')(process.argv.slice(2));

if (command_line_args.h || command_line_args.help) {
    console.log('\nusage\n-h (--help):\tthis message\n--parentPID:\tkill itself if parentPID is killed\n--modulesPath:\tpath to load local node modules');
    process.exit(0);
}

const cache_path = is_win ?
    path.join(process.env.APPDATA,'/Bilrost/Cache') :
    path.join(os.homedir(), 'Library/Bilrost/Cache');

const default_config = {
    NAME: "Bilrost",
    REST3D_SERVER: "http://localhost:3000",
    PORT: 9224,
    CACHE_PATH: cache_path
};

const config = Object.assign(default_config, process.env, command_line_args);

// Create server setting directories if they don't exist
const settings_base_path = is_win ?
    path.join(config.APPDATA,'/Bilrost/Settings') :
    path.join(os.homedir(), '/Library/Bilrost/Settings');
try {
    fs.statSync(settings_base_path);
} catch (err){
    if(err.code === 'ENOENT'){
        fs.mkdirsSync(settings_base_path);
    }
}

var logger = bunyan.createLogger({
    name: config.NAME,
    stream: process.stdout,
    level: 'info'
});
logger.info("Using rest3d server: " + config.REST3D_SERVER);
logger.info('Listening at port: %s', config.PORT);


//
// SERVER
//

const server = require('./lib/server')({
    name: config.NAME,
    log: logger
});

server.use((req, res, next) => {
    logger.info(req.method, req.url);
    next();
});

//
// CONTEXT
//

const rest3d_client = require('./lib/rest3d-client')(config.REST3D_SERVER, settings_base_path);
const cache = require('./lib/cache')(config.CACHE_PATH);
const amazon_client = require('./lib/amazon-client')(rest3d_client);

repo_manager.create({ host_vcs: 'git' })
    .get_config('protocol')
    .then(protocol => {
        const bilrost_context = {
            rest3d_client: rest3d_client,
            amazon_client: amazon_client,
            cache: cache,
            protocol: protocol ? protocol : 'https'
        };

        if (config.GIT_USERNAME && config.GIT_PASSWORD) {
            bilrost_context.credentials = {
                username: config.GIT_USERNAME,
                password: config.GIT_PASSWORD
            };
        }

        //
        //  COMPONENTS
        //
        server.get('/', (req, res, next) => {
            const version = require('./package.json').version;
            res.end('Bilrost '+ version);
        });

        require('./lib/authentication')(server, bilrost_context.rest3d_client);
        require('./ifs')(server);
        require('./contentbrowser')(server, bilrost_context);
        require('./assetmanager')(server, bilrost_context);
        require('./lib/static')(server);

        server.static({
            route: "api-ui",
            base_dir: path.join(__dirname, "static/api-ui")
        });

        //
        // START SERVER
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
            console.log("unhandledRejection");
            console.log(reason);
            console.log(promise_data);
        });

        server.listen(config.PORT, () => {
            logger.info('%s started', server.name);
        });
    });
