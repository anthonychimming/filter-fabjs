# Bundled fonts

Only upright variable faces are shipped. Both use SIL Open Font License 1.1;
the unmodified copyright and license notices accompany each distribution.
No font service, package dependency, or build-time download is required.

## Inter 4.1

- Official release: https://github.com/rsms/inter/releases/tag/v4.1
- Archive: https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
- `web/InterVariable.woff2` copied unchanged to `InterVariable.woff2`.
- `LICENSE.txt` copied unchanged to `OFL-Inter.txt`.
- Verified axes: weight 100–900; optical size 14–32. CSS uses automatic optical sizing.
- WOFF2 SHA-256: `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`.
- Archive SHA-256: `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`.

## JetBrains Mono 2.304

- Official release: https://github.com/JetBrains/JetBrainsMono/releases/tag/v2.304
- Archive: https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip
- This release distributes the variable face as `fonts/variable/JetBrainsMono[wght].ttf`,
  not WOFF2. The bundled `JetBrainsMono-Variable.woff2` is a format conversion of
  that exact file using FontTools 4.60.1 with Brotli 1.2.0. No subsetting,
  instancing, glyph edits, or axis changes were applied. Glyph order and the
  compiled variation-axis table were checked after conversion.
- `OFL.txt` copied unchanged to `OFL-JetBrainsMono.txt`.
- Verified weight axis: 100–800.
- Original TTF SHA-256: `662a196d58f1183bf2d77428b6d5283fe3f45161ab021bea4036bc98e5cac016`.
- WOFF2 SHA-256: `fe7b565a583febc11ec94fa9aacf8a8180c21efe601f174a33c71a0b596346b7`.
- Archive SHA-256: `6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf`.

To reproduce the conversion with the versions above installed in a temporary
Python environment (not as project dependencies):

```python
from fontTools.ttLib import TTFont
font = TTFont('JetBrainsMono[wght].ttf', recalcTimestamp=False)
font.flavor = 'woff2'
font.save('JetBrainsMono-Variable.woff2')
```

The production build fingerprints and copies both fonts to `site/assets/fonts/`
alongside these notices. The standalone HTML embeds both fonts as WOFF2 data
URLs and includes these notices in its stylesheet. Tests pin the vendored
font bytes; intentional font upgrades must update this record and the tests.
