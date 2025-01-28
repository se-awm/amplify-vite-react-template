#!/bin/bash

# Run the build command
npm run build

# Check if the build command failed
if [ $? -ne 0 ]; then
  echo "Build failed, triggering rollback"
  node ./scripts/deploy.js  # Call the deploy.js script for rollback
  exit 1  # Exit with a failure code to indicate the build failed
else
  echo "Build succeeded"
  exit 0  # Exit with a success code
fi
