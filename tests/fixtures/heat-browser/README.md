# Heat browser verification

Temporarily copy `heat.html` into `dist/qa/heat.html`, start the local server, and open `/qa/heat.html`. The page uses the production dense typography and heat modules, compares shadowed pixels with the unfiltered source, checks repeatable re-exposure, and displays45-frame submission timings. It does not use a webcam or measure camera FPS. Remove the temporary production copy before deployment.
