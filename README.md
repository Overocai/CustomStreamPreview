# CustomStreamPreview

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg)](LICENSE)
[![Made for Equicord](https://img.shields.io/badge/Made%20for-Equicord-5865F2.svg)](https://github.com/Equicord/Equicord)
[![Vencord compatible](https://img.shields.io/badge/Vencord-compatible-ed4245.svg)](https://github.com/Vendicated/Vencord)

A userplugin for **[Equicord](https://github.com/Equicord/Equicord)** / **[Vencord](https://github.com/Vendicated/Vencord)** that stops Discord from capturing your screen as the stream thumbnail — and optionally replaces it with a custom static image.

> When you go live or share your screen, Discord grabs a frame of your screen and uploads it as the stream's preview thumbnail. This plugin intercepts that upload, so you can **suppress it entirely** (privacy) or **swap it for any image you want**.

---

## ✨ Features

- **Custom thumbnail** — replace the auto-captured screen frame with your own image.
- **Privacy mode** — enable the plugin with no image to fully suppress the thumbnail (nothing is uploaded).
- **One-click panel button** — a quick-access button right next to your mute / deafen controls:
  - **Left-click** — toggle the fake preview on / off.
  - **Right-click** — pick an image (and enable it) in a single step.
- **Automatic JPEG conversion** — any image you pick is re-encoded to JPEG to match Discord's format, capped at **200 KB**.
- **Live settings preview** — see exactly what will be sent, right inside the plugin settings.

---

## 🔧 How it works

The plugin patches Discord's `ApplicationStreamPreviewUploadManager` — the code responsible for turning a captured frame into a JPEG data URL and uploading it. That data URL is routed through the plugin before it ever leaves your client:

| `streamPreview` | Image set | Result |
| :-: | :-: | :- |
| **Off** | — | Discord uploads the real screen frame (default behaviour). |
| **On** | ❌ | Upload is **suppressed** — no thumbnail is sent. |
| **On** | ✅ | Your **custom image** is sent as the thumbnail. |

---

## 📦 Installation

This is a **userplugin**, so it requires a local Equicord/Vencord development build.

1. Set up Equicord for development (see the **[Equicord repository](https://github.com/Equicord/Equicord)** for instructions).
2. Clone this repo into your `src/userplugins` folder:

   ```bash
   git clone https://github.com/Overocai/CustomStreamPreview.git src/userplugins/CustomStreamPreview
   ```

3. From the Equicord repository root, build and inject:

   ```bash
   pnpm build
   pnpm inject   # only if Equicord isn't injected yet
   ```

4. Restart Discord, then enable **CustomStreamPreview** in **Settings → Equicord → Plugins**.

---

## 🚀 Usage

1. Open **Settings → Plugins → CustomStreamPreview**.
2. Toggle **streamPreview** on.
3. Click **Add Preview** and choose an image — or simply **right-click the panel button** to pick one instantly.
4. Go live / share your screen. Your custom image will be used as the preview thumbnail.

Leave the image empty if you only want to **block** the thumbnail without replacing it.

---

## 🛠️ Compatibility

Discord regularly renames its internal (minified) code, which can occasionally break the patch. If the custom preview ever stops applying after a Discord update, it usually means the patch target moved — feel free to open an issue so it can be re-pointed.

---

## 📄 License

Released under the **GNU General Public License v3.0 or later** (`GPL-3.0-or-later`) — the same license as Equicord and Vencord. See [LICENSE](LICENSE) for the full text.

## 🙌 Credits

- Original stream-preview bypass concept by **yofukashino** (DiscordBypasses / Replugged).
- Plugin by **[overocai](https://discord.com/users/1288832011452153910)**.
- Built on top of **[Equicord](https://github.com/Equicord/Equicord)** & **[Vencord](https://github.com/Vendicated/Vencord)**.
