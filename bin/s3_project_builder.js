/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const program = require('commander');
const fs = require('fs-extra');
const crypto = require('crypto');
const recursive = require('recursive-readdir');
const Path = require('path').posix;
const promisify = require('../util/promisify');
const utilities = require('../assetmanager/utilities');

const to_posix = path => path.replace(/\\/g, '/');
const get_recursive_paths = (path, ignored_file) => promisify(recursive)(path, [ignored_file]);
const read_file = path => promisify(fs.readFile)(path);
const write_file = (path, content) => promisify(fs.outputFile)(path, content);
const build_absolute_path = relative => Path.join(to_posix(process.cwd()),to_posix(relative));
const build_relative_path = (absolute, base) => Path.relative(base, absolute);
const build_identity_file_path = (identity_file_relative, output_relative, base) => Path.join(base, output_relative, identity_file_relative);
const build_file_to_s3_directory_path = (relative, base) => Path.join(base, relative);
const build_hash_with_buffer = content => crypto.createHash('sha256').update(content).digest('hex');
const format_identity_content = hash => JSON.stringify({ hash: hash }, null, 4);
const format_definition_file = deps => JSON.stringify({ dependencies: deps }, null, 4);
const copy_and_rename_file_to_upload_to_s3 = (resource_absolute, output_directory) => new Promise((resolve, reject) => {
    const fd_hash = fs.createReadStream(resource_absolute);
    const fd_write_file = fs.createReadStream(resource_absolute);
    const hash = crypto.createHash('sha256');
    hash.setEncoding('hex');
    hash.on('error', reject);
    hash.on('finish', () => {
        const read_hash = hash.read();
        fd_write_file.on('error', reject);
        fd_write_file.on('end', () => {
            // eslint-disable-next-line no-console
            console.log('Wrote ' + Path.join(output_directory, read_hash) + ' s3 file!');
            resolve(read_hash);
        });
        fd_write_file.pipe(fs.createWriteStream(Path.join(output_directory, read_hash)));
    });
    fd_hash.pipe(hash);
});

const generate_file_to_upload_to_s3 = (resource_absolute, output_relative, base) => {
    const directory_path_with_file_to_upload = build_file_to_s3_directory_path(output_relative, base);
    return copy_and_rename_file_to_upload_to_s3(resource_absolute, directory_path_with_file_to_upload);
};

const generate_identity_file = (resource_absolute, output_relative, base) => read_file(resource_absolute)
    .then(build_hash_with_buffer)
    .then(hash => {
        const resource_relative = build_relative_path(resource_absolute, base);
        const identity_file = build_identity_file_path(resource_relative, output_relative, base);
        return write_file(identity_file, format_identity_content(hash))
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('Wrote ' + Path.join(output_relative, resource_relative) + ' identity file!');
            });
    });

program
    .version('0.0.1')
    .option('-P, --pwd <relative>', 'Specify [relative] path of the folder to parse from this location', build_absolute_path, process.cwd())
    .option('-I, --ignore <filename>', 'Specify a [file name] to ignore from building process', '.bilrost')
    .option('-O, --output <relative>', 'Specify [relative] path of the build file from pwd location', '.bilrost/resources');

program
    .command('build-identity')
    .description('Build recursively identity resources')
    .action(() => {
        const base = program.pwd;
        const output_relative = program.output;
        const ignored_filename = program.ignore;
        get_recursive_paths(base, ignored_filename)
            .then(resource_absolutes => resource_absolutes.reduce((sequence, resource_absolute) => sequence
                .then(() => generate_identity_file(to_posix(resource_absolute), to_posix(output_relative), base)), Promise.resolve()))
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('done!');
            })
            // eslint-disable-next-line no-console
            .catch(console.error);
    });


program
    .command('build-s3')
    .description('Build recursively resources to upload to s3')
    .action(() => {
        const base = program.pwd;
        const output_relative = program.output;
        const ignored_filename = program.ignore;
        get_recursive_paths(base, ignored_filename)
            .then(resource_absolutes => resource_absolutes.reduce((sequence, resource_absolute) => sequence
                .then(() => generate_file_to_upload_to_s3(to_posix(resource_absolute), to_posix(output_relative), base)), Promise.resolve()))
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('done!');
            })
            // eslint-disable-next-line no-console
            .catch(console.error);
    });

program
    .command('build-folder-asset')
    .description('Build json definition from a folder')
    .option('-w, --workspace <workspace_relative>')
    .action(options => {
        const base = program.pwd;
        const output_relative = program.output;
        const ignored_filename = program.ignore;
        const output_absolute = Path.join(base, output_relative);
        const workspace_relative = build_absolute_path(options.workspace);
        get_recursive_paths(base, ignored_filename)
            .then(resource_absolutes => {
                const refs = resource_absolutes.map(resource_absolute => utilities.absolute_path_to_ref(resource_absolute, workspace_relative));
                const content = format_definition_file(refs);
                return write_file(output_absolute, content);
            })
            .then(() => {
            // eslint-disable-next-line no-console
                console.log('done!');
            })
            // eslint-disable-next-line no-console
            .catch(console.error);
    });

program
    .command('help')
    .description("display this help.")
    .action(() => {
        // eslint-disable-next-line no-console
        console.info('identity resource CLI  v', program.version());
        program.help();
    });

program.parse(process.argv);
