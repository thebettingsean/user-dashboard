#!/bin/bash
# Install Supabase CLI using Homebrew (recommended method)

echo "Installing Supabase CLI via Homebrew..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew not installed"
    echo "Install Homebrew first: https://brew.sh"
    exit 1
fi

# Install Supabase CLI
brew install supabase/tap/supabase

echo ""
echo "Installation complete!"
echo "Verify with: supabase --version"
