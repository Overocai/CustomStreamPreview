/*
 * Vencord / Equicord Plugin: CustomStreamPreview
 *
 * Copyright (c) 2025 overocai and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Original feature by yofukashino (DiscordBypasses / Replugged)
 * Converted to standalone Vencord/Equicord TypeScript plugin.
 *
 * Behaviour:
 *   - Toggle OFF  → Discord captures stream thumbnail normally (no-op).
 *   - Toggle ON, no image → thumbnail upload is suppressed entirely.
 *   - Toggle ON, image set → your custom JPEG is sent as the thumbnail.
 *
 * Quick access:
 *   A button is added to the user panel (next to mute / deafen / settings):
 *     - Left-click  → toggle the fake preview on / off.
 *     - Right-click → pick an image and enable it in one go.
 *
 * Install:
 *   Copy this FOLDER to  <Equicord>/src/userplugins/CustomStreamPreview/
 *   then run  pnpm build  from the Equicord repo root.
 *   Enable the plugin in Discord → Settings → Equicord/Vencord → Plugins.
 */

// Relative imports — works in any Vencord/Equicord build regardless of
// whether the build system exposes the @api / @utils / @webpack aliases.
import { definePluginSettings } from "../../api/Settings";
import { UserAreaButton as UserAreaButtonComponent, UserAreaButtonFactory, UserAreaButtonProps, UserAreaRenderProps } from "../../api/UserArea";
import { Logger } from "../../utils/Logger";
import definePlugin, { OptionType } from "../../utils/types";
import { Button, Forms, React, showToast, Toasts } from "../../webpack/common";

// This plugin folder ships its own node_modules, which pulls in a second copy
// of @types/react. TS then sees the webpack-resolved PanelButton as a foreign
// component type that isn't a valid JSX element, so re-type it locally as a
// plain function component (keeps the props — and event handlers — typed).
const UserAreaButton = UserAreaButtonComponent as unknown as (props: UserAreaButtonProps) => any;

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

// Live subscribers so the settings panel updates when the image is changed from
// the user-panel button (and vice-versa).
const previewSubscribers = new Set<(val: string) => void>();

function setPreview(val: string): void {
    cachedPreview = val;
    savePreview(val);
    previewSubscribers.forEach(fn => fn(val));
}

// ─── shared image picker ────────────────────────────────────────────────────
// Opens a file dialog, re-encodes the chosen image as JPEG, validates the size
// and stores it. `onSaved` fires only after a successful save.
function openImagePicker(onSaved?: () => void): void {
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

                setPreview(jpegDataUrl);
                showToast("Custom stream preview saved!", Toasts.Type.SUCCESS);
                onSaved?.();
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    };

    input.click();
}

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
    showPanelButton: {
        type: OptionType.BOOLEAN,
        description: "Show a quick-access button in the user panel (next to mute / deafen).",
        default: true,
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
    const [image, setImage] = React.useState<string>(() => cachedPreview);

    // Keep this view in sync with changes made from the user-panel button.
    React.useEffect(() => {
        previewSubscribers.add(setImage);
        return () => void previewSubscribers.delete(setImage);
    }, []);

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
                <Button size={Button.Sizes.SMALL} onClick={() => openImagePicker()}>
                    {image ? "Change Preview" : "Add Preview"}
                </Button>
                {image && (
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                        onClick={() => {
                            setPreview("");
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

// ─── user-panel button ────────────────────────────────────────────────────────
function StreamPreviewIcon({ active = false, className }: { active?: boolean; className?: string; }) {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* monitor / screen being transmitted */}
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            {/* upload / broadcast arrow on the screen */}
            <path d="M12 13.5v-6" />
            <path d="M9.3 10.2 12 7.5l2.7 2.7" />
            {/* red slash while the fake preview is off */}
            {!active && <path d="M4 4 20 20" stroke="var(--status-danger)" />}
        </svg>
    );
}

function StreamPreviewButton({ iconForeground, hideTooltips, nameplate }: UserAreaRenderProps) {
    const { streamPreview, showPanelButton } = settings.use(["streamPreview", "showPanelButton"]);

    if (!showPanelButton) return null;

    return (
        <UserAreaButton
            tooltipText={hideTooltips ? void 0 : streamPreview
                ? "Fake Stream Preview: On  •  right-click to change image"
                : "Fake Stream Preview: Off  •  right-click to set image"}
            icon={<StreamPreviewIcon active={streamPreview} className={iconForeground} />}
            role="switch"
            aria-checked={streamPreview}
            redGlow={!streamPreview}
            plated={nameplate != null}
            onClick={() => {
                const next = !settings.store.streamPreview;
                settings.store.streamPreview = next;
                showToast(
                    next ? "Fake stream preview enabled." : "Fake stream preview disabled.",
                    Toasts.Type.SUCCESS,
                );
            }}
            onContextMenu={e => {
                e.preventDefault();
                openImagePicker(() => { settings.store.streamPreview = true; });
            }}
        />
    );
}

const StreamPreviewUserAreaButton: UserAreaButtonFactory = props => <StreamPreviewButton {...props} />;

// ─── plugin ───────────────────────────────────────────────────────────────────
export default definePlugin({
    name: "CustomStreamPreview",
    description:
        "Prevents Discord from capturing your screen as a stream thumbnail. " +
        "Optionally replaces it with a custom static image.",
    authors: [{ id: 1288832011452153910n, name: "overocai" }],
    dependencies: ["UserAreaAPI"],

    settings,

    userAreaButton: {
        icon: StreamPreviewIcon,
        render: StreamPreviewUserAreaButton,
    },

    // ─── webpack patch ─────────────────────────────────────────────────────────
    //
    // Target: ApplicationStreamPreviewUploadManager
    //
    // Original:  let h = Uo.toDataURL("image/jpeg");
    // Patched:   let h = $self._getStreamPreview(Uo.toDataURL("image/jpeg")); if (!h) return;
    //
    // `\i` (Vencord identifier token) matches multi-char minified names like
    // `Uo` — the old single-`.` pattern broke when Discord renamed the canvas.
    //
    patches: [
        {
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /((?:let|const|var) (\i)=)(\i\.toDataURL\("image\/jpeg"\));/,
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
