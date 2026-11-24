# V5.3 · THIRST / frosted glass

Only THIRST changes visual treatment and interaction. The other five scenes keep their current artwork. The menu's centred fist rotation and four-second palm dwell remain intact.

## Figure and depth

The reference is interpreted as a white translucent plane, a remote soft monochrome figure and darker, sharper contact hands. No reference pixels or watermark are used as an asset.

THIRST renders the worker's original person/background mask, bypassing RGB mosaic sampling. A shoulder-size depth estimate controls the broad silhouette's blur and opacity. Two blur layers create a soft outer penumbra and denser core. A continuous forearm opacity gradient joins that shadow to each contact hand; no separate capsule segments remain visible. Tracked hand bones are filled as solid palm/finger silhouettes, never exposed as a joint diagram. Hands have no camera RGB or skin texture.

The tracker now retains and adaptively filters all21 hand points, aligning them with its smoothed palm and short prediction. Its open/fist classification and menu palm centre retain their existing behavior. Pose z is smoothed. Hand-to-glass contact combines apparent hand size, palm/shoulder proportions and the wrist's pose-depth offset from the shoulders. A receding hand softens as its apparent size decreases. MediaPipe hand z is wrist-relative, so it is **not** compared directly with pose z or treated as an absolute camera distance. The result is an artistic monocular depth estimate; it does not measure physical distance, contact or temperature.

The camera path uses the actual segmentation mask and actual hand points. The mouse preview uses a procedural monochrome upper body and synthetic21-point open hands; it does not imply webcam validation.

## Glass and water

- A128-column persistent fog field covers the scene area above the data dock. The dense text retains the common SPACE size and tight spacing, with slow5px/s movement so a wiped window remains readable. Arabic facts are rendered as complete bidirectional runs so word order and numerical sequences remain intact.
- Both open hands continuously sweep soft elliptical palm and fingertip footprints. Intermediate stamps prevent gaps during motion. A missing hand or large tracking jump starts a fresh stroke, without a line across the display.
- Cleared regions stay clear for3.5s, then approach fog again at a slow exponential rate. The hand does not have to keep moving to maintain local contact. Fullscreen resize preserves the moisture pattern.
- The scene is composited from a clear data/figure layer and a softly blurred, veiled counterpart, using the moisture field as an alpha mask. Only hands near the glass receive the final sharp monochrome treatment.
- Pinned small beads, heavier falling beads, slight lateral movement, bright rims, local refraction and wet trails make the surface legible. A sweep pushes beads to the palm's edge; beads coalesce conserving cubic-radius volume and momentum, then heavier beads drain under gravity.
- No bucket, blue/ochre categories, illustrative litres or emergency person-days remain in the active interaction. Fog/beads are an artistic barrier metaphor, not a contamination model. Cleared-glass percentage describes this session only. End cards separately show WHO/UNICEF JMP's global service-access gap and2.1bn people lacking safely managed drinking water in2024.

## Primary technical references

Read2026-11-24:

- [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker):21 normalized hand points and wrist-relative depth.
- [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker): body landmarks and their separate depth reference.
- [Canvas compositing](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation): alpha masking with destination-in/out.
- [Canvas filters](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter): blur of offscreen body and glass layers. Desktop Chrome is the tested target.
- [Canvas drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage): cached data/sprites and bead refraction crops.

Water data and source definitions are unchanged:144 sourced cards across six scenes,24 per scene, common geography in all seven languages. See `v5-global-sources.md`.

## Validation

76 Node tests pass. New cases cover continuous two-hand wipes, fog return delay, tracking loss, resize persistence, pushed water beads, volume/momentum conservation, depth ordering,21-point smoothing, the new pose gate seven-language copy and whole Arabic bidirectional text runs. Existing cube, thermal, type, source and physics checks remain passing.

Browser preview confirmed white background, a soft figure, sharp hands, continuous readable windows, no in-scene prompt panel, separated bottom data, and a Chinese result containing session glass area,26.33% world service-access gap and2.1bn people. The old bucket finish path is removed.

The dedicated `tests/fixtures/glass-browser` harness runs the **production worker and tracker**, then renders their real mask and hands through the production glass renderer. With Google's public `male_full_height_hands.jpg`, preserving its portrait aspect and resizing to480px across, it returned33 pose landmarks, two21-point hands and a480×752 person mask. Cold/warm still-frame inference:493.8 /31.4ms. The60-frame glass submission median/p95 was1.40 /4.10ms at1280×720;3.21% of glass cleared. These are a static-photo pipeline check and CPU submission timings, **not webcam FPS or M4 hardware measurements**. The very first frame includes cold initialization overhead.

Actual M4 webcam lighting, foreshortening, occlusion and finger stability still require on-device testing. No webcam frame is uploaded or retained.
