#!/bin/bash

# Change directory to the location of this script
cd "$(dirname "$0")"

# Try to load NVM if it exists (for non-interactive SSH sessions)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Fallback to loading standard bash profiles just in case NVM isn't strictly in ~/.nvm
if ! command -v node &> /dev/null; then
    [ -s "$HOME/.bash_profile" ] && source "$HOME/.bash_profile"
    [ -s "$HOME/.zshrc" ] && source "$HOME/.zshrc"
fi

# Run the MCP server
exec node mcp.mjs "$@"
