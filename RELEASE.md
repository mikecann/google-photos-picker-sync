# Release Guide

This document explains how to create and publish releases for Google Photos Picker Sync.

## 🚀 Quick Release Process

### 1. Prepare for Release

```bash
# Test everything works locally
bun run release:test

# Make sure linting passes
bun run lint
```

### 2. Update Version

Update the version in `package.json`:
```json
{
  "version": "1.0.1"
}
```

### 3. Create and Push a Git Tag

```bash
# Create a tag with the version number
git tag v1.0.1

# Push the tag to trigger the release workflow
git push origin v1.0.1
```

### 4. Monitor the Build

- Go to your repository's **Actions** tab on GitHub
- Watch the "Build and Release" workflow run
- It will build executables for Windows, macOS, and Linux
- When complete, it will create a GitHub release with downloadable zip files

## 📦 What Gets Built

The CI process creates:

- **Windows**: `google-photos-sync-windows.zip` (contains `google-photos-sync.exe`)
- **macOS**: `google-photos-sync-macos.zip` (contains `google-photos-sync`)  
- **Linux**: `google-photos-sync-linux.zip` (contains `google-photos-sync`)

Each zip contains:
- The standalone executable
- `README.md` with quick start instructions
- `LICENSE.txt` with MIT license

## 🛠 Manual Release (Alternative)

If you prefer to build manually:

```bash
# For current platform
bun run build:standalone

# For Windows specifically (if on Windows)
bun run build:standalone:windows

# Create release package manually
mkdir release-package
cp google-photos-sync* release-package/
# Add README and LICENSE files
zip -r release.zip release-package/
```

## 🧪 Testing Releases

Before creating official releases, you can test the workflow:

1. Create a test tag: `git tag v0.0.1-test && git push origin v0.0.1-test`
2. Check if the workflow runs correctly
3. Delete the test release and tag if needed

## 📋 Release Checklist

- [ ] All features tested locally
- [ ] Version updated in `package.json`
- [ ] Repository URLs updated in `package.json` (replace "yourusername")
- [ ] Changelog/release notes prepared
- [ ] Git tag created and pushed
- [ ] CI workflow completed successfully
- [ ] Release assets downloadable
- [ ] Release notes updated if needed

## 🔧 Customizing Releases

To customize the release process:

- **Release notes**: Edit the `body` section in `.github/workflows/release.yml`
- **File inclusions**: Modify the release package creation steps
- **Build targets**: Add/remove OS targets in the matrix strategy
- **Executable names**: Update the `asset_name` and `executable_name` in the matrix

## 📝 Notes

- The workflow triggers on any tag starting with `v` (like `v1.0.0`, `v2.1.3`)
- You can also manually trigger it from the Actions tab using "workflow_dispatch"
- Make sure to update the repository URLs in `package.json` with your actual GitHub username/organization 