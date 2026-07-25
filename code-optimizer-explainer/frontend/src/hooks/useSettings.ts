import { useState, useEffect } from "react";

export type FontSize = 12 | 14 | 16;
export type ResponseLength = "short" | "balanced" | "detailed";
export type OutputFormat = "markdown" | "plaintext";
export type MaxLines = 500 | 1000 | 2000 | 5000;

export interface UserSettings {
  autoDetectLanguage: boolean;
  maxLines: MaxLines;
  fontSize: FontSize;
  copyOnSubmit: boolean;
  responseLength: ResponseLength;
  outputFormat: OutputFormat;
}

const DEFAULTS: UserSettings = {
  autoDetectLanguage: true,
  maxLines: 5000,
  fontSize: 14,
  copyOnSubmit: false,
  responseLength: "balanced",
  outputFormat: "markdown",
};

const STORAGE_KEY = "opticode_user_settings";

function load(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}
