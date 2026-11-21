# Browser model smoke check

This fixture uses Google's public MediaPipe male_full_height_hands.jpg test image. It does not contain camera data. Source: https://storage.googleapis.com/mediapipe-assets/male_full_height_hands.jpg

For a local check, temporarily copy this directory to dist/qa, run npm start, and visit http://localhost:5173/qa/vision.html. PASS requires 33 pose landmarks, detected hands, a nonempty person mask, person at the image centre and background at the corner. The page also reports segmentation pixels and per-frame inference time. Remove dist/qa before packaging a release; this fixture is deliberately outside the static site.
