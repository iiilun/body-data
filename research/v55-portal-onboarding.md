# V5.5 · Real type-space portal and camera onboarding

2026-11-25

## Portal

The black fade plane was removed from the HTML and from the animation model. Main-cube titles are native SVG text, still repeated in aligned rows without added spaces. The selected face is sampled to find a square entirely within its existing unprinted black space. A black rectangle is placed inside that already black region, so its core stays exact through rasterization.

The camera projection preserves the selected face's rotation. The transition pans towards that real black region and increases scale until its four projected edges extend beyond the viewport. There is no `shade` or opacity output in the transition model and no screen-sized black overlay in the page.

The incoming reading layout uses its own black background, or a black piece of printed type on a light page. It shrinks to the final reading size. A fixed, high-resolution canvas copy of that existing reading layout avoids oversized DOM/SVG allocations during the very close zoom. It is exchanged for the native reading layout at the endpoint. The data-reading timer stays paused throughout.

## New onboarding sequence

1. Two data pages, three seconds each.
2. A separate six-second movement demonstration with concise physical instructions and a filled human silhouette. Dark scenes use a white person; light scenes use a black person. The anatomy includes a continuous neck/torso, tapered and rounded limbs, articulated palms/fingers and adult standing proportions. Each scene has its own gentle movement.
3. Full-frame raw camera, mirrored exactly once, with grayscale and slightly reduced brightness. The background remains visible. The segmentation mask is used only to trace the person's exterior contour; it does not remove the background here.
4. A recent, nonempty person mask and the requested upper-body pose are both required. The contour changes from 2.8px white to 7px green, with a large central three-second countdown. Pose or mask loss stops readiness; sustained pose loss resets the count.
5. After the countdown, the existing segmented interaction begins. The six interaction models and their sourced observations are unchanged.

HOLD and SPACE check elbow extension as well as wrist span/height; the SHELTER start pose requires both hands above the head. Only the head, shoulders, elbows and wrists are required in camera view. The full-body illustration demonstrates proportions, not a foot-tracking requirement.

## Verification

- All 106 Node checks pass. Added checks cover the actual projected black region, absence of fade outputs, reverse zoom endpoint, cancellation, largest dark square sampling, segmentation contours/mirroring, mask age/presence, raw video drawing without a detected person, outline readiness styling, six motion geometries, seven-language instructions and bent-elbow/one-handed rejection.
- Browser preview checked the six scene portals. The black plane element was absent throughout. A captured cube black region measured approximately 1829 × 1798px over a 1280 × 720 viewport at the black endpoint.
- All seven language entries completed a HOLD portal, retained their translated titles and number formats, and returned to the language constellation without errors or warnings.
- A complete preview passed through a 3.65-second portal, data reading, six-second human demonstration, raw camera preview, large countdown and automatic activation. Preview topic keyboard selection was used for the HOLD walkthrough; continuous three-second pointer dwell was also checked separately.
- Dark and light guide pages, white contour and thick green contour with a large `3` were visually inspected. The example camera background remained present. Preview frames are explicitly marked SIMULATION.
- The raw-camera preview uses the already included Google MediaPipe `pose.jpg` sample. Its mask was generated locally by the actual project worker: PASS, 33 pose landmarks and a 480 × 320 person mask. The asset is a public test photograph, not a user's camera frame. The live path continues to use fresh worker results from the live camera.

Physical M4/webcam frame rate and live pose-following still need an on-device check. No personal frames were captured, saved or uploaded. No publishing permissions changed.

Preview inspection parameters: `step=guide&guide=1` holds the demonstration, `step=align&frame=1` holds a white outline, and adding `ready=1` shows the green preview state with its countdown held at 3. These camera-free inspection shortcuts do not affect the normal webcam flow.
