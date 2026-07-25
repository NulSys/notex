# Releasing NoteX (with auto-update)

NoteX ships updates through its built-in updater. The app checks
`https://github.com/NulSys/notex/releases/latest/download/latest.json`, and if
that manifest names a version newer than the running one, it downloads the
installer, verifies its signature, and installs it.

For an update to be accepted, the installer must be signed with the **updater
private key**. That is separate from the Windows Authenticode code-signing cert
(the cert makes Windows trust the installer; the updater key makes *NoteX* trust
the update).

## One-time setup (already done)

- **Updater keypair** lives at `~/.tauri/notex-updater.key` (private) and
  `~/.tauri/notex-updater.key.pub` (public). The public key is baked into
  `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
- Password for the private key: **store it in your password manager** — it is
  deliberately NOT written in this repo (the repo is public). Losing the key OR
  the password means you can never ship another update, and users would have to
  reinstall manually.

> ⚠️ The private key is intentionally kept **outside** the repo and is
> `.gitignore`d. Never commit it.

## Cutting a release

1. **Bump the version** in BOTH files (they must match):
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`

   (Optionally `src-tauri/Cargo.toml` `version` too — cosmetic.)

2. **Write release notes** shown in the update window: create/edit
   `RELEASE_NOTES.md` at the repo root. Keep it short and user-facing.

3. **Build the signed installer.** Set the signing env vars for this shell, then
   build. In PowerShell:

   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$HOME\.tauri\notex-updater.key" -Raw
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<your key password>"
   npm run app:build
   ```

   This produces (under `src-tauri/target/release/bundle/nsis/`):
   - `NoteX_<version>_x64-setup.exe`      ← the installer (Authenticode-signed)
   - `NoteX_<version>_x64-setup.exe.sig`  ← the updater signature

4. **Generate the manifest:**

   ```powershell
   npm run release:manifest
   ```

   Writes `latest.json` at the repo root, pointing at the release download URL.

5. **Publish the GitHub release.** Tag it `v<version>` (e.g. `v0.2.0`) and upload
   **two** assets:
   - `NoteX_<version>_x64-setup.exe`
   - `latest.json`

   With the `gh` CLI:

   ```powershell
   gh release create v0.2.0 `
     "src-tauri/target/release/bundle/nsis/NoteX_0.2.0_x64-setup.exe" `
     "latest.json" `
     --title "NoteX 0.2.0" --notes-file RELEASE_NOTES.md
   ```

That's it. Running copies of NoteX will notice the new `latest.json` within a few
seconds of their next launch (or when the user runs **Check for updates** from
the command palette) and offer to update.

## Testing the flow end-to-end

The updater only triggers when the hosted version is **greater** than the
installed one. To test:

1. Install the current version (e.g. build `0.1.0` and run the installer).
2. Bump to `0.2.0`, build, and publish the release as above.
3. Launch the installed `0.1.0` — the update window should appear.

## Notes / gotchas

- **Version comparison is semver.** `0.2.0 > 0.1.0`. The updater ignores a
  release whose version isn't strictly newer.
- **Asset names must match** what `latest.json` references. The script derives
  the name from `productName` + `version`, so as long as you don't rename the
  bundle, they line up.
- **CI signing is not set up** on purpose: the Windows Authenticode cert is a
  local cert-store thumbprint (`certificateThumbprint` in `tauri.conf.json`)
  that's awkward to reproduce in GitHub Actions. Building locally keeps using it.
