# V5 validation — 2026-11-22

## Automated

48 Node tests pass: existing provenance, RGB mask sampling, full-viewport geometry, pose/countdown and Matter.js collision checks; added return-stroke cube control, settled-face confirmation, 144-observation/seven-language identity, persistent body-material loss, wide hand shade, elastic type, full-width rain, bucket capture/quality/conservation, census-scaled city pickup/release, split-side time sampling and personal/global result separation. `git diff --check` passes.

The heat deadline check now covers the full45-second experience; visible body material no longer needs to disappear within the first30 seconds. Historical V4 source snapshots remain tested as historical data, while V5 runtime uses `global-facts.json` in every language.

## Browser observations

Desktop in-app browser at1280×720, original-colour official test-photo preview:

- Cube drag changes the facing topic; after settling exactly one face is white. The unit test separately confirms returning the same open hand to centre does not undo the swipe.
- Six-scene data introduction, silhouette alignment and active rendering inspected. Outline is the border of a filled upper-body silhouette, without joint circles or skeleton segments.
- HOLD: small rotating values accumulate over continuous arm/chest colliders; type layout is cached by language and display size.
- SPACE: stable dense sentence lanes, no transparency toggles, spring motion, complete value tokens; corrected an initial overlapping-letter defect.
- SHELTER: red gradient, falling original-colour squares and persistent missing material; slowed full erosion to match the45-second experience. Shade has no hard wave boundary.
- THIRST: full-width blue/ochre rain and a three-line filled bucket; model checks cover contamination and tilt/drain conservation. Chinese result flow visibly presents safe litres, unassured litres, emergency person-days and26.33% global lack of safely managed drinking-water service. The latter is a population service indicator, not a contamination rate.
- OFFLINE: left full colour and continuous data; right monochrome, missing blocks and stepped data/image timeline.
- VACANT: dragged a visible outlined home into the body neighbourhood; visible reuse count changed from0 to1 while the city retained120 homes.
- Arabic long labels and numerals inspected; no fact-grid overflow. Bundled Noto Sans Arabic rendered as the selected sans-serif font. English and Traditional Chinese inspected; all seven complete dictionaries/data labels are checked automatically.
- Browser console inspected without application errors/warnings.

## Vision model smoke check

Google MediaPipe's official `male_full_height_hands.jpg`, resized to480×752; no camera image used. Test page required33 pose points, two hands with21 points each, nonempty person mask, centre=person and corner=background.

PASS:71,788 person pixels out of360,960; centre1/corner0. Inference times were507.9ms on the first frame,58.6ms and49.2ms after warm-up. This is a browser fixture measurement, **not M4 webcam FPS**, end-to-end camera latency or a promise of exhibition performance.

The temporary `dist/qa-v5` model fixture is removed before release. Official test images remain outside production in `tests/fixtures`.

## Remaining physical verification

Run with the intended M4, actual webcam, lighting and observer distance. Preview pointer and model photos cannot establish camera tracking latency, gesture recognition reliability for every hand or in-person interaction comprehension. The class-testing guide records those observations without uploading camera footage.
