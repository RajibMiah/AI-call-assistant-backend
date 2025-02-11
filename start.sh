#!/bin/bash

echo "🔧 Setting up local HTTPS server..."

# Run SSH Tunnel in the background but inside the same terminal
ssh -R 80:localhost:5000 localhost.run &

# Start the Express server
npm start
