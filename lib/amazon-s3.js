/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');
const ee = require('event-emitter');

const promisify = require('../util/promisify');

// Units
const KB = 1024;
const MB = 1024 * KB;
//const GB = 1024 * MB;

const retrieve_file_size = file_path => promisify(fs.stat)(file_path)
    .then(stats => stats.size);

const build_hash = path => new Promise((resolve, reject) => {
    const fd_hash = fs.createReadStream(path);
    const hash = crypto.createHash('sha256');
    hash.setEncoding('hex');
    hash.on('error', reject);
    hash.on('finish', () => {
        const read_hash = hash.read();
        resolve(read_hash);
    });
    fd_hash.on('error', reject);
    fd_hash.pipe(hash);
});

const get_missing_numbers = (array, last) => {
    if (array.length) {
        const first = 1;
        const missing_numbers = [];
        // before the array:
        for (let i = first; i < array[0]; i++) {
            missing_numbers.push(i);
        }
        // inside the array:
        for (let i = 1; i < array.length; i++) {
            for (let j = 1 + array[i-1]; j < array[i]; j++) {
                missing_numbers.push(j);
            }
        }
        // after the array:
        for (let i = 1 + array[array.length - 1]; i <= last; i++) {
            missing_numbers.push(i);
        }
        return missing_numbers;
    } else {
        return Array(last)
            .fill()
            .map((value, index) => index + 1);
    }
};

module.exports = (amazon_client, cache, config) => {

    const simple_client = amazon_client.simple_client;
    const xml_client = amazon_client.xml_client;

    const max_parts = config && config.max_parts || 100;
    const max_uploads = config && config.max_uploads || 1000;
    const chunk_size = config && config.chunk_size || 6 * MB;
    const nb_workers = config && config.nb_workers || 4;
    const up_coefficient = config && config.up_coefficient || 2;

    if (up_coefficient <= 1) {
        throw 'Upload coefficient must be above 1';
    }

    const exists = key => simple_client({
        method: 'head',
        path: key
    }).then(req => new Promise((resolve, reject) => {
        req.on('result', (err, res) => {
            const status_code = res.statusCode;
            if (err || status_code !== 200) {
                reject(err || "Resource doesn't exist");
            } else {
                resolve();
            }
        });
        req.end();
    }));

    const really_download = (key, location_path) => simple_client({
        method: 'get',
        path: key,
        id: 'download'
    })
        .then(req => fs.ensureDir(cache.get_path())
            .then(() => new Promise((resolve, reject) => {
                console.log('Download', location_path, ' resource...');
                const write_stream = fs.createWriteStream(cache.get_tmp_path(key));
                req.on('result', (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    res.pipe(write_stream);
                    write_stream.on('finish', () => {
                        console.log('Done!');
                        resolve();
                    });
                });
                req.end();
            })))
        .then(() => build_hash(cache.get_tmp_path(key)))
        .then(hash => {
            if (hash === key) {
                return promisify(fs.rename)(cache.get_tmp_path(key), cache.get_path(key))
                    .then(() => promisify(fs.copy)(cache.get_path(key), location_path));
            } else {
                return promisify(fs.unlink)(cache.get_tmp_path(key))
                    .then(() => {
                        throw "Pulled resource is corrupted";
                    });
            }
        });

    const download = (key, location_path) => promisify(fs.mkdirs)(path.dirname(location_path))
        .then(() => cache.exist(key))
        .then(() => cache.read(key, location_path), () => really_download(key, location_path))
        .then(() => build_hash(location_path))
        .then(hash => {
            if (hash !== key) {
                throw 'Final hash after copying from cache is invalid';
            }
        })
        .catch(err => {
            if (err.statusCode === 404) {
                throw key + " resource not found in amazon storage";
            } else {
                throw err;
            }
        });

    const simple_upload = (file_path, key, file_size) => ({
        id: 'simple',
        start: () => simple_client({
            method: 'put',
            path: key,
            headers: {
                'Content-Length': file_size.toString()
            }
        })
            .then(req => new Promise((resolve, reject) => {
                req.on('result', (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    let body = '';
                    res.on('data', data => {
                        body += data;
                    });
                    res.on('end', () => {
                        console.log(file_path, 'uploaded!');
                        resolve(body);
                    });
                });
                const read_stream = fs.createReadStream(file_path);
                read_stream.pipe(req);
            }))
            .then(body => cache.exist(key)
                .then(() => {}, () => cache.write(key, file_path)
                    .then(() => build_hash(cache.get_path(key)))
                    .then(hash => {
                        if (hash !== key) {
                            return promisify(fs.unlink)(cache.get_path(key))
                                .then(() => {
                                    throw "Something went wrong when copying resource to cache";
                                });
                        }
                    }))
                .then(() => body)),
        abort: () => {}
    });

    const multipart_upload = (file_path, key, file_size) => {

        let upload_id, total_uploaded, emitter;

        if (file_size < chunk_size) {
            throw {
                code: 1,
                message: 'File size to slice is smaller than configured chunk size'
            };
        }
        let num_chunks = Math.ceil(file_size / chunk_size);

        const list_uploads = marker_number => {
            const queries = {
                uploads: '',
                'max-uploads': max_uploads
            };
            if (marker_number) {
                queries['upload-id-​marker'] = marker_number;
            }
            return xml_client({
                method: 'get',
                path: '',
                queries: queries
            }).then(output => {
                const xml_uploads = (output.ListMultipartUploadsResult && output.ListMultipartUploadsResult.Upload) || [];
                const is_truncated = output.ListMultipartUploadsResult && output.ListMultipartUploadsResult.IsTruncated[0];
                const uploads = xml_uploads.map(xml_upload => ({
                    key: xml_upload.Key[0],
                    id: xml_upload.UploadId[0]
                }));
                if (is_truncated === "true") {
                    const marker_number = output.ListMultipartUploadsResult.NextUploadIdMarker[0];
                    return list_uploads(marker_number)
                        .then(new_uploads => uploads.concat(new_uploads));
                } else {
                    return uploads;
                }
            }).then(uploads => uploads.sort((a, b) => new Date(b.date) - new Date(a.date)));
        };


        const init_multipart_upload = () => xml_client({
            method: 'post',
            path: key,
            queries: {
                uploads: ''
            },
            headers: {
                'x-amz-acl': 'public-read',
                'Content-Disposition': 'attachment; filename=' + key,
                'Content-Type': 'application/octet-stream'
            }
        }).then(output => {
            const upload_id = output.InitiateMultipartUploadResult.UploadId[0];
            return upload_id;
        });

        const abort_multipart_upload = () => xml_client({
            method: 'delete',
            path: key,
            queries: {
                uploadId: upload_id
            }
        });

        const upload_part = (part_number, chunk_stream, size) => simple_client({
            method: 'put',
            path: key,
            queries: {
                uploadId: upload_id,
                partNumber: part_number
            },
            headers: {
                'Content-Length': size.toString()
            }
        }).then(req => new Promise((resolve, reject) => {
            req.on('result', (err, res) => {
                if (err) {
                    reject(err);
                }
                let body = '';
                res.on('data', data => {
                    body += data;
                });
                res.on('end', () => {
                    resolve(res.headers.etag);
                });
            });
            chunk_stream.pipe(req);
        }));

        const complete_multipart_upload = parts => xml_client({
            method: 'post',
            path: key,
            queries: {
                uploadId: upload_id
            },
            payload: {
                CompleteMultipartUpload: {
                    Part: parts
                }
            }
        });

        const get_parts = marker_number => {
            const queries = {
                uploadId: upload_id,
                'max-parts': max_parts
            };
            if (marker_number) {
                queries['part-number-marker'] = marker_number;
            }
            return xml_client({
                method: 'get',
                path: key,
                queries: queries
            }).then(output => {
                const size_without_last_chunk = (num_chunks-1) * chunk_size;
                const xml_parts = output.ListPartsResult.Part || [];
                const is_truncated = output.ListPartsResult.IsTruncated[0];
                const parts = xml_parts.map(xml_part => {
                    const part_number = parseInt(xml_part.PartNumber[0], 10);
                    const part_size = parseInt(xml_part.Size[0], 10);
                    const etag = xml_part.ETag[0];
                    if (part_number !== num_chunks && part_size !== chunk_size) {
                        throw {
                            code: 2,
                            message: 'Chunk n' + part_number + ' corrupted!'
                        };
                    } else if (part_number === num_chunks && file_size !== size_without_last_chunk + part_size) {
                        throw {
                            code: 2,
                            message: 'Final chunk is corrupted because its size doesnt match with final file size.'
                        };
                    }
                    return {
                        PartNumber: part_number,
                        ETag: etag,
                        Size: part_size
                    };
                });
                if (is_truncated === "true") {
                    const marker_number = output.ListPartsResult.NextPartNumberMarker[0];
                    return get_parts(marker_number)
                        .then(new_parts => parts.concat(new_parts));
                } else {
                    return parts;
                }
            });
        };

        const upload_parts = parts => {
            let upload_lazy_promises = [];
            const sort_parts = () => parts.sort((a, b) => a.PartNumber - b.PartNumber);
            const build_upload_lazy_promise = (part_number, part_size, chunk_stream) => () => {
                console.log('Start to upload part ' + part_number + '...');
                emitter.emit('begin_part');
                return upload_part(part_number, chunk_stream, part_size)
                    .then(etag => {
                        total_uploaded += part_size;
                        console.log('Uploaded part ' + part_number + '!');
                        emitter.emit('progress', {
                            loaded: total_uploaded,
                            total: file_size
                        });
                        parts.push({
                            PartNumber: part_number,
                            ETag: etag
                        });
                    });
            };
            const call_lazy_promises = () => {
                let upload_all_promises = [];
                let start = 0;
                let end = nb_workers;
                while (start < upload_lazy_promises.length) {
                    upload_all_promises.push(upload_lazy_promises.slice(start, end));
                    start += nb_workers;
                    end += nb_workers;
                }
                return upload_all_promises
                    .reduce((all_promises_so_far, arr) => all_promises_so_far
                        .then(() => Promise.all(arr.map(call_upload_promise => call_upload_promise()))), Promise.resolve());
            };

            total_uploaded = parts.reduce((total, part) => total + part.Size, 0);

            let part_numbers = parts.map(part => part.PartNumber);
            let missing_part_numbers = get_missing_numbers(part_numbers, num_chunks);

            upload_lazy_promises = missing_part_numbers.map(missing_part_number => {
                let end;
                const start = (missing_part_number - 1) * chunk_size;
                if (missing_part_number === num_chunks) {
                    end = file_size;
                } else {
                    end = start + chunk_size;
                }
                const part_size = end - start;
                const chunk_stream = fs.createReadStream(file_path, { start: start, end: end });
                return build_upload_lazy_promise(missing_part_number, part_size, chunk_stream);
            });

            return call_lazy_promises()
                .then(sort_parts);
        };

        const start = () => list_uploads()
            .then(list => {
                const upload_to_resume = list.find(upload => upload.key === key);
                if (upload_to_resume) {
                    upload_id = upload_to_resume.id;
                    console.log('Resume upload ' + upload_id);
                    return get_parts();
                } else {
                    return init_multipart_upload()
                        .then(id => {
                            upload_id = id;
                            return [];
                        });
                }
            })
            .then(parts => upload_parts(parts))
            .then(parts => parts.map(part => {
                delete part.Size;
                return part;
            }))
            .then(parts => complete_multipart_upload(parts))
            .then(() => cache.exist(key)
                .then(() => {}, () => cache.write(key, file_path)
                    .then(() => build_hash(cache.get_path(key)))
                    .then(hash => {
                        if (hash !== key) {
                            return promisify(fs.unlink)(cache.get_path(key))
                                .then(() => {
                                    throw "Something went wrong when copying resource to cache";
                                });
                        }
                    })));

        const abort = () => abort_multipart_upload();

        emitter = ee({
            id: 'multipart',
            start: start,
            abort: abort
        });

        return emitter;
    };

    const upload = (file_path, key) => retrieve_file_size(file_path)
        .then(size => {
            const coefficient = size / chunk_size;
            if (coefficient < up_coefficient) {
                return simple_upload(file_path, key, size);
            } else {
                return multipart_upload(file_path, key, size);
            }
        });

    return {
        download,
        exists,
        simple_upload,
        multipart_upload,
        upload
    };
};
