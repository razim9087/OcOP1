#!/bin/bash

# Solana Options Escrow - Cleanup Script
# Removes unnecessary build artifacts to free up disk space

echo "=== Solana Escrow DApp Cleanup Script ==="
echo ""

# Check initial size
INITIAL_SIZE=$(du -sh . | cut -f1)
echo "Initial project size: $INITIAL_SIZE"
echo ""

# Save essential files
echo "Step 1: Backing up essential deployment files..."
mkdir -p .backup
if [ -f target/deploy/escrow.so ]; then
    cp target/deploy/escrow.so .backup/
    echo "  ✓ Saved escrow.so"
fi
if [ -f target/idl/escrow.json ]; then
    cp target/idl/escrow.json .backup/
    echo "  ✓ Saved escrow.json"
fi
if [ -f target/types/escrow.ts ]; then
    cp target/types/escrow.ts .backup/
    echo "  ✓ Saved escrow.ts"
fi
echo ""

# Remove test ledger data (regenerated on each test run)
echo "Step 2: Removing test-ledger directory..."
if [ -d test-ledger ]; then
    SIZE=$(du -sh test-ledger 2>/dev/null | cut -f1)
    rm -rf test-ledger/
    echo "  ✓ Removed test-ledger/ ($SIZE)"
else
    echo "  ℹ No test-ledger directory found"
fi
echo ""

# Clean Rust build artifacts
echo "Step 3: Cleaning Rust/Cargo build artifacts..."
if command -v cargo &> /dev/null; then
    cargo clean
    echo "  ✓ Ran cargo clean"
else
    echo "  ⚠ Cargo not found, skipping"
fi
echo ""

# Clean npm cache
echo "Step 4: Cleaning npm cache..."
if command -v npm &> /dev/null; then
    npm cache clean --force 2>&1 | grep -v "warn"
    echo "  ✓ Cleaned npm cache"
else
    echo "  ⚠ npm not found, skipping"
fi
echo ""

# Restore essential files
echo "Step 5: Restoring essential deployment files..."
mkdir -p target/deploy target/idl target/types
if [ -f .backup/escrow.so ]; then
    cp .backup/escrow.so target/deploy/
    echo "  ✓ Restored escrow.so"
fi
if [ -f .backup/escrow.json ]; then
    cp .backup/escrow.json target/idl/
    echo "  ✓ Restored escrow.json"
fi
if [ -f .backup/escrow.ts ]; then
    cp .backup/escrow.ts target/types/
    echo "  ✓ Restored escrow.ts"
fi
rm -rf .backup
echo ""

# Final size check
FINAL_SIZE=$(du -sh . | cut -f1)
echo "=== Cleanup Complete ==="
echo "Initial size: $INITIAL_SIZE"
echo "Final size:   $FINAL_SIZE"
echo ""
echo "Essential files preserved:"
echo "  • target/deploy/escrow.so  (Compiled program)"
echo "  • target/idl/escrow.json   (Interface Definition)"
echo "  • target/types/escrow.ts   (TypeScript types)"
echo ""
echo "To rebuild from source, run: anchor build"
echo ""
