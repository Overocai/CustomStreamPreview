/**
 * Minimal type stubs for Vencord internal APIs.
 * Used only for IDE type-checking outside the Vencord repo.
 * When the plugin is placed inside <Vencord>/src/userplugins/ these stubs
 * are ignored — the real types from the Vencord source tree take over.
 */

import type * as ReactNS from "react";

// ─── @utils/types ─────────────────────────────────────────────────────────────

export const enum OptionType {
    STRING    = 0,
    NUMBER    = 1,
    BIGINT    = 2,
    BOOLEAN   = 3,
    SELECT    = 4,
    SLIDER    = 5,
    COMPONENT = 6,
    CUSTOM    = 7,
}

export interface PatchDef {
    find: string;
    noWarn?: boolean;
    replacement:
        | { match: RegExp | string; replace: string | ((...args: string[]) => string) }
        | Array<{ match: RegExp | string; replace: string | ((...args: string[]) => string) }>;
}

export interface PluginDef {
    name: string;
    description: string;
    authors: Array<{ id: bigint; name: string }>;
    settings?: any;
    patches?: PatchDef[];
    start?(): void | Promise<void>;
    stop?(): void;
    [key: string]: any;
}

export default function definePlugin<T extends PluginDef>(def: T): T;

// ─── @api/Settings ────────────────────────────────────────────────────────────

type OptionBase = {
    description: string;
    restartNeeded?: boolean;
    onChange?(value: any): void;
    disabled?(): boolean;
};

type OptionBoolean = OptionBase & { type: OptionType.BOOLEAN; default: boolean };
type OptionString  = OptionBase & { type: OptionType.STRING;  default: string };
type OptionNumber  = OptionBase & { type: OptionType.NUMBER;  default: number };
type OptionComponent = OptionBase & {
    type: OptionType.COMPONENT;
    component: (props?: any) => ReactNS.ReactElement | null;
};

type AnyOption = OptionBoolean | OptionString | OptionNumber | OptionComponent;
type SettingsDefinition = Record<string, AnyOption>;

type StoreOf<D extends SettingsDefinition> = {
    [K in keyof D]: D[K] extends OptionBoolean ? boolean
                  : D[K] extends OptionString  ? string
                  : D[K] extends OptionNumber  ? number
                  : never;
};

export interface DefinedSettings<D extends SettingsDefinition> {
    store: StoreOf<D>;
    use<K extends keyof D>(keys?: K[]): Pick<StoreOf<D>, K & string>;
}

export function definePluginSettings<D extends SettingsDefinition>(
    def: D
): DefinedSettings<D>;

// ─── @utils/Logger ────────────────────────────────────────────────────────────

export declare class Logger {
    constructor(name: string, color?: string);
    log(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

// ─── @webpack/common ─────────────────────────────────────────────────────────

export * as React from "react";

export declare const Forms: {
    FormTitle:   ReactNS.FC<ReactNS.PropsWithChildren<{ tag?: string; style?: ReactNS.CSSProperties }>>;
    FormText:    ReactNS.FC<ReactNS.PropsWithChildren<{ style?: ReactNS.CSSProperties; variant?: string }>>;
    FormDivider: ReactNS.FC<{ style?: ReactNS.CSSProperties }>;
    FormSection: ReactNS.FC<ReactNS.PropsWithChildren<{ title?: string; style?: ReactNS.CSSProperties }>>;
};

export declare const Button: ReactNS.FC<
    ReactNS.PropsWithChildren<{
        onClick?(): void;
        size?: string;
        color?: string;
        look?: string;
        disabled?: boolean;
        style?: ReactNS.CSSProperties;
        [key: string]: any;
    }>
> & {
    Sizes:  { SMALL: string; MEDIUM: string; LARGE: string; XLARGE: string; MIN: string; MAX: string; ICON: string };
    Colors: { PRIMARY: string; BRAND: string; RED: string; GREEN: string; YELLOW: string; WHITE: string; BLACK: string; LINK: string; TRANSPARENT: string };
    Looks:  { FILLED: string; INVERTED: string; OUTLINED: string; LINK: string; BLANK: string };
};

export declare const Toasts: {
    show(options: { message: string; type?: number; id?: string }): void;
    Type: { SUCCESS: number; FAILURE: number; WARNING: number; CUSTOM: number };
};

export declare function showToast(message: string, type?: number): void;
