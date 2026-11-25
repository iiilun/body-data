# V5.9 · Stable hands and softer interaction

## Changes

- Hands retain a positional track ID across model-array reordering and brief Left/Right classification flips. Two-hand assignment uses distance and short-term motion prediction. The menu prefers the right hand, then retains that owner until sustained loss; gameplay still receives both hands.
- Open/fist changes require95ms of consistent evidence; ambiguous poses retain the previous mode for150ms. Rotation uses a small deadzone, lower gain and softer response. Predicted hand frames preserve hover but cannot advance a dwell or move the cube; reacquisition reanchors the grip.
- Pinch uses a palm-relative distance with .42 start / .62 release hysteresis and45/60ms debounce. Pinching cannot select a menu face or utility. DATA accepts a grab across the full modal below the top112px, uses2× movement, retains its owner and stops on release. Visual utility cubes retain their size; camera targets extend32px around the existing button bounds.
- Posture demonstration uses three closed, gently offset outlines in the supplied reference style. Live camera alignment remains the separate person-mask outline.
- Mosaic sampling uses48 columns; THIRST retains the intentional frosted shadow. SPACE has smaller type and continuous, softer displacement rather than an immediate draw-position correction.
- Fullscreen requests from a real click/key stay on that activation call stack. Camera dwell instead presents a clickable confirmation button. Rejections and unsupported contexts produce a localized recovery message, with standard and WebKit API support.

## Sources and limits

[MediaPipe documentation](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Web) defines parallel arrays for hand landmarks and handedness. Array position is not used as persistent identity here; identity matching and smoothing are application logic.

[MDN requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) documents the transient user activation requirement. Camera recognition and a synthetic button click cannot create that activation. This implementation does not claim to bypass it or silently substitute a page-only view for real browser fullscreen.

## Verification

- Node regressions cover reordered/duplicate labels, crossing hands, stable ownership and takeover without angle jumps, brief gesture ambiguity, pinch thresholds, predicted-frame pauses, drag ownership/release/bounds, utility hit areas, fullscreen activation/rejection/fallback, and the guide's closed outlines.
- The existing official Google sample-photo browser harness passed:33 body points, two21-point hands, correct person/background mask and Closed_Fist scores above0.89. These are model smoke checks, not a measurement of actual webcam accuracy or M4 FPS.
- Browser preview: DATA moved508px in an approximately290px upward drag and472px in a270px drag outside the narrow text panel; it stopped on release and the back control remained accessible. A palm at(110,110), outside the visible back button, successfully returned to the menu. New outline guides checked on both white and black backgrounds against the provided reference. SPACE checked with the new finer portrait and moving body; no runtime errors appeared. Native fullscreen was rejected by the in-app browser and correctly showed the recovery button; a real Chrome session still needs the browser-required click.
- No personal camera images were captured, stored or uploaded during these checks.
