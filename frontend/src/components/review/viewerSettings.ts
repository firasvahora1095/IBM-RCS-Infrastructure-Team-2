/** The Auditor's own viewing controls. Kept by the page, so a session re-auth restores them exactly. */
export interface ViewerSettings {
  blur: number;
  grayscale: boolean;
  muted: boolean;
  volume: number;
}

/** Every review opens fully protected: maximum blur (AR-PV-03/04), muted, volume 0. */
export const PROTECTED_VIEWER_SETTINGS: ViewerSettings = { blur: 100, grayscale: false, muted: true, volume: 0 };
