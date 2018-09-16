@ECHO OFF

REM # Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.

REM # This script is intended to be run by Jenkins,
REM # it must be run setting the following Env Variables:
REM #   AWS_S3_CREDENTIALS, is the file that contains the S3 credentials

echo "setting S3 config file"
if not exist "config" mkdir config
copy /Y %AWS_S3_CREDENTIALS% config\

call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

call npm run eslint
if %errorlevel% neq 0 exit /b %errorlevel%

call npm run jenkins
if %errorlevel% neq 0 exit /b %errorlevel%
