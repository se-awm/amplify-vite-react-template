#!/bin/bash

# Run the build command
npm run build

# Check if the build command failed
if [ $? -ne 0 ]; then
  echo "Build failed, but continuing to postBuild"
  export BUILD_FAILED=true  # Set the environment variable for failure
  exit 0  # Exit with 0 to allow the pipeline to continue
else
  echo "Build succeeded"
  export BUILD_FAILED=false  # Set the environment variable for success
fi
