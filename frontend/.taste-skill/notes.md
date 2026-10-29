# Lienwand landing — notes

## Inventory (things only Lienwand has)
1. Name from German "Leinwand": the painter's canvas.
2. Hold the pen still for one second at the end of a stroke → snap.
3. The model knows exactly four shapes: circle, square, triangle, line (CNN trained on QuickDraw doodles, 64 resampled points).
4. It only snaps when it is more than 60% sure; otherwise your stroke stays.
5. 6-character share code.
6. Roles: owner, editor, viewer. Viewers ask to join, owner approves → editor.
7. Live cursors with names, presence list.
8. Autosave about one second after you stop; JPEG thumbnail on the home page.
9. Ten marker colours (#E63946 red first after black/white), pen 1–20px, eraser 10–50px, zoom 50–500%.
10. Login with Google, GitHub or email. Free.
11. Winslow Homer, Blackboard (1877): a teacher in front of chalk circles, squares, triangles and lines — the same four shapes.

## Argument
1. It is a free shared whiteboard where rough shapes snap clean. → the live canvas in the hero; draw and hold.
2. It knows four shapes and leaves the rest alone. → Homer's blackboard (same four shapes) + the rule (1 s, 60%).
3. Every tool is one bar away. → six real tool-panel fragments.
4. Sharing is a code and a yes. → slider through Start / Share / Ask / Approve, fragment per stage.
5. It is being built in the open. → dated changelog from git + three planned features; geometry-lesson photograph.
6. Straight answers. → FAQ index.
7. Start now. → the real sign-up card (Google / GitHub / email) on a red field.

## Idea
On this page, the four chalk shapes on Homer's 1877 blackboard — the only four Lienwand's model knows — become the hero canvas you draw on and the rule the page is built around.
Competitor test: Excalidraw/Miro have no hold-still snap limited to these four shapes; the sentence fails for them.
Live thing: draw on the hero canvas, hold still one second, see the model's guess and confidence; real ML API with a local fallback.

## Direction
product-performs, seed 349643112. Redraw: features → features-staggered-fragment-cells (six real tool panels, not toggles: toggles for tools would be decoration). Dropped "showcase" (no claim for it). Added a picture section for Homer (claim 2).
Palette: signal red / white kept — red is the first marker colour in the app's own palette (#E63946 family).

## Copy deck
Nav: Lienwand | Shapes · Tools · Sharing · FAQ | Start a board
H1: A whiteboard that snaps your shapes
Sub: Free and shared, for small teams and classrooms. Draw a rough circle, hold the pen still for a second, and it comes back clean.
Button: Start a board

Shapes section h2: Four shapes it knows
p: Circle, square, triangle, line. The same four a teacher drew on Winslow Homer’s blackboard in 1877, and the four Lienwand’s model was trained on, from thousands of doodles in Google’s Quick, Draw! dataset.
Rule rows: Hold still for one second · It snaps when more than 60% sure · Anything else stays as you drew it · Undo brings back your stroke

Tools h2: Everything on the toolbar
Pen — Ten marker colours or any custom one, from a 1px hairline to a 20px felt tip.
Shapes — Pick circle, square, triangle or line and drag it out, or draw it rough and let it snap.
Text — Click anywhere and type. Choose a size and a colour for the label.
Image — Drop a diagram or a photo of the textbook page onto the board.
Eraser — Five widths from 10 to 50px. Erase what you need, undo what you didn’t.
Hand and zoom — Hold Space to pan, zoom from 50% to 500%, and find your place on the minimap.

Sharing h2 (changes): First, start a board / Then send its code / They ask to join / You let them draw
Stage names: Start · Share · Ask · Approve

Changelog h2: What’s new, what’s next
Next: Export to PNG and PDF — planned; Handwriting to text — planned; Lasso selection — planned
Added (git dates): Google and GitHub login 20 Oct 2026 · Images and thumbnails in the cloud 6 Jul · Selection tool 4 Jul · Better touch on tablets 2 Jul · Shape recognition model 30 Jun · Tool side panels 30 Jun · Undo and redo 26 Jun · Account settings 18 May · Pan and zoom 28 Apr · Profile photos 27 Apr · Notifications 30 Mar

FAQ h2: Questions
CTA h2: Your first board
CTA p: Sign in with Google or GitHub and you land on your boards. Create one, copy its code, send it to your group.
Footer: A free shared whiteboard · Log in · Source on GitHub · amarjeet0538@gmail.com · © 2026 · picture credits
