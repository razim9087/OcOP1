# Space Management Guide

## Disk Space Usage

### Typical Directory Sizes

| Directory | Typical Size | Safe to Delete? | Regeneration |
|-----------|--------------|-----------------|--------------|
| `node_modules/` | ~400 MB | ❌ No | `npm install` |
| `target/` | 0-1.5 GB | ✅ Yes (partial) | `anchor build` |
| `test-ledger/` | 0-5 GB | ✅ Yes | Auto-created on test |
| `target/debug/` | 0-1.1 GB | ✅ Yes | Auto-created on build |
| `target/release/` | 0-300 MB | ⚠️ Partial | Auto-created on build |
| `target/deploy/` | ~300 KB | ❌ No | `anchor build` |

## Quick Cleanup

### Option 1: Run Cleanup Script (Recommended)
```bash
./cleanup.sh
```

**What it does:**
- Saves compiled program (`.so` file)
- Removes test-ledger (~5 GB)
- Cleans all Rust build artifacts (~1.5 GB)
- Cleans npm cache
- Restores essential deployment files
- **Total savings: ~5-6 GB**

### Option 2: Manual Cleanup

**Remove test ledger data (regenerated on test runs):**
```bash
rm -rf test-ledger/
```
Saves: ~4-5 GB

**Clean Rust build artifacts:**
```bash
cargo clean
```
Saves: ~1-1.5 GB

**Clean npm cache:**
```bash
npm cache clean --force
```
Saves: ~100-500 MB

**Remove debug builds (keeps release & deploy):**
```bash
rm -rf target/debug/
rm -rf target/sbpf-solana-solana/
```
Saves: ~1 GB

## What NOT to Delete

### Essential Files (Total: ~400 MB)
1. **`node_modules/`** - Required for TypeScript tests
   - Run `npm install` to restore if deleted
   
2. **`target/deploy/escrow.so`** - Compiled Solana program (260 KB)
   - Required for deployment
   - Run `anchor build` to rebuild
   
3. **`target/idl/escrow.json`** - Interface Definition (8 KB)
   - Required by client applications
   - Auto-generated during build
   
4. **`target/types/escrow.ts`** - TypeScript types (8 KB)
   - Required for TypeScript tests
   - Auto-generated during build

5. **Source code** - `programs/`, `tests/`, `app/`
   - Your actual code!

## Space-Saving Best Practices

### During Development

**After running tests:**
```bash
rm -rf test-ledger/  # Saves 4-5 GB immediately
```

**After successful build:**
```bash
# Keep only the compiled program
cargo clean
# Rebuild will recreate deployment files
```

**Periodic cleanup:**
```bash
./cleanup.sh  # Run weekly or when disk space low
```

### For Production Deployment

**Minimum required files:**
```
target/
  deploy/
    escrow.so          # Compiled program (260 KB)
  idl/
    escrow.json        # Interface definition (8 KB)
  types/
    escrow.ts          # TypeScript types (8 KB)
```

You can delete everything else and still deploy!

## Rebuilding After Cleanup

### Full Rebuild
```bash
anchor build
```
Time: ~30-60 seconds
Disk usage: +1-1.5 GB (temporary)

### Run Tests
```bash
anchor test --skip-local-validator
```
Time: ~20-30 seconds
Creates: test-ledger/ directory (~4-5 GB)

### Deploy to Network
```bash
anchor deploy --provider.cluster devnet
```
Time: ~5-10 seconds
Requires: Only `target/deploy/escrow.so`

## Disk Space Optimization Tips

1. **Run cleanup after each test session**
   ```bash
   anchor test && rm -rf test-ledger/
   ```

2. **Use cleanup script regularly**
   ```bash
   ./cleanup.sh
   ```

3. **For CI/CD pipelines**
   - Only deploy `target/deploy/*.so` and `target/idl/*.json`
   - Don't commit `target/`, `test-ledger/`, `node_modules/`

4. **Gitignore already configured**
   - `.gitignore` excludes all heavy directories
   - Only source code is tracked

## Current Project Status

After cleanup:
- **Total size:** ~412 MB
- **node_modules:** 405 MB
- **target:** 300 KB (deploy files only)
- **Source code:** 7 MB

**Space freed:** ~5.6 GB from original 6 GB

## Troubleshooting

### "anchor build fails after cleanup"
**Solution:** All build artifacts removed, this is normal
```bash
anchor build  # Rebuilds everything
```

### "Tests fail: test-ledger not found"
**Solution:** Test ledger is auto-created
```bash
anchor test  # Creates new test-ledger
```

### "TypeScript errors: Cannot find module"
**Solution:** Dependencies missing
```bash
npm install  # Restores node_modules
```

### "Deployment fails: escrow.so not found"
**Solution:** Run cleanup script to restore or rebuild
```bash
./cleanup.sh  # Restores from backup
# OR
anchor build  # Rebuilds from source
```

## Automation

### Add to package.json scripts:
```json
{
  "scripts": {
    "clean": "./cleanup.sh",
    "build": "anchor build",
    "test": "anchor test",
    "test:clean": "anchor test && rm -rf test-ledger/"
  }
}
```

Usage:
```bash
npm run clean       # Run cleanup
npm run test:clean  # Test and auto-cleanup
```

---

**Remember:** The cleanup script preserves your compiled program, so you can always deploy without rebuilding!
