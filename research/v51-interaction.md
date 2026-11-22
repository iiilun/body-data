# V5.1 interaction revision

## Reference cases and adaptation

- [Microsoft point-and-commit](https://learn.microsoft.com/en-us/windows/mixed-reality/design/point-and-commit): distinguish pointing feedback from a separate commit gesture; a palm-based pointer leaves fingers available for manipulation. V5.1 adapts this pattern to a mirrored webcam cursor and fist confirmation. It does not assume HoloLens depth sensing.
- [Ultraleap TouchFree interactions](https://docs.ultraleap.com/TouchFree/touchless-interfaces/interactions.html), [cursor settings](https://docs.ultraleap.com/TouchFree/touchfree-user-manual/interaction-settings.html), [UI components](https://docs.ultraleap.com/TouchFree/touchless-interfaces/ui-components.html): visible target feedback, separate manipulation/activation, cursor filtering tradeoffs. The specialized Ultraleap sensor and AirPush depth trigger are not used here.
- [Google MediaPipe Gesture Recognizer](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer?tab=Web): official Closed_Fist/Open_Palm classification with 21 hand landmarks. Existing local0.10.35 bundle exposes the API; no CDN runtime dependency added.
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia): permission is requested on entry, in HTTPS/localhost, with audio:false. Browser consent remains required. [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen): right-bottom button/F key supply the required trusted activation.

Implementation choices such as the55‰ viewport swipe,100ms confirmation and0.22–0.42s artistic delay are project tuning, not thresholds validated by the cited vendors.

## Changes

The old front-normal highlight is removed. CSS3D hit testing identifies the actual visible face under the palm cursor, including side/top faces; its background changes immediately. Fist closure latches the last open target to resist small cursor movement while closing. A visible ring shows pointing position. A short open-palm swipe starts over the cube, turns one quarter, and ignores its return stroke. New gesture inference is posted before pose/segmentation work; menu mode computes the latter every third image. If the new model cannot initialize, the previous hand-landmarker pipeline remains a fallback.

The counter and title are now one DOM dock. It reserves its measured height in background data layout and keeps an opaque reading area, preventing Canvas counters from colliding with separate DOM titles. Fullscreen remains available in every state.

HOLD’s arm projection now follows the arm skeleton, reaching38% of viewport height at maximum wrist load, with persistent fatigue. OFFLINE samples a short history at5Hz, follows the current body centre, retains at least52/255 gray brightness and removes3.5% of blocks, so a crossing person remains visible.

THIRST now distinguishes blue and ochre cumulative collection. One ochre drop no longer relabels all existing blue volume. The30L bucket fills with0.15L drops at28 drops/second across the viewport. A full bucket immediately ends in an explanation/result screen;45 seconds remains the upper duration. Moving colour bands let the observer choose a stream. These colours represent population service access as an artistic model, not measured contamination probability or a claim that mixed water is drinkable. SPACE uses0.98em rows and−0.055em tracking while maintaining sentence identity and elastic displacement.

## Model provenance and observed validation

Official model: https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task

SHA256:97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482

Official test images:

- https://storage.googleapis.com/mediapipe-assets/male_full_height_hands.jpg
- https://storage.googleapis.com/mediapipe-assets/fist.jpg

Browser fixture passes:33 body points, two21-point hands, centre person/background corner mask semantics; fist recognized with scores0.9097,0.9127,0.9115 on the three tested body-result frames. After warm-up, early hand messages took roughly12–18ms and complete body frames30–32ms in this browser fixture. First complete frame was510.7ms. These are official-photo inference timings, not M4 webcam end-to-end latency or exhibition FPS.

UI checks: actual top face and side face highlight immediately; confirming the side enters HOLD. Fullscreen button changes the browser fullscreen state. Chinese water dock has separate counter bounds above its title, with no overlap. Seeded full-bucket playback visibly ends with22.6L blue +7.4L ochre, a full-bucket heading and the26.33% global service gap.

Default startup invoked camera acquisition without ENTER; the in-app test browser could not provide camera permission/device access and displayed the retry/preview state. Actual camera acquisition, user pointing range and physical gesture comfort require the intended webcam and browser.

Final automated checks:58 tests pass, including the revised interaction contracts, explicit non-fist rejection, collection conservation and dense typography. Browser88px drag on a1280px viewport turned the cube90 degrees. Counter/title DOM bounds were measured with no intersection. The temporary model harness is removed from production before release.
