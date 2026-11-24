# V5.4.1 · Cube → black → briefing

2026-11-25

## Behaviour

The open-palm selection threshold is now three continuous seconds. The circle and all seven language prompts share the same timing constant. Changing face, leaving, closing the hand or losing tracking still resets the dwell.

A committed selection freezes the cube's orientation, hides its guidance and cursor, and scales the existing cube around the viewport centre. A smooth black veil completes the move into a full black screen. Under that black frame, the selected scene's briefing is prepared at 1.45 times its reading size; the veil recedes as the briefing shrinks to exactly the viewport size.

The phases last 1.15 seconds for cube expansion, 0.2 seconds for complete black and 1.2 seconds for the briefing reveal. The introduction progress stays at zero during all three phases. Only after the reveal finishes do the existing two three-second data pages begin, followed by the existing pose alignment and three-second countdown. Camera inference continues during the transition to keep the subsequent pose frame current.

Back/Escape cancels the transition, clears all transforms and the veil, and restores the menu. Repeated selections cannot replace an active transition. Resizing updates the cube coverage; reduced-motion preference shortens the three phases to 0.16 / 0.08 / 0.2 seconds.

## Verification

- 95 Node checks pass, including updated three-second boundary/reset tests and seven new checks covering phase order, complete black, smooth zoom/reveal, cancellation, resize, reduced motion and seven-language timing copy.
- An actual pointer dwell in browser preview selected a face in approximately 3.08 seconds, including input/wait overhead.
- All six scenes were checked in the browser. Every black phase had opacity 1 and introduction progress 0%; HOLD and THIRST changed to their light theme behind the black frame.
- Both dark and light briefings reached the full reading layout. The enlarged cube and full-black frames were captured in `outputs/v541/`.
- Returning during expansion restored the menu, removed the veil and cleared both cube and briefing transforms. No errors or warnings were recorded in the test tab.
- A complete Chinese preview flow passed through actual three-second face selection, transition, data introduction, pose countdown starting at 3 and automatic activation, without additional clicks. This used the existing camera-free demo pose; physical camera tracking was not retested.

The language entrance, six interaction models and source observations are unchanged. No deployment permissions were changed.
