# Filter FabJS brand theme

The v2.1.2 interface adapts the supplied Obsidian palette into semantic UI roles. The source colours remain recognizable, but each accent has a limited job so the image editor stays legible and visually calm.

## Core tokens

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| App background | `--bg` | `#08050D` | Browser frame and deepest surface |
| Panel | `--panel` | `#110A19` | Navigation, sidebar, and status bar |
| Raised panel | `--panel2` | `#180E23` | Sections, fields, and dialogs |
| Active surface | `--panel3` | `#24142F` | Selected and raised controls |
| Primary text | `--text` | `#CDDDB7` | Body copy and labels |
| Strong text | `--text-strong` | `#F6EFC4` | Brand and high-emphasis text |
| Heading | `--heading` | `#ECE49D` | Section and dialog headings |
| Muted text | `--muted` | `#91A085` | Secondary labels and metadata |
| Primary action | `--accent` | `#E1EC1A` | Render/open actions, focus, and progress |
| Edited state | `--accent2` | `#C429A3` | Unsaved formula edits and expressive highlights |
| Technical | `--info` | `#088DBF` | Renderer and GPU-related information |
| Code background | `--code-bg` | `#061005` | Formula and code surfaces |
| Code text | `--code-text` | `#A8D59A` | Formula text and reference chips |

## Usage rules

- Chartreuse is reserved for the primary action, keyboard focus, ranges, and render progress. It should not become a general decorative colour.
- Magenta communicates an edited-but-not-rendered formula and supports the logo glow. It is not used for validation errors.
- Cyan identifies technical renderer information, while red remains reserved for destructive and invalid states.
- Parchment headings establish hierarchy; sage handles sustained reading with less glare than pure white.
- The preview stage remains neutral `#090B0F` / `#10141B`, and its transparency checkerboard remains neutral grey. Aubergine must not tint pixels around the artwork.
- RGBA channel labels retain distinct channel colours so they remain scannable independently of the brand accents.

The automated theme smoke test protects the key contrast relationships, neutral preview boundary, semantic accent assignments, and current GitHub profile URL.
