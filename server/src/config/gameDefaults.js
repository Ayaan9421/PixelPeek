export const SETTINGS_LIMITS = {
        maxPlayers: { min: 2, max: 20, default: 8 },
        guessTimeSec: { min: 30, max: 180, default: 90 },
        pickTimeSec: { min: 10, max: 60, default: 20 },
        numRounds: { min: 1, max: 30, default: 3 },
        numHints: { min: 0, max: 5, default: 3 },
        revealImageSec: { min: 3, max: 10, default: 4 }
}

// Boolean toggles — not in SETTINGS_LIMITS (which handles numeric ranges)
// but normalised alongside them.
export const BOOLEAN_SETTINGS = {
        enableNsfwCheck: { default: true },
        enableClipCheck: { default: true },
}

export function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max)
}

export function normalizeSettings(rawSettings = {}) {
        const normalized = {}
        for (const [key, { min, max, default: def }] of Object.entries(SETTINGS_LIMITS)) {
                const raw = rawSettings[key]
                const num = typeof raw === 'number' && !Number.isNaN(raw) ? raw : def
                normalized[key] = clamp(Math.round(num), min, max)
        }
        // Boolean settings
        for (const [key, { default: def }] of Object.entries(BOOLEAN_SETTINGS)) {
                normalized[key] = typeof rawSettings[key] === 'boolean' ? rawSettings[key] : def
        }
        return normalized
}

export const RECONNECT_GRACE_MS = 30_000

export const IMAGE_LIMITS = {
        maxBytes: 8 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
}


// Crop reveal mechanic during the guessing phase. checkpoints[i] is the
// fraction of guessTimeSec that must have elapsed before expansion #(i+1)
// is allowed. growthFactor scales both crop dimensions each expansion,
// anchored at the corner opposite the one the picker chose.
export const CROP_EXPANSION = {
        maxExpansions: 2,
        checkpoints: [0.5, 0.8],
        growthFactor: 1.6,
}