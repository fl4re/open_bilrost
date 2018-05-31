/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const restify = require('restify');
const xml2js = require('xml2js');
const promisify = require('../util/promisify');

const xml_parser = new xml2js.Parser();
const xml_builder = new xml2js.Builder();

module.exports = rest3d_client => {

    const create_amazon_client = url => restify.createClient({
        url: url
    });

    const call_request = (input, is_xml_client) => new Promise((resolve, reject) => {
        let method = input.method.toLowerCase();
        const signing_input = {
            method: method.toUpperCase(),
            headers: input.headers || {},
            queries: input.queries || {},
            hash: input.path,
            id: input.id
        };
        const amazon_input = {
            headers: input.headers
        };
        if (method === 'delete') {
            method = 'del';
        }
        const request_callback = (err, req) => {
            if (err) {
                reject(err);
            } else {
                if (is_xml_client) {
                    req.on('result', (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        let body = '';
                        res.setEncoding('utf8');
                        res.on('data', chunk => {
                            body += chunk;
                        });

                        res.on('end', () => {
                            promisify(xml_parser.parseString)(body)
                                .then(json => {
                                    if (json && json.Error) {
                                        throw json;
                                    }
                                    return json;
                                })
                                .then(resolve, reject);
                        });
                    });
                    if (input.payload) {
                        const xml_payload = xml_builder.buildObject(input.payload);
                        req.write(xml_payload);
                    }
                    req.end();
                } else {
                    resolve(req);
                }
            }
        };

        rest3d_client.post('/warehouse/signed_url', signing_input, (err, req, res, obj) => {
            if (err || !obj.signed_url) {
                reject(err || "Couldn't retrieve the signed url to use for reaching amazon out");
            }
            const amazon_client = create_amazon_client(obj.signed_url);
            amazon_client[method](amazon_input, request_callback);
        });
    });

    return {
        simple_client : call_request,
        xml_client: input => call_request(input, true)
    };
};
