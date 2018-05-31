**[Home](Home)**

This module aims to provide a rest api for browsing 
game content. This document defines a back end layer to the content browser interface.

It deals with notion of project, assets and resources. See following specs for more information :
[Assets]() and
[Content browser]().

[Here]() is the link of the DEPRECATED api. We moved straight from version 1.0.0 to 2.0.0 as it implies a lot of design remodeling. Note we use [semver](http://semver.org/) as versioning protocol. 

***

### API DESCRIPTION

The api description is accessible from the API's root url. The representation is organized like this:
```javascript
{
  "name": "Content browser",
  "version": "1.1",
  "url": "/contentbrowser",
  "projects_url": "/contentbrowser/projects/",
  "workspaces_url": "/contentbrowser/workspaces/",
  "asset_types_url" : "/contentbrowser/assets/types"
}
```

#### GET | Retrieve api description

**/contentbrowser**

Response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { api description } |

### PROJECT

- A project is composed of asset and resource databases
- A project is specified from [GitHub® api]()
- A project can be created as long as there isn't another one existing identified by its project name. 
- The only project identifier is similar to GitHub® repository name.
- A project stores engine configurations/[command line options]()
- A project is defined by the meta-data specified in [GitHub® repo api](https://developer.github.com/v3/repos/#get) that WON'T be mapped to a file. Additionally, we will add data to this project like below:
```javascript
{
    "id": 55452904,
    "name": "Hello-World",
    "full_name": "org/Hello-World",
    "owner": {
        "login": "org",
        "id": 1161383,
        "type": "Organization",
        "site_admin": false
    },
    "private": false,
    "html_url": "https://github.com/org/Hello-World",
    "description": {
        "tags": ["Hello", "World"],
        "comment": "this is my first repo!",
        "svn_url": "https://svn.foo.com/svn/HelloWorld",
        "type": "application/vnd.bilrost.project+json",
        "settings": {}
    },
    "size": 40483,
    "default_branch": "master",
    "permissions": {
        "admin": false,
        "push": true,
        "pull": true
    },
    "resources_url": "/contentbrowser/projects/organization/:project_name/resources/",
    "assets_url": "/contentbrowser/projects/organization/:project_name/assets/",
        "branches_url": "/contentbrowser/projects/organization/:project_name/:branch_name/"
}
```

- *description field* is originally dedicated to store a short description of the repository. Nevertheless, we are going to use this field to welcome a stingified json that is parsed by bilrost to identify the project. This is edited in the GitHub® repository description.
- *settings* are engine configurations.
- *svn_url* tells to the engine if the project is included in a SVN repository, and where it is located inside it. 
- *resources and assets urls* are links to access to internal api related to projects.

#### GET | Retrieve project resource(s) by organization

NOTE: We can retrieve from this api section only project resources from master branches.

**/contentbrowser/projects/{organization}?{filter}{paging}**

Request:
<table>
  <tr>
    <td>projects/</td>
    <td>This is a fixed string that routes to projects module.</td>
  </tr>
  <tr>
    <td>{oganization}</td>
    <td>This is the oganization name managed by the remote database. Example: "bar/". Organization names can be capitalized, but it is not allowed to have two names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' and '/' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields: ref.  This is filter to apply to the resource ref.
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields: maxResults, start
</td>
  </tr>
</table>

Response:

| Code | Mime-type | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "project-list", items : [{project_resource1}, {project_resource2}, ...] } |

##### Examples

* /contentbrowser/projects/bar
* /contentbrowser/projects/?name=foo,test&start=10&maxResults=10

#### GET | Retrieve project resource(s)

NOTE: We can retrieve from this api section only project resources from master branches.

**/contentbrowser/projects/{organization}/{project_name}?{filter}{paging}**

Request:
<table>
  <tr>
    <td>projects/</td>
    <td>This is a fixed string that routes to projects module.</td>
  </tr>
  <tr>
    <td>{oganization}</td>
    <td>This is the oganization name managed by the remote database. Example: "bar/". Organization names can be capitalized, but it is not allowed to have two names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' and '/' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{project_name}</td>
    <td>This is the project name managed by the remote database. It must follow this scheme: organization/project_name. Example: "bar/project". Project names can be capitalized, but it is not allowed to have two project names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' and '/' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields: ref. This is filter to apply to the resource ref.
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields: maxResults, start
</td>
  </tr>
</table>

Response:

| Code | Mime-type | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "project-list", items : [{project_resource1}, {project_resource2}, ...] } |

##### Examples

* /contentbrowser/projects/bar/test
* /contentbrowser/projects/bar/?test=foo,test&start=10&maxResults=10

***

### BRANCH

NOTE: all branch methods won't be implemented in content browser API v1.1. Nevertheless its structure is mandatory for the API architecture, so the routes will be still reachable but will answer 501 not supported. 

- A new project has by default a master branch
- A branch can be created only from another one
- A branch cannot be modified. Users must create a workspace from a branch to have access to it, and make a Pull Request of the workspace for revising this branch
- The only branch identifier is similar to projects names.
- The resource returned by this API is the same than the [GitHub®'s one](https://developer.github.com/v3/repos/#get-branch). Like projects, it also included "stringified" JSON in description field: 
```javascript
 {
    ...
    "description": {
      "tags":["Hello", "World"],
      "comment":"this is my first repo!",
      "svn_url":"https://svn.foo.com/svn/HelloWorld",
      "type":"application/vnd.bilrost.project+json",
      "settings":{ }
    }
    ...
    "resources_url": "/contentbrowser/projects/organization/:project_name/:branch_name/resources/",
    "assets_url": "/contentbrowser/projects/organization/:project_name/:branch_name/assets/"
  }
```
- *description field* is orginally dedicated to store a short description of the repository. Nevertheless, we are going to use this field to welcome a stingified json that is parsed by bilrost to identify the project. This is edited in the GitHub® repository description.
- *settings* are engine configurations.
- *svn_url* tells to the engine if the project is included in a SVN repository, and where it is located inside it. 
- *resources and assets urls* are links to access to internal api related to projects.

#### GET | Retrieve project branches

**/contentbrowser/projects/{project_full_name}/{branch_name}?{filter}{paging}**

Request:
<table>
  <tr>
    <td>projects/</td>
    <td>This is a fixed string that routes to projects module.</td>
  </tr>
  <tr>
    <td>{project_full_name}</td>
    <td>This is the project name managed by the remote database. It must follow this scheme: organization/project_name. Example: "bar/project". Project names can be capitalized, but it is not allowed to have two project names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' and '/' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{branch_name}</td>
    <td>This is the branch name managed by the remote database. Example: "master", "samples/test". Branch names can be capitalized, but it is not allowed to have two branch names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields: filter. This input uses minimatch for matching the name.
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields:
maxResults, start
</td>
  </tr>
   <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields:
maxResults, start
</td>
  </tr>
</table>

Response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "project-list", items : [{project_resource1}, {project_resource2}, ...] } |

##### Examples

* /contentbrowser/projects/foo/toto/
* /contentbrowser/projects/foo/toto/master
* /contentbrowser/projects/foo/toto/DLC_test
* /contentbrowser/projects/foo/toto/?name=DLC_test&start=10&maxResults=10

***

### WORKSPACE

- A workspace is a local clone/copy of a project at one specific version that is ready to be modified
- A workspace has a physical location on local disks
- A workspace can be created as long as there isn't another one existing on the targeted location (No .bilrost folder detected).
- The only workspace identifiers are a guid of 40 characters (like GitHub® commit numbers) and a name.
- A workspace stores engine configurations/[command line options]()
- A workspace is defined by the same meta-data than project that is mapped to a file under .bilrost/ folder that is called 'workspace':
```javascript
  {
    "project" : {
      "name": "Hello-World",
      "full_name": "octocat/Hello-World",
      "url": "https://api.github.com/repos/octocat/Hello-World",
      "branch": "DLC_1"
    },
    "name" : "feat/first-workspace",
    "host" : "svn",
    "guid" : "e39d0f72c81c445ba8014f3999f576c7sdadswgg",
    "description": "This is your first branch from your first repo!",
    "pushed_at": "2011-01-26T19:06:43Z",
    "created_at": "2011-01-26T19:01:12Z",
    "updated_at": "2011-01-26T19:14:43Z",
    "tags":["Hello", "World"],
    "svn_url":"https://svn.foo.com/svn/HelloWorld",
    "type":"application/vnd.bilrost.workspace+json",
    "settings":{ },
    "resources_url": "/contentbrowser/workspaces/feat/first-workspace/resources/",
    "assets_url": "/contentbrowser/workspaces/feat/first-workspace/assets/"
  }
```
- *settings* are engine configurations.
- *svn_url* tells to the engine if the project is included in a SVN repository, and where it is located inside it. 
- *resources and assets urls* are links to access to internal api related to projects.
- A "favorite" list of workspaces are stored in a settings file *itsProject.json* under itsServer folder located [at the regular place where we put our settings](). We store key-value pairs -- the key is *{workspace_guid}* coupled with the content file ref as the value.
- A workspace must comprises of .bilrost folder, where we store assets and the above resource:
```
--- My workspace
------ .git
------ *resource location*
------ .bilrost
--------- workspace (above resource)
------------ *assets location*
```

- *.bilrost* folder is created by the server on local disk inside a workspace when a repository gets cloned from one specific branch. 
- *workspace* resource is created by the server after requesting project resource to the server - for instance, /contentbrowser/project/organization/branchname - and above *.bilrost* folder gets generated.
- *resource* could be any file. We may change that later
- *asset* are specified in this [document]() and defined by mime types.

#### GET | Retrieve project workspace(s)

**/contentbrowser/workspaces/{workspace_guid||workspace_name}?{filter}{paging}**

Request:

<table>
    <td>/workspaces/</td>
    <td>This is a fixed string that routes to workspace module.</td>
  </tr>
  <tr>
    <td>{workspace_guid}</td>
    <td>This is the workspace guid generated by the server once the workspace get cloned. It must match "/^[a-zA-Z0-9]{40}$/" regular expression. Example: "8169e370774a07af0898f771e0a5b5391ca792a8"</td>
  </tr>
  <tr>
    <td>{workspace_name}</td>
    <td>[Reference](reference--and-worskpace-name-validation)</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields:name. This is filter to apply to the name.
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields:maxResults, start
</td>
  </tr>
</table>

Response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "workspace-list", items : [{workspace_resource1, workspace_resource2, ... ] } |
| 200 | application/vnd.bilrost.project+json | Object | workspace_resource |


##### Examples

* /contentbrowser/workspaces/
* /contentbrowser/workspaces/8169e370774a07af0898f771e0a5b5391ca792a8
* /contentbrowser/workspaces/?name=8168

#### PUT | Add a workspace

This method has been moved [here]()

#### DELETE | Forget a workspace

This method has been moved [here]()

### ASSET

- an asset has a [predefined structure]()
- an asset is a meta representation of resources, giving a better understanding to users for differentiating game content
- an asset is identified by an ref eg. ```assets/path/to/test.level```
- an asset is coupled with a resource that ultimately WON'T be mapped as a file. Here is a representation example for retrieving an asset.
```javascript
{
  "kind": "asset-list",
  "items": [
    {
      "ref": "assets/levels/test_001.level",
      "created": "2016-03-16T14:41:10.384Z",
      "modified": "2016-03-18T10:54:05.870Z",
      "author": "",
      "comment": "",
      "tag": [],
      "entryPoint": "resources/test/test_001",
      "collection": [
        "resources/mall/mall_demo"
      ],
      "setting": []
    }
  ],
  "namespaces": [
    {
      "url": "/contentbrowser/workspaces/e39d0f72c81c445ba8014f3999f576c7sdadswgg/assets/levels/mall",
      "name": "mall"
    }
  ],
  "totalItems": 1,
  "totalNamespaces": 1
}
```

#### GET | Retrieve asset's resource(s) from a workspace

**/contentbrowser/workspaces/{workspace_guid||workspace_name}/{asset_ref}?{q}{paging}**

<table>
   <tr>
    <td>/workspaces/</td>
    <td>Is a fixed string that routes to workspaces module</td>
  </tr>
  <tr>
    <td>{workspace_guid}</td>
    <td>This is the workspace guid generated by the server once the workspace get cloned. It must match "/^[a-zA-Z0-9]{40}$/" regular expression.  Example: "8169e370774a07af0898f771e0a5b5391ca792a8"</td>
  </tr>
  <tr>
    <td>{workspace_name}</td>
    <td>[Reference](reference--and-worskpace-name-validation)</td>
  </tr>
  <tr>
    <td>{asset_ref}</td>
    <td>This is the asset ref. It must start with "assets/" keyword. Example: "assets/test/example.level", "assets/test/" and "assets/". Asset refs can be capitalized, but it is not allowed to have two asset refs that only differentiate in their capitalization. it must match "/^(assets|resources)\/.*/" regular expression.</td>
  </tr>
  <tr>
    <td>{filter} DEPRECATED</td>
    <td>Query string with the following possible fields: ref.  This is filter to apply to the asset ref.
</td>
  </tr>
  <tr>
    <td>{q}</td>
    <td>Find asset by interpreting the "q" query along this [syntax](search-assets)
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields: maxResults, start
</td>
  </tr>
</table>

response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "resource-list", items : [{ asset_resource1 }, { asset_resource2 }, ... ] } |
| 200 | application/vnd.bilrost.asset+json | Object | asset_resource |

#### GET | Retrieve asset(s) from a project

**/contentbrowser/projects/{project_full_name}/{branch_name}/{asset_ref}?{filter}{paging}**

<table>
   <tr>
    <td>/projects/</td>
    <td>Is a fixed string that routes to projects module</td>
  </tr>
  <tr>
    <td>{project_full_name}</td>
    <td>This is the project name managed by the remote database. It must follow this scheme: organization/project_name. Example: "bar/project". Project names can be capitalized, but it is not allowed to have two project names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' and '/' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{branch_name} (OPTIONAL)</td>
    <td>This is the branch name managed by the remote database. Example: "master", "samples/test". Branch names can be capitalized, but it is not allowed to have two branch names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' - and avoid characters that need to be escaped in a URL (such as space). If this parameter is omitted, then the resource returned will be from the *master branch* of the project</td>
  </tr>
   <tr>
    <td>{asset_ref}</td>
    <td>This is the asset ref. It must start with "assets/" keyword. Example: "assets/test/example.level", "assets/test/" and "assets/". Asset refs can be capitalized, but it is not allowed to have two asset refs that only differentiate in their capitalization.  it must match "/^(assets|resources)\/.*/" regular expression. (such as space).</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields: ref.  This is filter to apply to the resource ref.
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields: maxResults, start
</td>
  </tr>
</table>

NOTE: This method won't be implemented in content browser API v1.1. Implemented in v1.2

response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "resource-list", items : [{ asset_resource1 }, { asset_resource2 }, ... ] } |
| 200 | application/vnd.bilrost.asset+json | Object | asset_resource |

##### Examples

* /contentbrowser/project/foo/hello/assets/
* /contentbrowser/project/foo/hello/master/assets/furniture/drawer
* /contentbrowser/project/foo/hello/feat/new_pr/assets/furniture/drawer
* /contentbrowser/project/foo/hello/resources/furniture/?name=drawer,black&start=100&maxResults=10

#### GET | List all asset types

This method aims to expose types json configuration file. It provides a accepted list of asset mime types.

**/contentbrowser/assets/types**

response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | require(types.json).assets |


##### Examples
* /contentbrowser/assets/types

***

### RESOURCE

- A resource is not an asset. Asset packages resources.
- A resource is defined by ```/resource``` base ref
- A resource is identified by a ref eg. ```/resources/path/to/test```
- A resource is mapped to a file and his structure/format isn't predicted yet (may change later)
- A resource has statistics served by this api with following representation:
```javascript
{
  "kind": "file-list",
  "items": [
    {
      "kind": "dir",
      "id": "mall",
      "fileSize": 0,
      "createdDate": "2016-06-12T23:25:47.457Z",
      "modifiedDate": "2016-06-12T23:25:31.524Z",
      "fileExtension": "",
      "mime-type": "application/octet-stream",
      "hasChildren": false
    },
    {
      "kind": "dir",
      "id": "test",
      "fileSize": 0,
      "createdDate": "2016-06-06T12:36:13.048Z",
      "modifiedDate": "2016-06-06T12:36:11.568Z",
      "fileExtension": "",
      "mime-type": "application/octet-stream",
      "hasChildren": false
    }
  ],
  "totalItems": 2
}
```
kind can be: 'file', 'dir' or 'link'
file-size is in bytes

#### GET | Retrieve resource(s) from a workspace

**/contentbrowser/workspaces/{workspace_guid||workspace_name}/{resource_ref}?{q}{paging}**

<table>
   <tr>
    <td>/workspaces/</td>
    <td>Is a fixed string that routes to workspaces module</td>
  </tr>
  <tr>
    <td>{workspace_guid}</td>
    <td>This is the workspace guid generated by the server once the workspace get cloned. It must match "/^[a-zA-Z0-9]{40}$/" regular expression. Example: "8169e370774a07af0898f771e0a5b5391ca792a8"</td>
  </tr>
  <tr>
    <td>{workspace_name}</td>
    <td>[Reference](reference--and-worskpace-name-validation)</td>
  </tr>
  <tr>
    <td>{resource_ref}</td>
    <td>This is the resource ref. It must start with "resources/" keyword. It indicates its location in the workspace. Example: "resources/test/example.level", "resources/test/" and "resources/". Resource refs can be capitalized, but it is not allowed to have two asset refs that only differentiate in their capitalization. It must match "/^(assets|resources)\/.*/" regular expression..</td>
  </tr>
  <tr>
    <td>{filter} DEPRECATED</td>
    <td>Is a query strings with the following possible fields: ref.  This is filter to apply to the resource ref.
</td>
  </tr>
  <tr>
    <td>{q}</td>
    <td>Find resourceby interpreting the "q" query along this [syntax](search-resources)
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields: maxResults, start
</td>
  </tr>
</table>

response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "resource-list", items : [{ resource_stat }, { resource_stat2 }, ... ] } |
| 200 | application/json | Object | resource_stat |

##### Examples

* /contentbrowser/workspaces/8169e370774a07af0898f771e0a5b5391ca792a8/resources/furniture/drawer
* /contentbrowser/workspaces/8169e370774a07af0898f771e0a5b5391ca792a8/resources/furniture/?ref=drawer,black&start=100&maxResults=10
* /contentbrowser/workspaces/8169e370774a07af0898f771e0a5b5391ca792a8/resources/furniture/?ref=drawer,black&start=10&maxResults=10|

#### GET | Retrieve resource(s) from a project

**/contentbrowser/projects/{project_full_name}/{branch_name}/{resource_ref}?{filter}{paging}**

<table>
   <tr>
    <td>/projects/</td>
    <td>Is a fixed string that routes to projects module</td>
  </tr>
  <tr>
    <td>{project_full_name}</td>
    <td>This is the project name managed by the remote database. It must follow this scheme: organization/project_name. Example: "bar/project". Project names can be capitalized, but it is not allowed to have two project names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' and '/' - and avoid characters that need to be escaped in a URL (such as space).</td>
  </tr>
  <tr>
    <td>{branch_name} (OPTIONAL)</td>
    <td>This is the branch name managed by the remote database. Example: "master", "samples/test". Branch names can be capitalized, but it is not allowed to have two branch names that only differentiate in their capitalization. It is prohibited to use characters reserved in the various field of a URL, such as '?','&','=',';' - and avoid characters that need to be escaped in a URL (such as space). If this parameter is omitted, then the resource returned will be from the *master branch* of the project</td>
  </tr>
  <tr>
    <td>{resource_ref}</td>
    <td>This is the resource ref. It must start with "resources/" keyword. It indicates its location in the workspace. Example: "resources/test/example.level", "resources/test/" and "resources/". Resource refs can be capitalized, but it is not allowed to have two asset refs that only differentiate in their capitalization. It must match "/^(assets|resources)\/.*/" regular expression.</td>
  </tr>
  <tr>
    <td>{filter}</td>
    <td>Is a query strings with the following possible fields: ref.  This is filter to apply to the resource ref.
</td>
  </tr>
  <tr>
    <td>{paging}</td>
    <td>Is a query strings with the following possible fields: maxResults, start
</td>
  </tr>
</table>

NOTE: This method won't be implemented in content browser API v1.1.

response:

| Code | Mimetype | Data type | Data |
|------|--------|--------|----------------------|
| 200 | application/json | Object | { kind : "resource-list", items : [{ resource_stat }, { resource_stat2 }, ... ] } |
| 200 | application/json | Object | resource_stat |

##### Examples

* /contentbrowser/project/foo/hello/resources/
* /contentbrowser/project/foo/hello/master/resources/furniture/drawer
* /contentbrowser/project/foo/hello/feat/new_pr/resources/resources/furniture/drawer
* /contentbrowser/project/foo/hello/resources/furniture/?name=drawer,black&start=100&maxResults=10

### ERROR PROTOCOL

| Code | Mimetype | Data type | Message | Example |
|------|--------|--------|----------------------|----------------------|
| 403 | application/json | Error | [object] already exist | [PUT] /contentbrowser/workspaces an already existing worskpace in favorite list. |
| 404 | application/json | Error | [api name] not found, [element_not_found] | [GET] /contentbrowser/workspaces/ an unknown workspace. |
| 409 | application/json | Error | [api name] identifier not valid, [identifier] must match either /^[a-zA-Z0-9]{40}$/, /^[[\w\/\.-]*$/ or  /^file:\/\/\/*$/ regular expressions for guids, names or urls | [GET] /contentbrowser/workspaces/{workspace_identifier} with an invalid identifier. | 
| 422 | application/json | Error | [api name] corrupted, [element_not_valid] cannot be found or is invalid | [GET] /contentbrowser/workspaces/{workspace_identifier} where workspace_identifier points to an invalid workspace resource. | 
| 500 | application/json | Error | [api name] programms encoutered an unexpected failure: [error] | [GET] /contentbrowser/workspaces/{workspace_identifier} and the server couldn't read the workspace content as the server doesn't have read access. The error paramater will output then the related internal error from the server. | 
| 501 | application/json | Error | [api name] not found, [element_not_supported] is not supported yet' | [GET] /contentbrowser/projects informs that this route isn't fully implemented yet. |


#### Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved
#### All other trademarks are the property of their respective owners
