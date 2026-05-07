//! Palette + color-math used by district and subdistrict assignment.
//!
//! Pure: no I/O, no allocation beyond returned `String`s. All HSL/RGB
//! conversions round-trip via `f32` and are validated by the tests at the
//! bottom of this file.

use super::LayoutMode;

const DISTRICT_COLORS: [&str; 12] = [
    "#00e5ff", "#00e676", "#448aff", "#ffea00", "#b388ff", "#ff9100", "#ff4081", "#1de9b6",
    "#aeea00", "#ff1744", "#8c9eff", "#ffc400",
];

const EXTENSION_COLORS: &[(&str, &str)] = &[
    (".ts", "#3178c6"),
    (".tsx", "#61dafb"),
    (".js", "#f7df1e"),
    (".jsx", "#61dafb"),
    (".py", "#3572a5"),
    (".css", "#264de4"),
    (".scss", "#cd6799"),
    (".html", "#e34c26"),
    (".json", "#a0a0a0"),
    (".md", "#083fa1"),
    (".mdx", "#1f6feb"),
    (".yaml", "#cb171e"),
    (".yml", "#cb171e"),
    (".toml", "#9c4221"),
    (".rs", "#dea584"),
    (".go", "#00add8"),
    (".java", "#b07219"),
    (".rb", "#cc342d"),
    (".vue", "#42b883"),
    (".svelte", "#ff3e00"),
    (".astro", "#ff5d01"),
    (".cu", "#76b900"),
    (".cuh", "#76b900"),
    (".ptx", "#76b900"),
    (".cubin", "#5a8f00"),
    (".fatbin", "#5a8f00"),
];

pub(super) fn district_color(index: usize, name: &str, mode: LayoutMode) -> String {
    if matches!(mode, LayoutMode::Extension) {
        if let Some((_, color)) = EXTENSION_COLORS.iter().find(|(ext, _)| *ext == name) {
            return color.to_string();
        }
    }
    DISTRICT_COLORS[index % DISTRICT_COLORS.len()].to_string()
}

pub(super) fn subdistrict_color(index: usize, total: usize, base_color: &str) -> String {
    let (h, s, l) = hex_to_hsl(base_color);
    let hue_shift = if total > 1 {
        index as f32 / (total - 1) as f32 * 0.15 - 0.075
    } else {
        0.0
    };
    let lightness_shift = if index % 2 == 0 { 0.05 } else { -0.05 };
    hsl_to_hex(
        (h + hue_shift).rem_euclid(1.0),
        s.clamp(0.3, 1.0),
        (l + lightness_shift).clamp(0.25, 0.8),
    )
}

fn hex_to_hsl(hex: &str) -> (f32, f32, f32) {
    let color = u32::from_str_radix(hex.trim_start_matches('#'), 16).unwrap_or(0x00e5ff);
    let r = ((color >> 16) & 0xff) as f32 / 255.0;
    let g = ((color >> 8) & 0xff) as f32 / 255.0;
    let b = (color & 0xff) as f32 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f32::EPSILON {
        return (0.0, 0.0, l);
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let h = if (max - r).abs() < f32::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f32::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    (h, s, l)
}

fn hue_to_rgb(p: f32, q: f32, mut t: f32) -> f32 {
    if t < 0.0 {
        t += 1.0;
    }
    if t > 1.0 {
        t -= 1.0;
    }
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

fn hsl_to_hex(h: f32, s: f32, l: f32) -> String {
    if s == 0.0 {
        let value = (l * 255.0).round() as u8;
        return format!("#{value:02x}{value:02x}{value:02x}");
    }

    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;
    let r = (hue_to_rgb(p, q, h + 1.0 / 3.0) * 255.0).round() as u8;
    let g = (hue_to_rgb(p, q, h) * 255.0).round() as u8;
    let b = (hue_to_rgb(p, q, h - 1.0 / 3.0) * 255.0).round() as u8;
    format!("#{r:02x}{g:02x}{b:02x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_color_matches_known_extension() {
        let c = district_color(0, ".ts", LayoutMode::Extension);
        assert_eq!(c, "#3178c6");
    }

    #[test]
    fn extension_color_falls_back_to_palette_when_unknown() {
        let c = district_color(3, ".unknown-ext", LayoutMode::Extension);
        assert_eq!(c, DISTRICT_COLORS[3]);
    }

    #[test]
    fn folder_mode_ignores_extension_palette() {
        let c = district_color(0, ".ts", LayoutMode::Folder);
        assert_eq!(c, DISTRICT_COLORS[0]);
    }

    #[test]
    fn district_palette_wraps() {
        let c = district_color(DISTRICT_COLORS.len(), "anything", LayoutMode::Folder);
        assert_eq!(c, DISTRICT_COLORS[0]);
    }

    #[test]
    fn hex_round_trips_through_hsl() {
        for hex in DISTRICT_COLORS {
            let (h, s, l) = hex_to_hsl(hex);
            let back = hsl_to_hex(h, s, l);
            assert_eq!(back, hex, "round-trip failed for {hex}");
        }
    }

    #[test]
    fn subdistrict_color_is_deterministic() {
        let a = subdistrict_color(2, 5, "#3178c6");
        let b = subdistrict_color(2, 5, "#3178c6");
        assert_eq!(a, b);
    }

    #[test]
    fn subdistrict_with_single_total_returns_shifted_lightness_only() {
        let base = "#3178c6";
        let c = subdistrict_color(0, 1, base);
        // Hue shift is 0 when total == 1; only lightness moves, so the
        // result should differ from the input but stay a valid hex.
        assert_ne!(c, base);
        assert_eq!(c.len(), 7);
        assert!(c.starts_with('#'));
    }
}
