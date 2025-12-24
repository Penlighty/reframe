# Reframe - Release & Update Guide

This guide explains how to push changes to your running `.exe` files so they get updated automatically.

## 🚀 How to push "Updates" from now on:

Whenever you want to push changes and have them appear in the running `.exe` files:

1. **Make your changes** to the code (React, CSS, or Rust).
2. **Bump the Version**: 
   - Open `src-tauri/tauri.conf.json`
   - Change `"version": "0.1.0"` to `"0.1.1"` (keep increasing it every time you want a new update).
3. **Commit & Push**:
   ```powershell
   git add .
   git commit -m "Update message: Fixed the UI colors"
   git push origin main
   ```
4. **Build Process**: 
   - Go to your GitHub repository's **Actions** tab.
   - Wait for the **"publish"** workflow to finish (approx. 10 minutes).
5. **Publish**: 
   - Once finished, it creates a **Draft Release**. 
   - Go to the **"Releases"** section on your GitHub repo.
   - Click **Edit** on the draft release.
   - Click **Publish Release**.

---

## 📡 What happens next?

The moment you click **"Publish"** on GitHub:

- Every running copy of Reframe (the `.exe`) will be able to detect the update.
- Users can go to the **About** panel and click **"Check for Updates"**.
- If an update is found, they will see a **"Download & Restart"** button.
- Clicking it will automatically download the new version and relaunch the app.

---

## 🔑 Infrastructure Details (Already Configured)

- **GitHub Action**: `.github/workflows/publish.yml` handles the automated builds.
- **Signing Keys**: Stored in GitHub Secrets (`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).
- **Updater Logic**: Handled by `@tauri-apps/plugin-updater` in React and Rust.
- **Public Key**: Hardcoded in `tauri.conf.json` to verify the authenticity of updates.
