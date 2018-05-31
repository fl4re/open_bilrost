**[Home](Home)**

##Search resources

In order to [find resources](), you can construct queries that match specific numbers and words related to resource statistics. These queries comprise of qualifiers called macros that can be used in any combination.

### Find by kind

* ```test kind: directory```
    Matches directory with the word test in its name. kind macro can either ```file``` or ```directory```.

Default expression are keywords searched among file names. There is match if the keyword characters are included within the name. This is a case sensitive finder.

### Find by date

* ```test created:< 2004```
    Matches "test" resources created before 2004.

You can also use the .., <=, > or >= symbols to search on dates. Date formatting must follow the [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) standard, which is YYYY-MM-DD--that's year-month-day. You may also add some optional time information, formatted as THH:MM:SS+07:00--that's hour-minutes-seconds (HH:MM:SS), followed by a UTC offset (+07:00)

* ```test created: 2004-04-27```
    Matches "test" resources created on 2004-04-27.

* ```test modified:>= 2004-04-27```
    Matches "test" resources with latest modified date greater or equal to 2004-04-27.

* ```test modified:.. 2004-04-27T23:10:30+07:00 2004-04-27T23:12:53+07:00```
    Matches "test" resources with latest modified date between 11:10 and 11:53 PM on 2004-04-27.

### Find by type

* ```all mime: application/json```
    Matches "all" resources identified by "application/json" mime-type.

* ```extension: levels```
    Matches "all" resources identified by "level" extension.

### Find by size

* ```size:< 150```
    Matches resources which its size is inferior to 150 bytes.

You can also use the .., <=, > or >= symbols to search on number of bytes.

### Complex query

* ```hello world kind:file (extension: png OR extension: jpeg)```
    Matches collada or jpeg file containing "hello" and "world" characters.

```OR``` and ```AND``` are operators for building logic query. ```(``` and ```)``` could be used for setting operation priorities.

#### Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved
