IFS API

Inside Rest3d we need a way to browse remote server files, local work directory files or git trees. Therefore we need an API that allows to list (with filter) directories, get files (metadata or content), and put files in a virtualized file system that will eventually map to any of the above.

Other rest3d modules are responsible of creating/registering a fs base url (/ifs/{id}), for example when creating a workspace we may refer to /ifs/ws12345. By now we are not going to specify how you create or register these ifs id. 

This API is going to follow rest principles, using http verbs, url to resources, …

When getting/puttings files, file metadata will be passed by HTTP Headers, and file content in the body.

When getting folder contents, the body representation will be JSON.

Then once we have an /ifs/{id} uri, we can:

<table>
  <tr>
    <td>Method</td>
    <td>HTTP request</td>
    <td>Description</td>
  </tr>
  <tr>
    <td>get</td>
    <td>GET  /ifs/{id}{file_path}</td>
    <td>Gets a file's data. (ex. /ifs/1234/texture/cat.jpg)</td>
  </tr>
  <tr>
    <td>list</td>
    <td>GET  /ifs/{id}{dir_path}</td>
    <td>Lists the given ifs files. 
(ex. /ifs/1234/textures)</td>
  </tr>
</table>




## GET  /ifs/{id}{file_path}

When file_path is a file.

#### Request

<table>
  <tr>
    <td>/ifs</td>
    <td>Is a fixed strings that routes to IFS module</td>
  </tr>
  <tr>
    <td>{id}</td>
    <td>Is the fs id (for example could be project_id or workspace_id). To be defined later. It can not include slash.</td>
  </tr>
  <tr>
    <td>{file_path}</td>
    <td>Is the path of the file we want to get. Note that it includes the leading slash (/), and can include as many slash as needed.</td>
  </tr>
</table>


It doesn’t take any query string.

#### Response

Response body contains the file data.

File metadata is returned in the following HTTP headers:

<table>
  <tr>
    <td>Last-Modified</td>
    <td>Indicates the date and time at which the file was modified. Server time.</td>
  </tr>
  <tr>
    <td>ETag</td>
    <td>Non-cryptographic string related to current version of file.</td>
  </tr>
  <tr>
    <td>Content-Type</td>
    <td>Always will be ‘application/octet-stream’</td>
  </tr>
  <tr>
    <td>Content-Length</td>
    <td>File size.</td>
  </tr>
  <tr>
    <td>x-createdDate</td>
    <td>Indicates the date and time at which the file was created. Server time.</td>
  </tr>
</table>


## GET /ifs/{id}{path}?{filter}

When file_path is a directory.

#### Request

<table>
  <tr>
    <td>/ifs</td>
    <td>Is a fixed strings that routes to IFS module</td>
  </tr>
  <tr>
    <td>{id}</td>
    <td>Is the fs id (for example could be project_id or workspace_id). To be defined later. It can not include slash.</td>
  </tr>
  <tr>
    <td>{file_path}</td>
    <td>Is the path of the directory we want to list. Note that it includes the leading slash (/), and can include as many slash as needed.</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields:
name
</td>
  </tr>
</table>


#### Response

When listing directories the response Content-Type will always be ‘application/json’ with the 

following representation:

{

    "kind": "file-list",

    "items": [

        {

            "kind": "file",

            "id": string,

            "mime-type": string,/home/david/projects/rest3d-git-prototype

            "created-date": datetime,

            "modified-date": datetime,

            "file-extension": string,

            "file-size": number,

            "path": string

        }

    ]

}

kind can be: ‘file’, ‘dir’ or ‘link’

file-size is in bytes

**Example**

<table>
  <tr>
    <td>{  
   "kind":"file-list",
   "items":[  
     {  
         "kind":"dir",
         "id":"config",
         "fileSize":4096,
         "createdDate":"2015-10-22T12:27:18.692Z",
         "modifiedDate":"2015-10-22T12:27:18.692Z"
      },
     {  
         "kind":"file",
         "id":"ifs.js",
         "fileSize":6644,
         "createdDate":"2015-11-10T16:17:34.332Z",
         "modifiedDate":"2015-11-10T16:17:34.332Z"
      }
   ]
}</td>
  </tr>
</table>


#### Filtering

When requesting directory contents files results can be filtered by name glob.

It uses node [minimatch](https://www.npmjs.com/package/minimatch), allowing expressions like: "*.foo", "*.bar" or "*.+(bar|foo)".

The parameter to filter is "name". 

Ex.:  /ifs/1234/folder?name=*.js

#### Paging

All directory content is sorted alphabetically. When the directory content exceeds 100 items, then only the first 100 are returned. This can be changed with the **maxResults** parameter.

When there are more items the body representation contains a **nextLink** value.

GET /ifs/1234/folder?name=*.js&maxResults=10

{

    "kind": "file-list",

    "nextLink": "/ifs/1234/folder?name=*.js&maxResults=10&start=10",

    "items": [

        ...

    ]

}

#### Error format

Whenever the HTTP response has an error status code (4xx or a 5xx), then the body is JSON formated and contains an error in JSON format:



#### Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved
