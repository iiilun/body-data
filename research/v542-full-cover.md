# V5.4.2 · Full coverage and sharper zoom

2026-11-25

The previous transition started its black veil too early. This version projects all eight cube vertices using the frozen selection orientation and CSS perspective, builds their convex hull, and solves the zoom required to cover all four viewport corners. The actual approach continues substantially beyond that coverage threshold. Black fading starts only after full coverage, then reaches opacity 1 before revealing the briefing.

Normal timing is now 1.65 seconds for the approach, 0.2 seconds for black and 1.3 seconds for the briefing to settle. Zoom and opacity use continuous smooth curves; the introduction clock remains paused throughout. Three-second selection and the existing pose countdown remain unchanged.

Instead of magnifying only the original small cube texture, the faces and their native text are repainted at 2×, 4× and 8× layout resolution. Perspective and the outer transform are adjusted inversely, preserving the same visual geometry at each resolution step. Between those steps, only the compositor transform changes. Detail is bounded to avoid unbounded offscreen GPU layers during the very close approach. Normal menu dimensions and font sizes are restored on completion or cancellation.

## Verification

- All 97 Node checks pass. New tests check actual corner coverage before any black fade across four viewport shapes and eight orientations, as well as bounded resolution steps.
- Browser preview verified actual three-second pointer selection, sharper enlarged type, full black at opacity 1 and introduction progress 0%, then the final briefing layout.
- At the tested 827 × 792 viewport, the cube was repainted at a 1920px layout width and 412.8px font size during the approach, while the outer scale was approximately 0.58. This is a larger native glyph rendering, rather than a magnified 51.6px menu font.
- Cancelling at 8× detail restored the 51.6px normal menu font, removed the enlarged layout and hid the black plane. The light HOLD briefing also passed the black handoff. The test tab recorded no errors or warnings.
- Physical M4 camera performance was not measured. No camera pipeline, facts, data sources or publishing permissions were changed.
