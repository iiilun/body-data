# Browser model smoke check

Uses Google’s public MediaPipe test photographs, not camera data:

- https://storage.googleapis.com/mediapipe-assets/male_full_height_hands.jpg
- https://storage.googleapis.com/mediapipe-assets/fist.jpg

Temporarily copy this directory to `dist/qa`, run the local server, and open `/qa/vision.html`. The harness first requires33 pose points, two21-point hands and correct person/background mask semantics. Then it requires the official fist photo to produce Closed_Fist above0.55. Early hand messages and complete inference times are displayed separately, including menu frames that skip body inference. Remove the temporary production directory before release.
