/*
 * Vencord / Equicord Plugin: CustomStreamPreview
 *
 * Original feature by yofukashino (DiscordBypasses / Replugged)
 * Converted to standalone Vencord/Equicord TypeScript plugin.
 *
 * Behaviour:
 *   - Toggle OFF  → Discord captures stream thumbnail normally (no-op).
 *   - Toggle ON, no image → thumbnail upload is suppressed entirely.
 *   - Toggle ON, image set → your custom JPEG is sent as the thumbnail.
 *
 * Install:
 *   Copy this FOLDER to  <Equicord>/src/userplugins/CustomStreamPreview/
 *   then run  pnpm build  from the Equicord repo root.
 *   Enable the plugin in Discord → Settings → Equicord/Vencord → Plugins.
 */

// Relative imports — works in any Vencord/Equicord build regardless of
// whether the build system exposes the @api / @utils / @webpack aliases.
import { definePluginSettings } from "../../api/Settings";
import { Logger } from "../../utils/Logger";
import definePlugin, { OptionType } from "../../utils/types";
import { Button, Forms, React, showToast, Toasts } from "../../webpack/common";

// ─── storage (localStorage — synchronous, no Equicord API dependency) ─────────
const STORAGE_KEY = "CustomStreamPreview_fakePreview";

function loadPreview(): string {
    try { return localStorage.getItem(STORAGE_KEY) ?? ""; }
    catch { return ""; }
}

function savePreview(val: string): void {
    try {
        if (val) localStorage.setItem(STORAGE_KEY, val);
        else     localStorage.removeItem(STORAGE_KEY);
    } catch { /* quota / private-mode — silently ignore */ }
}

// ─── in-memory cache ──────────────────────────────────────────────────────────
// _getStreamPreview() is called synchronously inside Discord's minified bundle.
// localStorage is synchronous so we can populate the cache at module-load time.
const logger = new Logger("CustomStreamPreview");
let cachedPreview: string = loadPreview();

// ─── settings ─────────────────────────────────────────────────────────────────
const settings = definePluginSettings({
    streamPreview: {
        type: OptionType.BOOLEAN,
        description:
            "Intercept stream preview capture. " +
            "Enabled + no image → thumbnail suppressed. " +
            "Enabled + image set → custom image sent as thumbnail.",
        default: false,
    },
    previewPicker: {
        type: OptionType.COMPONENT,
        description: "Custom preview image  (any format → auto-converted to JPEG, max 200 KB)",
        component: () => <ImagePickerComponent />,
    },
});

// ─── image picker component ───────────────────────────────────────────────────
function ImagePickerComponent() {
    const { streamPreview } = settings.use(["streamPreview"]);
    const [image, setImageState] = React.useState<string>(() => loadPreview());

    function updateImage(val: string) {
        setImageState(val);
        cachedPreview = val;
        savePreview(val);
    }

    function openFilePicker() {
        const input = document.createElement("input");
        input.type   = "file";
        input.accept = "image/*";

        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = ev => {
                const rawDataUrl = ev.target?.result as string;

                // Re-encode as JPEG to match canvas.toDataURL("image/jpeg").
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width  = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext("2d")?.drawImage(img, 0, 0);
                    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);

                    // Validate size — same 200 KB cap as the original plugin.
                    const base64   = jpegDataUrl.split(",")[1];
                    const byteSize = Math.ceil((base64.length * 3) / 4);
                    if (byteSize > 200 * 1024) {
                        showToast("Image must be under 200 KB after JPEG conversion.", Toasts.Type.FAILURE);
                        return;
                    }

                    updateImage(jpegDataUrl);
                    showToast("Custom stream preview saved!", Toasts.Type.SUCCESS);
                };
                img.src = rawDataUrl;
            };
            reader.readAsDataURL(file);
        };

        input.click();
    }

    if (!streamPreview) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>

            {/* Thumbnail preview area */}
            <div
                style={{
                    width: "100%",
                    minHeight: "80px",
                    background: "var(--background-secondary)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    padding: "8px",
                }}
            >
                {image ? (
                    <img
                        src={image}
                        alt="Custom stream preview"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "180px",
                            borderRadius: "4px",
                            objectFit: "contain",
                        }}
                    />
                ) : (
                    <Forms.FormText style={{ color: "var(--text-muted)", textAlign: "center" }}>
                        No image set — thumbnail upload will be suppressed while active.
                    </Forms.FormText>
                )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
                <Button size={Button.Sizes.SMALL} onClick={openFilePicker}>
                    {image ? "Change Preview" : "Add Preview"}
                </Button>
                {image && (
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                        onClick={() => {
                            updateImage("");
                            showToast("Custom stream preview removed.", Toasts.Type.SUCCESS);
                        }}
                    >
                        Remove Preview
                    </Button>
                )}
            </div>

        </div>
    );
}

// ─── plugin ───────────────────────────────────────────────────────────────────
export default definePlugin({
    name: "CustomStreamPreview",
    description:
        "Prevents Discord from capturing your screen as a stream thumbnail. " +
        "Optionally replaces it with a custom static image.",
    authors: [{ id: 1288832011452153910n, name: "overocai" }],

    settings,

    // ─── webpack patch ─────────────────────────────────────────────────────────
    //
    // Target: ApplicationStreamPreviewUploadManager
    //
    // Original:  let t = e.toDataURL("image/jpeg");
    // Patched:   let t = $self._getStreamPreview(e.toDataURL("image/jpeg")); if (!t) return;
    //
    patches: [
        {
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /((?:let|const|var) (.)=)(.\.toDataURL\("image\/jpeg"\));/,
                replace: (_: string, prefix: string, preview: string, original: string) =>
                    `${prefix}$self._getStreamPreview(${original}); if (!${preview}) return;`,
            },
            noWarn: true,
        },
    ],

    // ─── runtime hook ──────────────────────────────────────────────────────────
    _getStreamPreview(original: string): string | undefined {
        if (!settings.store.streamPreview) return original;

        if (!cachedPreview) {
            logger.warn("Enabled but no image configured — thumbnail will not be uploaded.");
            return undefined;
        }

        return cachedPreview;
    },
});
