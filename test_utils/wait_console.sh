#!/bin/bash
CONSOLE_URL="${CONSOLE_URL:-http://localhost:9000}"
curl \
    --retry 300\
    --retry-connrefused\
    --retry-delay 5\
    --retry-max-time 600\
    --head\
    "${CONSOLE_URL}" > /dev/null \
    && echo "Console is up and running at ${CONSOLE_URL}." \
    || (echo "::error::Timed out waiting for console to start at ${CONSOLE_URL}." && exit 1)