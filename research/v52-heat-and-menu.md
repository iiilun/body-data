# V5.2 · cube, dense type and heat

## Interaction contract

The cube turns continuously at 5°/s around Y (72 s per revolution), with a slow X tilt exposing top and bottom. Closed_Fist starts a relative positional clutch; moving the fist translates the object in screen space, with 22/s exponential smoothing and viewport bounds. Releasing keeps the translated position. Returning an open hand cannot undo a drag. A hand change or tracking loss starts a fresh clutch, without snapping the cube.

Open_Palm over an actual CSS-projected face immediately makes it white. Rotation pauses while pointing. A 112px cursor contains an 88px diameter progress ring; four continuous seconds commit that face. A face change, tracking loss, closing the hand, leaving the cube, or moving more than 4.5% of the normalized viewport resets the dwell. Small tracking jitter is tolerated. Fists never select. No instant click/space selection in the preview; mouse-down simulates the grip and mouse-up simulates an open palm.

Seven-language titles repeat horizontally and vertically at one shared face font scale, without shrinking short CJK names into one sparse row. Arabic uses the bundled licensed Noto font and RTL layout.

## Shared data field

All six scenes use the SPACE type scale: `clamp(viewportHeight * .032, 20, 31)` px, .98× line spacing and −.055em tracking. Values, indicator labels, geography and years remain in every sentence. Full fact sequences are staggered between lanes, with 24 sourced observations per scene retained. SPACE keeps its elastic silhouette avoidance; other scenes use cached dense text atlases. Foreground physical cards, results and live counters keep their functional hierarchy.

## Heat-effect research and choice

Primary API references, read 2026-11-24:

- [MDN Canvas drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage): source rectangles and scaled destination rectangles enable strip displacement from a reusable text image.
- [MDN Canvas filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter): light blur can be applied once to the warped layer; this API is not uniformly available, so the implementation has a two-offset softening fallback.
- [MDN SVG feTurbulence](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence) and [feDisplacementMap](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap): smooth procedural fields can displace an image. A whole-screen SVG filter would also warp protected text unless separately masked.
- [WebGL Fundamentals: image processing](https://webglfundamentals.org/webgl/lessons/webgl-image-processing.html): texture sampling can offset/blur images in a shader. Considered for a future high-resolution pipeline; this pass keeps Canvas2D and avoids adding another WebGL context beside MediaPipe.

Selected technique: draw the dense text into an offscreen layer, shift/expand overlapping 72×7px strips with continuous sine fields, soften the warped result once, and composite against a light/shadow alpha field. Working resolution is capped at1440px across; no segmentation readback or repeated glyph measurements are added to the heat pass. There is no random per-frame jitter. Only the data layer is distorted.

Exposure follows the red-light depth. The same `shadeAt` field drives text restoration, the visible dark shadow, thermal body exposure and melt protection. Raised palms cast broad downward shadows; raised upper-arm and forearm segments fill gaps between them. In full shade the clean text is restored in the current frame. Removing the shadow recomputes exposure immediately, with no stale cooling/blur trail. The viewport height used by this field remains the actual viewport height even when the data layer excludes the bottom dock.

SHELTER alone maps source RGB luminance through a blue/purple/magenta/red/yellow thermal palette; exposure slightly raises the palette coordinate. Detached squares retain RGB samples for the same conversion. This is an artistic false-colour effect, **not measured temperature**. Other scenes preserve their existing body colours (including OFFLINE's intentional grey side).

## Verification

- 64 Node tests passed, including all old source/translation/physics checks and new rotation, grip, dwell, typography, heat and arm-shadow contracts.
- Browser tested actual face highlighting, relative mouse grip translation (~150px horizontal,60px vertical), position retention, and dwell-to-intro transition.
- All seven languages: all six faces had seven repeated rows, one shared79.765px font at1280×720, and overflow coverage on both axes. Chinese and Arabic layouts inspected visually.
- All six active scenes rendered at1280×720; dense type, body colours, split OFFLINE and non-overlapping bottom dock inspected. No browser error logs were recorded in those preview runs.
- Heat browser fixture: full shadow matched undistorted text exactly (mean RGB channel error0.000); exposed text differed53.282; re-exposure reproduced the original hot rendering exactly (difference0.000).45 frames at1000×600 submitted in median1.90ms / p952.20ms in the test browser. These are renderer submission timings, **not camera FPS, end-to-end frame times, or M4 hardware measurements**.
- Actual M4 camera lighting, occlusion and hand-recognition latency still require on-device testing. Preview mouse input verifies controller/view behavior, not ML accuracy.

Reproduce the browser check by temporarily copying `tests/fixtures/heat-browser/heat.html` to `dist/qa/heat.html`, starting the static server, and visiting `/qa/heat.html`. Remove `dist/qa` before deployment.
