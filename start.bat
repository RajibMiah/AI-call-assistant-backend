@echo off
echo 🔧 Setting up local HTTPS server...

:: Run SSH Tunnel and Nodemon in the same terminal without opening extra windows
start /B ssh -R 80:localhost:5000 localhost.run
npm start
