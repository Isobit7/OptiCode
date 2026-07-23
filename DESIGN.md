# DESIGN.md
## Visual Design System — Code Optimizer & Explainer

> Reference this file for all UI/styling work. If a new component doesn't fit these tokens, add the new value here first, then use it — don't introduce one-off colors/styles inline.

---

## 1. Aesthetic Direction

Soft, warm, ambient gradient background with a dark, minimal, floating input bar. The gradient feels like a sunset/dawn glow — cool tones at the top fading into warm orange at the bottom — behind clean, high-contrast dark UI elements. The overall feel is calm, modern, and slightly playful rather than corporate/flat.

## 2. Color Palette

### Background Gradient (ambient, radial/diagonal blend)
| Token | Hex (approx) | Usage |
|---|---|---|
| `--gradient-blue` | `#A8C5E0` | Top of background |
| `--gradient-lavender` | `#D9B8D9` | Upper-mid transition |
| `--gradient-pink` | `#EFA8C0` | Mid background |
| `--gradient-orange` | `#F4914A` | Lower-mid background |
| `--gradient-deep-orange` | `#E8590C` | Bottom glow / radial center |

Implementation: a soft multi-stop gradient (diagonal or radial), blue → lavender → pink → orange → deep orange, with the deep orange concentrated as a soft glow toward the bottom center (like a sunset/sunrise light source).

```css
background: radial-gradient(
  ellipse at 50% 120%,
  #E8590C 0%,
  #F4914A 35%,
  #EFA8C0 60%,
  #D9B8D9 80%,
  #A8C5E0 100%
);
```

### UI Surface (input bar / cards / panels)
| Token | Hex (approx) | Usage |
|---|---|---|
| `--surface-dark` | `#1C1C22` | Primary UI surface (input bar background) |
| `--surface-dark-border` | `#2A2A32` | Subtle border/divider on dark surface |
| `--text-on-dark-primary` | `#E5E5EA` | Placeholder/body text on dark surface |
| `--text-on-dark-muted` | `#8A8A94` | Icon default color, secondary text |
| `--surface-light` | `#FFFFFF` | Accent button (e.g., mic button) |
| `--icon-on-light` | `#1C1C22` | Icon color on the white accent button |

### Dividers
| Token | Hex (approx) | Usage |
|---|---|---|
| `--divider` | `#3A3A42` | Thin vertical divider between icon groups in toolbar |

## 3. Component Reference — Input Bar

- **Shape:** fully rounded ends (pill/capsule shape), large border-radius (~28-32px, effectively `border-radius: 999px` on a fixed-height bar)
- **Background:** `--surface-dark`, solid, no gradient inside the bar itself
- **Elevation:** soft drop shadow beneath the bar so it visually floats above the gradient background
- **Padding:** generous internal padding (~20-24px horizontal, ~16-20px vertical)
- **Placeholder text:** `--text-on-dark-primary`, medium weight, left-aligned, sits in the upper portion of the bar
- **Toolbar row (bottom of bar):**
  - Left-aligned icon group: attachment/paperclip, globe, settings/gear, folder — each in `--text-on-dark-muted`, consistent stroke-width outline style (not filled)
  - Thin vertical divider (`--divider`) separates icon sub-groups
  - Right-aligned: circular white button (`--surface-light`) containing a microphone icon in `--icon-on-light` — the one high-contrast accent element in the whole bar

## 4. Icon Style

- Outline/stroke icons (not filled), consistent stroke width
- Default color `--text-on-dark-muted` on dark surfaces
- Icons sit inline in a single row, evenly spaced, small size (~18-20px)

## 5. Typography

- Sans-serif, modern, rounded-friendly typeface (e.g., Inter, SF Pro, or similar system font)
- Placeholder/input text: medium weight, comfortable reading size (~15-16px)
- No heavy typographic hierarchy needed for this component — it's intentionally minimal

## 6. Spacing & Shape Principles

- Heavy use of rounded corners throughout — nothing sharp-edged
- Generous whitespace/padding inside dark surfaces
- Floating-card feel: dark elements should always read as sitting "above" the gradient, via shadow, not by touching/bleeding into the background

## 7. Usage Notes for This Project

- Use the gradient background treatment for landing/hero sections or the main app shell background — not behind dense code/text areas (readability first; code panels should sit on a plain dark or light surface, not directly on the gradient).
- The dark pill-shaped input bar pattern is a strong candidate for the code input field or a chat-style "ask about this code" component.
- Keep the white circular accent button pattern reserved for a single primary action per view (e.g., "Run" or "Submit") — don't overuse the high-contrast accent or it loses its emphasis.
