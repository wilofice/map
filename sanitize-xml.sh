#!/bin/bash

# XML Sanitizer CLI Script
# Usage: ./sanitize-xml.sh [file-or-directory-path]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Check if xml-sanitizer.js exists
if [ ! -f "$SCRIPT_DIR/xml-sanitizer.js" ]; then
    print_error "xml-sanitizer.js not found in $SCRIPT_DIR"
    exit 1
fi

# Default to current directory if no argument provided
TARGET_PATH="${1:-.}"

print_info "XML Sanitizer - Automatic Special Character Handler"
print_info "=================================================="
print_info "Target: $TARGET_PATH"
print_info ""

# Run the sanitizer
if node "$SCRIPT_DIR/xml-sanitizer.js" "$TARGET_PATH"; then
    print_success "XML sanitization completed successfully!"
    print_info ""
    print_info "What was fixed:"
    print_info "• Code blocks wrapped in CDATA sections"
    print_info "• XML special characters properly escaped"
    print_info "• JSX/HTML content protected from XML parser"
    print_info "• JSON objects with special chars secured"
    print_info ""
    print_warning "Backup files created with timestamp suffixes"
    print_info "Your original files are safe!"
else
    print_error "XML sanitization failed. Check the output above for details."
    exit 1
fi