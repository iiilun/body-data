# Onboarding sample-mask check

`generate-mask.html` runs the real local vision worker on the existing official Google MediaPipe `pose.jpg` photograph. It does not request a camera. It reports PASS only after a 33-landmark pose and nonempty mask are returned, and exposes a download of the resulting mask and pose.

For local execution, copy the fixture into a temporary `dist/__qa/` folder and open it through the development server. Its relative paths resolve the root worker and `assets/alignment-preview.jpg`. Save the verified download as `dist/assets/alignment-mask.json`; remove the temporary served fixture before publication.

The photograph is reused from `tests/vision-smoke/pose.jpg`, originally from `https://storage.googleapis.com/mediapipe-assets/pose.jpg`. The mask and photograph are paired. They are used only for camera-free previews; live alignment uses the current webcam image and current worker mask.
