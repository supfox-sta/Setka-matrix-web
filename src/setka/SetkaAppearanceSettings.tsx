/*
Copyright 2026 Setka Matrix
SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
*/

import React, { useCallback, useEffect, useState } from "react";

import { _t } from "../languageHandler";
import AccessibleButton from "../components/views/elements/AccessibleButton";
import Field from "../components/views/elements/Field";
import {
    readSetkaAppearance,
    SETKA_APPEARANCE_DEFAULTS,
    SETKA_INTERFACE_PRESETS,
    setkaAppearanceStore,
    SETKA_APPEARANCE_CHANGED,
    type SetkaAppearanceSettings as SetkaAppearanceState,
} from "./setkaAppearanceStore";

const ACCENT_PRESETS = ["#e53935", "#7c5cff", "#ff6b9d", "#00bcd4", "#ffb300", "#ffffff"];

interface ColorPickerRowProps {
    label: string;
    hexLabel: string;
    value: string;
    presets: readonly string[];
    onChange: (color: string) => void;
}

const ColorPickerRow: React.FC<ColorPickerRowProps> = ({ label, hexLabel, value, presets, onChange }) => (
    <div className="mx_SetkaAppearanceSettings_colorRow">
        <span className="mx_SetkaAppearanceSettings_colorLabel">{label}</span>
        <div className="mx_SetkaAppearanceSettings_presets">
            {presets.map((color) => (
                <AccessibleButton
                    key={color}
                    className={
                        "mx_SetkaAppearanceSettings_swatch" +
                        (value.toLowerCase() === color ? " mx_SetkaAppearanceSettings_swatch_active" : "")
                    }
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                    aria-label={color}
                />
            ))}
        </div>
        <Field element="input" type="text" label={hexLabel} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
);

const SetkaAppearanceSettings: React.FC = () => {
    const [settings, setSettings] = useState<SetkaAppearanceState>(() => readSetkaAppearance());

    useEffect(() => {
        const onChange = (): void => setSettings(readSetkaAppearance());
        setkaAppearanceStore.on(SETKA_APPEARANCE_CHANGED, onChange);
        return () => setkaAppearanceStore.off(SETKA_APPEARANCE_CHANGED, onChange);
    }, []);

    const persist = useCallback((next: SetkaAppearanceState) => {
        setSettings(next);
        setkaAppearanceStore.setSettings(next);
    }, []);

    const onGlassOpacity = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            persist({ ...settings, glassOpacity: Number(event.target.value) });
        },
        [persist, settings],
    );

    const onBlurPx = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            persist({ ...settings, blurPx: Number(event.target.value) });
        },
        [persist, settings],
    );

    const onInterfaceColor = useCallback(
        (color: string) => {
            persist({ ...settings, interfaceColor: color });
        },
        [persist, settings],
    );

    const onAccentColor = useCallback(
        (color: string) => {
            persist({ ...settings, accentColor: color });
        },
        [persist, settings],
    );

    const onReset = useCallback(() => {
        persist({ ...SETKA_APPEARANCE_DEFAULTS });
    }, [persist]);

    const onGlassEnabled = useCallback(
        (enabled: boolean) => {
            persist({ ...settings, glassEnabled: enabled });
        },
        [persist, settings],
    );

    return (
        <div className="mx_SetkaAppearanceSettings">
            <p className="mx_SetkaAppearanceSettings_hint">{_t("setka|appearance|hint")}</p>

            <section className="mx_SetkaAppearanceSettings_section">
                <h3 className="mx_SetkaAppearanceSettings_sectionTitle">{_t("setka|appearance|section_colors")}</h3>
                <ColorPickerRow
                    label={_t("setka|appearance|interface_color")}
                    hexLabel={_t("setka|appearance|interface_hex")}
                    value={settings.interfaceColor}
                    presets={SETKA_INTERFACE_PRESETS}
                    onChange={onInterfaceColor}
                />
                <ColorPickerRow
                    label={_t("setka|appearance|accent_color")}
                    hexLabel={_t("setka|appearance|accent_hex")}
                    value={settings.accentColor}
                    presets={ACCENT_PRESETS}
                    onChange={onAccentColor}
                />
            </section>

            <section className="mx_SetkaAppearanceSettings_section">
                <h3 className="mx_SetkaAppearanceSettings_sectionTitle">{_t("setka|appearance|section_glass")}</h3>

                <label className="mx_SetkaAppearanceSettings_field mx_SetkaAppearanceSettings_toggle">
                    <span>{_t("setka|appearance|glass_enabled")}</span>
                    <input
                        type="checkbox"
                        checked={settings.glassEnabled}
                        onChange={(event) => onGlassEnabled(event.target.checked)}
                    />
                </label>

                <label className="mx_SetkaAppearanceSettings_field">
                    <span>{_t("setka|appearance|glass_opacity")}</span>
                    <input
                        type="range"
                        min={12}
                        max={48}
                        step={1}
                        value={settings.glassOpacity}
                        onChange={onGlassOpacity}
                        disabled={!settings.glassEnabled}
                    />
                    <span className="mx_SetkaAppearanceSettings_value">{settings.glassOpacity}%</span>
                </label>

                <label className="mx_SetkaAppearanceSettings_field">
                    <span>{_t("setka|appearance|blur")}</span>
                    <input
                        type="range"
                        min={0}
                        max={24}
                        step={1}
                        value={settings.blurPx}
                        onChange={onBlurPx}
                        disabled={!settings.glassEnabled}
                    />
                    <span className="mx_SetkaAppearanceSettings_value">{settings.blurPx}px</span>
                </label>
            </section>

            <AccessibleButton kind="link_inline" onClick={onReset}>
                {_t("setka|appearance|reset")}
            </AccessibleButton>
        </div>
    );
};

export default SetkaAppearanceSettings;
