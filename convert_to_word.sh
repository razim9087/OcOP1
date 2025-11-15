#!/bin/bash

# Script to convert documentation to Word format
# Usage: ./convert_to_word.sh

echo "Converting DOCUMENTATION.md to Word format..."

# Method 1: Using pandoc (recommended)
if command -v pandoc &> /dev/null; then
    echo "Using pandoc..."
    pandoc DOCUMENTATION.md -o DOCUMENTATION.docx \
        --toc \
        --toc-depth=3 \
        --highlight-style=tango \
        --reference-doc=./custom-reference.docx 2>/dev/null || \
    pandoc DOCUMENTATION.md -o DOCUMENTATION.docx \
        --toc \
        --toc-depth=3 \
        --highlight-style=tango
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created DOCUMENTATION.docx"
        echo "📄 File location: $(pwd)/DOCUMENTATION.docx"
        exit 0
    fi
fi

# Method 2: Installation instructions
echo ""
echo "❌ pandoc is not installed."
echo ""
echo "To convert to Word format, you have several options:"
echo ""
echo "Option 1: Install pandoc (recommended)"
echo "  Ubuntu/Debian: sudo apt-get install pandoc"
echo "  macOS: brew install pandoc"
echo "  Windows: Download from https://pandoc.org/installing.html"
echo ""
echo "Option 2: Use online converter"
echo "  1. Open https://cloudconvert.com/md-to-docx"
echo "  2. Upload DOCUMENTATION.md"
echo "  3. Download the converted .docx file"
echo ""
echo "Option 3: Manual conversion"
echo "  1. Open DOCUMENTATION.md in VS Code"
echo "  2. Install 'Markdown Preview Enhanced' extension"
echo "  3. Right-click preview → 'Export to Word'"
echo ""
echo "Option 4: Copy and paste"
echo "  1. Open DOCUMENTATION.md in any markdown viewer"
echo "  2. Copy all content"
echo "  3. Paste into Microsoft Word or Google Docs"
echo "  4. The formatting will be preserved"
echo ""
