# Glass camera-pipeline check

Temporarily copy `glass.html` to `dist/qa/glass.html` and `../vision-browser/hands.jpg` to `dist/qa/pose.jpg`. Start the server and visit `/qa/glass.html`. This uses Google's public MediaPipe photograph, the actual worker models, BodyTracker, the person mask and the production glass renderer. It requires33 pose points, two hands with21 outline points each, a nonempty mask and nonzero wiping coverage. Three inference frames distinguish first-frame initialization from warm processing.60 graphics frames report CPU submission timing. This is not webcam FPS or M4 hardware validation.

Remove the temporary `dist/qa` files before deployment.
