# V5.4 · Data → languages → body

2026-11-25

## Experience

The first screen is a dense, moving wall drawn from the existing 144 sourced facts. The six topics are interleaved, so heat, care, housing, water, connectivity and vacancy appear together. Values, units, geography and years are preserved; no random statistics are generated.

After 1.35 seconds, the rows move apart over 1.9 seconds, each with a slightly different split and delay. Seven small CSS 3D cubes float into view: English, Spanish, French, Traditional Chinese, Japanese, Korean and Arabic. Every face repeats its native language name in aligned rows. The native caption remains readable beneath the cube; hover and keyboard focus invert its faces.

Clicking a cube locks the transaction. The other six cubes converge and shrink into it while it grows and moves to the centre. Its language texture becomes the six translated scene titles. The final size, centre and rotation match the main selector. This takes 2.65 seconds; only after it finishes does the application call `getUserMedia`. There is no ENTER button or top-right language dropdown.

The main selector retains its existing fist rotation and four-second open-palm dwell. Its return arrow and END stop the camera/worker and return to the language cubes. Returning while a camera request is pending invalidates that session and stops any stream that arrives later. An unfinished entrance cannot invoke camera retry or enter a scene.

## Rendering and access

- A dedicated entrance canvas owns the data curtain; the body renderer is paused during arrival. Data atlases are cached and stop drawing once the curtain has left the display.
- Cube layout has landscape and portrait arrangements. Reduced-motion preference shortens the entry/merge and freezes floating motion while preserving language choice and camera ordering.
- Native buttons support click, touch and keyboard Enter/Space. Decorative face textures are hidden from assistive technology. Arabic words remain shaped as complete strings; the geometry stays left-to-right regardless of the selected interface direction.
- `?demo=1` uses the whole entrance but never requests a camera. Explicit `?demo=1&scene=…` links keep the existing camera-free scene inspection shortcut.

## Verification

- All 88 Node tests pass: 80 existing checks plus 8 new sequence/layout checks. They cover phase ordering, no handoff before selection/merge, exactly one handoff, invalid inputs, cancellation, all seven choices, reduced motion, non-overlapping layouts at six viewport sizes, and the centred menu endpoint.
- Browser walkthrough clicked all seven language cubes, waited for the main selector, checked the translated caption and centred geometry, then returned to the constellation. All seven reached the selector, no old dropdown remained, and the fresh test tab recorded no errors or warnings.
- Browser inspection at 390 × 844 verified all seven cubes and captions fit without overlap. Default 1280 × 720 was also checked. The temporary viewport override was reset.
- The normal camera flow stayed in the language entrance until a cube was chosen; selection first showed the merge, then camera loading. Returning from loading restored the constellation. Physical camera permission UI, live body tracking and M4 frame rate were not verified in this environment.
- A transition bug discovered during the walkthrough was fixed: entering preview now starts its body rendering on the following frame, after the demo pose is available, rather than using an empty pose in the same frame as the handoff.

Screenshots are kept in the workspace `outputs/v54/`. No personal camera frames were captured or uploaded. Data sources and interaction models for the six scenes are unchanged.
