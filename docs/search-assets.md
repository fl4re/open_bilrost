**[Home](Home)**

##Search assets

In order to [find assets](), you can construct queries that match specific numbers and words related to asset content. These queries comprise of qualifiers called macros that can be used in any combination.

### Find by user

* ```test author: toto```
    Matches asset made by toto and with the word test in its reference.

Default expression are keywords searched among references. There is match if the keyword characters are included within reference. This is a case sensitive search.

### Find by description

* ```"test/te" tag: hello tag: world```
Matches test assets with hello and world tags defined.

* ```test comment: "hello world"```
Matches test assets with comment including "hello world" expression.

Comment keyword is used as a word. There is match if the keyword characters are included within comment words. This is case sensitive. ```"``` quotation marks could be used for searching a whole expression eg. "Hello world". 

### Find by date

* ```test created:< 2004```
    Matches test assets created before 2004. 

You can also use the .., <=, > or >= symbols to search on dates. Date formatting must follow the [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) standard, which is YYYY-MM-DD--that's year-month-day. You may also add some optional time information, formatted as THH:MM:SS+07:00--that's hour-minutes-seconds (HH:MM:SS), followed by a UTC offset (+07:00)

* ```test created: 2004-04-27```
    Matches test assets created on 2004-04-27.

* ```test modified:>= 2004-04-27```
    Matches test assets with latest modified date greater or equal to 2004-04-27.

* ```test modified:.. 2004-04-27T23:10:30+07:00 2004-04-27T23:12:53+07:00```
    Matches test assets with latest modified date between 11:10 and 11:53 PM on 2004-04-27.

### Find by type

* ```all version: 1.1.0```
    Matches assets version 1.1.0 and with the word all in its reference.

* ```type: level```
    Matches all levels.

### Find by data

* ```main: /resources/test```
    Matches asset referencing test resource.

* ```dependency: /resources/test.dae```
    Matches asset referencing having test collada resource as dependency.

### Complex query

* ```hello world dependency: /resources/texture.png (type: level OR type: prefab)```
    Matches level or prefab containing "hello" and "world" characters, having texture.png dependency.

```OR``` and ```AND``` are operators for building logic query. ```(``` and ```)``` could be used for setting operation priorities.

#### Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved
