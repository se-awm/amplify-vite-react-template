#!/bin/bash

# Run the build command
npm run build

# Check if the build command failed
if [ $? -ne 0 ]; then
  echo "Build failed"
  exit 1  # Return a non-zero exit code if build fails
else
  echo "Build succeeded"
  exit 0  # Return 0 exit code if build succeeds
fi
