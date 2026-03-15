#!/bin/bash
set -e
echo "Running post-merge setup..."
npm install --prefer-offline --no-audit --no-fund
echo "Post-merge setup complete."
