**[Home](Home)**

### Overview
Bilrost uses nconf as a key/value local store. For some use cases, we need to store persistently data. Nconf is great for doing this with json files, and support also remote storage.

### Where to find?
        %APPDATA/Bilrost on Windows®
        ~/Library/Bilrost on Mac®

### Which files?

- Config/workspaces.json 

This is used by the [content browser api]() for storing the workspace favorite list. Its JSON structure is like this:
```
{
    favorite:[{
        url: "file:///path/to/workspace",
        guid: 1234512345123451234512345123451234512345,
        name: feat/first-workspace
    }]
}
```

- Config/.session

This stores session information to contact bilrost back end server.
```
{
  "session": "4164s/QNyiqTUe94ZS/qF+dsdvEs3UMI0/f5FfZJsi/LpWw7SrK6+ME4/cWIFr8/yafouw1iUZpBaLhECXY0ZI4XMOyv5QiEpLwP4pvzppVkyRo1qFbLop2U0NGRv0PVvqqpM4/Zf/HDoYs/DYwj3acki7mHvaFdL+iukfFGceiSZH+kEBxSiDh5e4cz9NqweqO6vk/SbKIgIpN/SLkYiB8jq0GP3S1Ecx95Kl5rM4sx+qtQy8ppf1nLDu/IGVE6hUQXlgUJ0R8DgSG4Fs5wDUR/F4P0gwpWGCGblGSSccAkoYGZw3lNKLuR+JQPc8j/5fZj6NJDIRodgCepPawcQ=="
}
```

#### Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved
#### All other trademarks are the property of their respective owners
