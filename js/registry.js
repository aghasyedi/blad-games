/* ============================================================
   QUANTUM ARCADE — registry.js
   Metadata + how-to-play for all 40 games.
   The homepage cards and the game shell both read from here.
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG;

  QG.CATS = ["All", "Strategy", "Board", "Cards", "Arcade", "Puzzle", "Sports", "Indian Classics"];

  QG.GAMES = [
    {
      id: "quantum-chess", num: 1, title: "Quantum Chess", emoji: "\u265B", cat: "Strategy", diff: 3, accent: "cyan",
      tags: ["superposition", "entanglement"],
      desc: "Chess where pieces exist in superposition and only become definite after measurement. Uses superposition, entanglement, interference and quantum moves.",
      instr: [
        "Tap one of your pieces, then tap a highlighted square to move (classic chess moves, simplified - no check rules).",
        "Press SPLIT to put the selected piece into SUPERPOSITION across two squares at once. It now occupies both until someone measures it.",
        "Press MEASURE to collapse every superposed piece on the board into one definite square - you get the first move after a collapse, but so does your opponent.",
        "Entangled pieces move together: capturing one square of a pair collapses the partner too.",
        "Capture the enemy King, or reduce the enemy to a single piece, to win."
      ],
      controls: "Tap / click squares. Buttons: SPLIT, MEASURE, UNDO, RESTART."
    },
    {
      id: "quantum-battleship", num: 2, title: "Quantum Battleship", emoji: "\u26F5", cat: "Strategy", diff: 2, accent: "blue",
      tags: ["superposition", "measurement"],
      desc: "Ships occupy multiple possible positions until the opponent measures a location. Balance information gathering against destroying hidden quantum ships.",
      instr: [
        "Your fleet is placed automatically. Enemy ships float in a probability cloud - each ship could be in several positions.",
        "Tap a cell on the ENEMY grid to fire. A hit collapses that ship into one definite position and reveals its true squares.",
        "A MISS tells you something too: the probability cloud reshapes and the ships shift their possible positions.",
        "Use PROBE (3 uses) to reveal the probability heatmap for one row before you commit a shot.",
        "Sink every enemy ship before your own fleet is destroyed."
      ],
      controls: "Tap cells on the enemy board. PROBE reveals probabilities."
    },
    {
      id: "quantum-tic-tac-toe", num: 3, title: "Quantum Tic-Tac-Toe", emoji: "\u2716", cat: "Board", diff: 1, accent: "magenta",
      tags: ["entanglement", "collapse"],
      desc: "Players place quantum moves that exist in multiple squares at once. Entanglement and measurement decide when the board collapses into a classical state.",
      instr: [
        "On your turn place a move across TWO squares at once - both get a ghost of your mark, linked as one entangled pair.",
        "Squares with two ghosts from the same pair will eventually collapse into one real mark. Tap COLLAPSE to trigger a measurement.",
        "Collapse resolves every entangled pair in order: the earlier pair resolves first, which may create a chain reaction.",
        "Three in a row of real marks wins. X moves first.",
        "If the board fills with no winner it is a quantum draw."
      ],
      controls: "Tap two empty squares to place a quantum move. COLLAPSE resolves the board."
    },
    {
      id: "quantum-maze", num: 4, title: "Quantum Maze", emoji: "\u{1F300}", cat: "Puzzle", diff: 2, accent: "lime",
      tags: ["quantum walk", "interference"],
      desc: "Explore multiple maze paths at once through a simulated quantum walk. Interference can raise or lower the probability of reaching particular locations.",
      instr: [
        "You do not move as one dot - you are a probability wave spread across the maze.",
        "Use the arrow pad (or WASD / swipe) to WALK. Your wave splits down every open corridor, and bright cells are where you are most likely to be.",
        "Interference zones (marked with waves) amplify or cancel your amplitude - passing through one can double or halve your odds.",
        "Press MEASURE to collapse the wave into one definite cell. If that cell is the exit you win.",
        "You have 3 measurements. Reach the exit before they run out."
      ],
      controls: "Arrow pad, WASD or swipe to walk. MEASURE collapses."
    },
    {
      id: "quantum-escape-room", num: 5, title: "Quantum Escape Room", emoji: "\u{1F510}", cat: "Puzzle", diff: 2, accent: "purple",
      tags: ["quantum gates", "learn"],
      desc: "Solve puzzles by applying quantum gates such as X, H, Z and CNOT. Each level teaches one quantum concept through an interactive challenge.",
      instr: [
        "Each room shows a target quantum state (Dirac notation) and your current state. Make them match.",
        "Apply gates by tapping the gate buttons. X flips |0> and |1>. H creates an equal superposition. Z flips the sign of |1>. CNOT entangles two qubits.",
        "The two probability bars show your qubits - watch them move as you apply gates.",
        "Clear all 6 rooms to escape. You can RESET a room at any time without penalty.",
        "Tip: H then H again returns you to where you started - gates are reversible."
      ],
      controls: "Tap gate buttons: X, H, Z, S, CNOT, SWAP. RESET restarts the room."
    },
    {
      id: "quantum-tower-defense", num: 6, title: "Quantum Tower Defense", emoji: "\u{1F6E1}", cat: "Strategy", diff: 3, accent: "orange",
      tags: ["interference", "measurement"],
      desc: "Enemies split into multiple possible paths instead of following one fixed route. Quantum towers manipulate, measure or interfere with these possible states.",
      instr: [
        "Enemies walk as a probability cloud that splits at every junction. The brighter a cell, the more likely the enemy actually is there.",
        "Tap a build slot, then choose a tower: SPLITTER (splits enemy waves, weak damage), COLLAPSER (measures - forces the enemy into one path and deals heavy damage), PHASE (interferes, cancels enemy probability).",
        "Enemies that reach the core cost you a life. You have 10 lives.",
        "MEASURE the whole board occasionally: it deals damage proportional to each enemy's uncertainty.",
        "Survive 8 waves to win."
      ],
      controls: "Tap build slots to place towers. Speed toggle, START WAVE, MEASURE ALL."
    },
    {
      id: "qubit-duel", num: 7, title: "Qubit Duel", emoji: "\u2694", cat: "Strategy", diff: 2, accent: "red",
      tags: ["gates", "measurement"],
      desc: "Two players control qubits and use gates to attack, defend or manipulate states. The winner is decided by strategic measurement and state manipulation.",
      instr: [
        "Each player has a qubit in state |0> with 10 HP. The value of your qubit determines your damage.",
        "On your turn pick a gate. H sets you to a 50/50 superposition. X flips your value. Z adds a phase that boosts your next attack. S rotates your phase by 90 degrees.",
        "Then choose ATTACK: your qubit is MEASURED. A |1> result deals 4 damage, |0> deals 1. Your qubit then resets to |0>.",
        "SHIELD uses a Z gate instead: no damage but you gain 2 armour and keep your state.",
        "Reduce the opponent to 0 HP. Superposition is powerful but risky - you might measure |0>."
      ],
      controls: "Tap a gate then ATTACK, SHIELD or MEASURE."
    },
    {
      id: "quantum-card-game", num: 8, title: "Quantum Card Game", emoji: "\u{1F0CF}", cat: "Cards", diff: 2, accent: "pink",
      tags: ["superposition", "bluff"],
      desc: "Cards represent superpositions of different values or suits. Players decide when to manipulate or measure cards while managing uncertainty.",
      instr: [
        "Each of your cards is in a superposition of two values - shown as ghost numbers. Only measurement decides what it really is.",
        "Tap a card to select it, then press MEASURE to collapse it into a definite value (this is permanent).",
        "Press FLIP to swap the two superposed values of a card without measuring it - a safe way to change your odds.",
        "Play MEASURED cards against the AI. Highest value wins the trick; the loser takes damage equal to the gap.",
        "First to drop the opponent to 0 HP wins. Unmeasured cards can be played but count as their average value."
      ],
      controls: "Tap a card to select. MEASURE, FLIP, PLAY CARD."
    },
    {
      id: "quantum-dice", num: 9, title: "Quantum Dice", emoji: "\u{1F3B2}", cat: "Arcade", diff: 1, accent: "yellow",
      tags: ["probability", "measurement"],
      desc: "A quantum die exists as a probability distribution over several outcomes. Players choose when to measure and can use quantum operations to alter probabilities.",
      instr: [
        "You get 3 rolls per round. Each ROLL measures the die - it collapses to one face, and the faces add up to your round total.",
        "Before rolling, tap a face and spend BIAS charges to push probability toward it (BIAS +1) or away from it (BIAS -1). You start with 3 charges and gain one each round.",
        "Reach the round target (round number + 2) within your 3 rolls to pass. Fail three rounds and the run ends.",
        "Beat round 10 to win. Later targets need higher totals, so save your bias charges for the hard rounds."
      ],
      controls: "Tap a face to bias it, BIAS +1 / BIAS -1, ROLL to measure."
    },
    {
      id: "quantum-rps", num: 10, title: "Quantum Rock-Paper-Scissors", emoji: "\u{1F44A}", cat: "Arcade", diff: 1, accent: "cyan",
      tags: ["superposition", "interference"],
      desc: "Rock-Paper-Scissors extended with quantum strategies and superposition. Delay measurement and exploit interference to influence outcomes.",
      instr: [
        "Instead of choosing a move, you build a quantum state over Rock, Paper and Scissors.",
        "Tap a move to AMPLIFY it (raise its probability) or press H to split evenly into a perfect superposition.",
        "INTERFERE rotates your probability distribution one step - useful when you predict the AI.",
        "When ready, press MEASURE. Your state collapses to a single move and both players reveal.",
        "First to 5 points wins. If you never amplify you stay at 33% each - boring and weak."
      ],
      controls: "Tap Rock/Paper/Scissors to amplify, H for even split, INTERFERE to rotate, MEASURE to play."
    },
    {
      id: "quantum-dungeon", num: 11, title: "Quantum Dungeon", emoji: "\u{1F3F0}", cat: "Strategy", diff: 3, accent: "purple",
      tags: ["superposition", "exploration"],
      desc: "Navigate a dungeon where locations, enemies and objects exist in superposition. Measurement and quantum gates become strategic abilities during exploration.",
      instr: [
        "You are a probability cloud in a grid dungeon. Rooms you might be in glow; enemies also exist in several possible rooms.",
        "Move with the arrow pad. Your wave spreads - you can be in up to 4 rooms at once.",
        "SCAN measures your own position (dangerous: it also reveals you). PHASE applies an X gate, teleporting you to a mirrored room. ENTANGLE links your position to a treasure so it follows you.",
        "Find the key, then reach the exit. Fight enemies by measuring them - a collapsed enemy is defeated.",
        "You have 30 turns. If an enemy measures you, you take damage."
      ],
      controls: "Arrow pad to move. SCAN, PHASE, ENTANGLE, MEASURE."
    },
    {
      id: "quantum-spy", num: 12, title: "Quantum Spy", emoji: "\u{1F575}", cat: "Puzzle", diff: 2, accent: "green",
      tags: ["measurement", "no-cloning"],
      desc: "A spy hides information inside quantum states while an opponent tries to discover it. Measurement reveals information but may also disturb or destroy the hidden state.",
      instr: [
        "You are the spy. The Agency has hidden a 4-bit code; each bit lives in a qubit in state |0>, |1> or a superposition of both.",
        "SEND A PROBE to measure one qubit. A definite bit gives you the answer for free. A superposed bit returns a random result AND disturbs the state - it may flip.",
        "Use X to flip a bit you are confident about, H to test if a bit is truly superposed (a definite bit measured after H becomes random, then becomes definite again).",
        "You have a limited number of probes, X gates and H gates. They are refilled when the Agency re-prepares after a wrong guess.",
        "Assemble the 4-bit code and SUBMIT it. You have 3 wrong guesses before you are caught.",
        "Careful: over-probing a superposed qubit destroys the information you need."
      ],
      controls: "Tap a qubit then PROBE, X or H. SUBMIT when ready."
    },
    {
      id: "quantum-minesweeper", num: 13, title: "Quantum Minesweeper", emoji: "\u{1F4A3}", cat: "Puzzle", diff: 2, accent: "red",
      tags: ["uncertainty", "measurement"],
      desc: "Mines initially exist in uncertain or superposed locations. Players use measurements to reveal information while minimising dangerous observations.",
      instr: [
        "Some mines are certain (solid black) and some are QUANTUM: they shimmer between two cells and only become real when measured.",
        "Tap a cell to REVEAL it. Numbers count mines in the 8 neighbours, counting a quantum mine once for both its possible cells.",
        "Tap a shimmering cell with FLAG mode to pin it - this collapses the quantum mine into that cell, removing the risk from its partner.",
        "Revealing a mine costs a life. You have 3 lives.",
        "Clear every safe cell to win."
      ],
      controls: "REVEAL / FLAG toggle, then tap cells."
    },
    {
      id: "qubit-pong", num: 14, title: "Qubit Pong", emoji: "\u{1F3D3}", cat: "Arcade", diff: 2, accent: "lime",
      tags: ["superposition", "collapse"],
      desc: "The ball's quantum state determines multiple possible trajectories. Measurements collapse the possibilities, creating unpredictable but controllable gameplay.",
      instr: [
        "The ball exists as two ghosts at once - two possible trajectories. Only the bright one is real, and you must not lose sight of it.",
        "Drag anywhere on the court (or use the arrow pad) to move your paddle. The paddle is wide but the ghost ball is deceptive.",
        "Press MEASURE to collapse the ball into one definite position - costs 1 of your 3 charges but makes the next 6 seconds honest.",
        "If the ball passes your paddle, the point is lost. First to 7 points against the AI wins.",
        "Watch the ghost: the real ball is the one whose shadow is drawn solid."
      ],
      controls: "Drag on the court or use the arrow pad. MEASURE to collapse."
    },
    {
      id: "quantum-tetris", num: 15, title: "Quantum Tetris", emoji: "\u{1F9F1}", cat: "Arcade", diff: 2, accent: "cyan",
      tags: ["superposition", "rotation"],
      desc: "Falling blocks have multiple possible orientations or positions before measurement. Manipulate the quantum state to create favourable board configurations.",
      instr: [
        "Each falling piece can be in a SUPERPOSITION of two rotations or two columns at once - both are drawn, one is ghosted.",
        "Move with the arrow pad. LEFT/RIGHT slide the piece, ROTATE cycles orientation, SOFT DROP speeds it up.",
        "Press MEASURE to collapse the piece into its real orientation and column. You must measure before it lands - otherwise it collapses at random.",
        "Press SPLIT to put the current piece back into superposition with a different partner shape.",
        "Clear lines for points. The board fills to 20 rows; top out and the run ends."
      ],
      controls: "Arrow pad to move and rotate, MEASURE to collapse, SPLIT to re-superpose."
    },
    {
      id: "quantum-carrom", num: 16, title: "Quantum Carrom", emoji: "\u{1F3AF}", cat: "Indian Classics", diff: 3, accent: "orange", inTag: true,
      tags: ["superposition", "interference", "india"],
      desc: "The striker has multiple possible trajectories before interacting with coins. Superposition, interference and measurement determine collisions and pocketing outcomes.",
      instr: [
        "Aim with drag or the arrow pad, then set POWER with the slider. Your striker exists in TWO possible aim angles - both trajectories are drawn.",
        "Press SHOOT to send the striker down BOTH trajectories at once as a probability cloud.",
        "Press MEASURE before shooting to collapse to a single aim line - accurate but no interference bonus.",
        "Coins sitting inside an interference zone are worth double when pocketed. Pocket all 9 coins to win.",
        "Each shot costs one turn. You have 12 turns."
      ],
      controls: "Drag to aim, slider for power, SHOOT / MEASURE."
    },
    {
      id: "quantum-kabaddi", num: 17, title: "Quantum Kabaddi", emoji: "\u{1F3C3}", cat: "Indian Classics", diff: 2, accent: "magenta", inTag: true,
      tags: ["superposition", "measurement", "india"],
      desc: "A raider can occupy multiple possible positions while entering the opponent's territory. Defenders use measurement and quantum operations to detect or intercept the raider.",
      instr: [
        "You are the raider crossing into enemy territory. Your position is a probability cloud spread over up to 3 lanes.",
        "Move with the arrow pad (or swipe). Each step you spread further - defenders cannot tell which lane you are truly in.",
        "Touch a defender's cell to TAG them. But touching the wrong ghost cell wastes your raid.",
        "Defenders SCAN each turn. A successful scan measures you into one lane - then they can tackle you.",
        "Reach the treasure and return to your start line within 8 moves to score. Get tackled and the raid fails."
      ],
      controls: "Arrow pad / swipe to move. DASH to jump two cells at the cost of spreading."
    },
    {
      id: "quantum-kho-kho", num: 18, title: "Quantum Kho-Kho", emoji: "\u{1F3C5}", cat: "Indian Classics", diff: 2, accent: "yellow", inTag: true,
      tags: ["teleportation", "measurement", "india"],
      desc: "Players exist across multiple possible positions on the playing field. Quantum movement, teleportation and measurement create new chasing strategies.",
      instr: [
        "You are the chaser. The runner exists in a superposition of two squares - both are drawn, one is real.",
        "Move along the central line with LEFT/RIGHT. Touch a square to attempt a tag.",
        "You may KHO (teleport) once every 3 turns: instantly jump to any square on the line.",
        "Press MEASURE to collapse the runner into one definite square - but the runner then gets a free sprint of 2 squares.",
        "Tag the runner within 15 turns to win the round. Best of 3."
      ],
      controls: "LEFT/RIGHT to move, KHO to teleport, MEASURE to collapse the runner."
    },
    {
      id: "quantum-ludo", num: 19, title: "Quantum Ludo", emoji: "\u{1F3B0}", cat: "Indian Classics", diff: 2, accent: "blue", inTag: true,
      tags: ["probability", "dice", "india"],
      desc: "The dice and token movement are represented using quantum probability states. Players can manipulate probabilities before measuring the final dice outcome.",
      instr: [
        "Roll a QUANTUM DIE: its six faces have unequal, shifting probabilities shown on the bars.",
        "Before rolling, spend a BIAS charge to nudge probability toward a face you need (you get 1 per turn, max 5).",
        "Press ROLL to measure the die and move your token that many steps.",
        "Land on an opponent's token to send it home. Rolling a 6 grants another roll.",
        "Get all 4 of your tokens from start to home to win."
      ],
      controls: "BIAS to shift odds, ROLL to measure and move."
    },
    {
      id: "quantum-pachisi", num: 20, title: "Quantum Pachisi", emoji: "\u{1F3AF}", cat: "Indian Classics", diff: 3, accent: "purple", inTag: true,
      tags: ["superposition", "measurement", "india"],
      desc: "Traditional Pachisi redesigned so tokens can occupy multiple possible board positions. Measurement collapses token locations and creates new strategic possibilities.",
      instr: [
        "You have 4 tokens. After each move a token enters SUPERPOSITION between its old and new square - it counts as being on both.",
        "Choose which token to advance, then ROLL. The roll value also decides how many extra squares the superposition spans.",
        "Press MEASURE to collapse ALL your tokens at once. Any token that lands on a square occupied by an enemy token sends it home - but a token that collapses onto its own partner blocks it.",
        "Landing on a Castle square grants a bonus roll.",
        "Move all 4 tokens around the board and home to win."
      ],
      controls: "Tap a token to select, ROLL to advance, MEASURE to collapse the board."
    },
    {
      id: "quantum-pallanguzhi", num: 21, title: "Quantum Pallanguzhi", emoji: "\u{1F330}", cat: "Indian Classics", diff: 2, accent: "lime", inTag: true,
      tags: ["entanglement", "measurement", "india"],
      desc: "The traditional seed-and-pit game redesigned with quantum states for seed distributions. Entanglement and measurement decide how resources move between pits.",
      instr: [
        "You own the bottom 7 pits, the AI owns the top 7. Tap one of your pits to sow its seeds one per pit, counter-clockwise.",
        "Every 4th seed becomes a QUANTUM seed (shown shimmering). It sits in two pits at once until measured.",
        "Press MEASURE to collapse all quantum seeds - they land on whichever pit they favour, and if a pit then holds exactly 4 seeds you capture them.",
        "Capture seeds by making a pit reach exactly 4. Captured seeds go to your store.",
        "The player with the most seeds in their store when the pits run dry wins."
      ],
      controls: "Tap your pits to sow. MEASURE to collapse quantum seeds."
    },
    {
      id: "quantum-teen-patti", num: 22, title: "Quantum Teen Patti", emoji: "\u{1F0B4}", cat: "Indian Classics", diff: 3, accent: "red", inTag: true,
      tags: ["bluff", "superposition", "india"],
      desc: "Cards exist as superpositions of different ranks or suits before being measured. Players combine quantum uncertainty with bluffing, probability and risk management.",
      instr: [
        "You and the AI each get 3 cards. Every card is in a superposition of TWO ranks - only measurement decides its true value.",
        "You may MEASURE up to 2 of your 3 cards (tap a card then MEASURE). Measured cards become definite; the third stays uncertain and counts as its average.",
        "Bet by pressing BET (raise the pot by 10) or CALL to see the showdown. Folding is always allowed and costs nothing.",
        "Hand ranking: Trail (three of a kind) > Pure Sequence > Sequence > Colour > Pair > High Card.",
        "Win the pot or bust the AI. You both start with 100 chips."
      ],
      controls: "Tap a card to select, MEASURE it, then BET / CALL / FOLD."
    },
    {
      id: "quantum-snakes-ladders", num: 23, title: "Quantum Snakes & Ladders", emoji: "\u{1F40D}", cat: "Indian Classics", diff: 1, accent: "green", inTag: true,
      tags: ["superposition", "dice", "india"],
      desc: "Players can occupy multiple possible squares instead of one fixed position. Quantum ladders, snakes and measurements determine how the player's state evolves.",
      instr: [
        "Roll the QUANTUM DIE. Its probabilities shift every roll - watch the bars.",
        "After each roll your token enters a superposition across 3 possible squares: the true square plus two neighbours.",
        "Press MEASURE to collapse onto one square. If that square has a ladder you climb; a snake you slide. Collapsing on a quantum ladder (double-height) gives double climb.",
        "If you never measure, you drift - after 3 unmeasured turns your token collapses automatically, usually badly.",
        "Reach square 100 exactly to win. Overshooting bounces you back."
      ],
      controls: "ROLL to advance, MEASURE to collapse your position."
    },
    {
      id: "quantum-rmcs", num: 24, title: "Quantum Raja-Mantri-Chor-Sipahi", emoji: "\u{1F451}", cat: "Indian Classics", diff: 2, accent: "yellow", inTag: true,
      tags: ["hidden roles", "measurement", "india"],
      desc: "Hidden roles are represented as quantum states rather than immediately known identities. Players use incomplete information, measurement and AI strategies to identify opponents.",
      instr: [
        "Four roles are dealt each round: Raja (King, 1000), Mantri (Minister, 800), Sipahi (Soldier, 500) and Chor (Thief, 0).",
        "Each role starts in a superposition of TWO identities - you can see your own two possibilities but not which is real.",
        "The Sipahi acts first: tap a role to ARREST it. If you arrest the Chor, the Chor scores nothing and you keep your points.",
        "Press REVEAL to measure all roles first (costs the Sipahi 200 points) and see who is who before choosing.",
        "Play 5 rounds. Highest total score wins."
      ],
      controls: "Tap a role to arrest, or REVEAL to measure all roles first."
    },
    {
      id: "quantum-checkers", num: 25, title: "Quantum Checkers", emoji: "\u26AA", cat: "Board", diff: 3, accent: "red",
      tags: ["superposition", "interference"],
      desc: "Checkers pieces occupy superpositions of multiple squares and become definite after measurement. Use quantum moves, interference and entanglement to create unexpected captures.",
      instr: [
        "Tap your piece then a highlighted diagonal to move. Captures are mandatory when available.",
        "Press SPLIT to duplicate the selected piece into a superposition of two squares. Both halves can capture independently.",
        "Press MEASURE to collapse all superposed pieces. A piece that collapses onto an enemy square captures it; two of your own halves collapsing onto one square merge back into one.",
        "Reaching the far row crowns a King - Kings move both directions.",
        "Capture all enemy pieces or block every legal move to win."
      ],
      controls: "Tap piece then square. SPLIT, MEASURE, RESTART."
    },
    {
      id: "quantum-go", num: 26, title: "Quantum Go", emoji: "\u26AB", cat: "Board", diff: 3, accent: "ink",
      tags: ["superposition", "territory"],
      desc: "Stones can exist in multiple possible board positions before measurement. Manipulate quantum territories and use interference to influence which regions become occupied.",
      instr: [
        "A 9x9 board. Tap an empty intersection to place a stone - but you may instead press SPLIT first to place your stone in a superposition of two points.",
        "A superposed stone counts for BOTH its points when counting liberties and territory, but it is fragile: a single enemy stone adjacent to either point can measure and remove it.",
        "Press MEASURE to collapse every superposed stone. Collapsed stones that have no liberties are removed (captured).",
        "Territory is counted at the end: empty points surrounded by only your colour. Superposed stones contest both regions.",
        "Pass when you are done. Highest territory + captures wins."
      ],
      controls: "Tap intersections to play. SPLIT places superposed stones, MEASURE collapses, PASS ends."
    },
    {
      id: "quantum-connect-four", num: 27, title: "Quantum Connect Four", emoji: "\u{1F535}", cat: "Board", diff: 2, accent: "blue",
      tags: ["superposition", "branching"],
      desc: "A placed piece can exist in multiple possible columns until measurement. Entangled pieces and quantum moves create branching board states players must strategically collapse.",
      instr: [
        "Tap a column to drop your disc - it falls to the lowest free row in that column.",
        "Press SPLIT before dropping to put your disc into a superposition of TWO columns. It occupies both, counting for both players' lines.",
        "Press MEASURE to collapse all superposed discs. Each disc falls into one of its two columns, which may open or close lines.",
        "Connect four of your colour in a row, column or diagonal to win.",
        "If the board fills without a connect, the player with more measured discs on the board wins."
      ],
      controls: "Tap a column. SPLIT to superpose, MEASURE to collapse."
    },
    {
      id: "quantum-monopoly", num: 28, title: "Quantum Monopoly", emoji: "\u{1F3E0}", cat: "Board", diff: 3, accent: "green",
      tags: ["probability", "dice"],
      desc: "Properties, player positions and even dice outcomes exist as probability distributions. Use quantum operations to manipulate movement and ownership before measurement.",
      instr: [
        "A 24-square board ring. Roll the QUANTUM DIE (uneven probabilities) to move. Landing on an unowned property lets you BUY it.",
        "Your position is a probability cloud of 3 squares after rolling - press MEASURE to commit to one, or let it ride and you will be charged for whichever you actually land on.",
        "Press BIAS to spend a charge and shift the die probabilities toward a number you want.",
        "Owning a property lets you charge rent. Owning both properties of a colour doubles the rent.",
        "Bankrupt the AI (or have the most cash after 20 turns) to win."
      ],
      controls: "ROLL, MEASURE, BIAS, BUY. Tap BUY when prompted."
    },
    {
      id: "quantum-car-racing", num: 29, title: "Quantum Car Racing", emoji: "\u{1F3CE}", cat: "Arcade", diff: 2, accent: "orange",
      tags: ["racing lines", "gates"],
      desc: "A car can follow multiple possible racing lines simultaneously. Use quantum gates and measurements to influence trajectories, overtaking opportunities and race outcomes.",
      instr: [
        "Your car exists on TWO racing lines at once - one solid (real) and one ghost. You choose which to collapse into.",
        "Drag left/right (or use the arrow pad) to steer the solid line. The ghost line mirrors your steering inverted.",
        "Press SWAP to instantly exchange which line is real - a devastating overtaking move.",
        "Press MEASURE to lock in your current line for 4 seconds of guaranteed grip and a speed boost.",
        "Complete 3 laps before the AI. Hitting a cone costs you speed."
      ],
      controls: "Drag / arrow pad to steer. SWAP, MEASURE, boost pad."
    },
    {
      id: "quantum-football", num: 30, title: "Quantum Football", emoji: "\u26BD", cat: "Sports", diff: 2, accent: "lime", inTag: true,
      tags: ["superposition", "passing", "india"],
      desc: "Players and the ball occupy multiple possible positions on the field. Quantum passes, superposition and measurement create unpredictable attacking and defensive strategies.",
      instr: [
        "The ball is in a superposition of two positions. Tap a teammate to PASS - the ball travels to both possible targets and only becomes real when it arrives.",
        "Tap where the ball should go for a QUANTUM PASS: the ball spreads into a 3-cell cloud along the path.",
        "Press MEASURE to collapse the ball to its brightest position - safe, but the defenders then know exactly where it is.",
        "Aim at the goal and press SHOOT. The shot travels down both possible lines; a keeper can only save one.",
        "Score 3 goals before the AI scores 3. 60 seconds per half."
      ],
      controls: "Tap teammates / field to pass, SHOOT to strike, MEASURE to collapse."
    },
    {
      id: "quantum-cricket", num: 31, title: "Quantum Cricket", emoji: "\u{1F3CF}", cat: "Sports", diff: 2, accent: "blue", inTag: true,
      tags: ["probability", "shots", "india"],
      desc: "A batsman's shot exists as multiple possible trajectories while the ball has quantum uncertainty. Manipulate probabilities to influence runs, wickets and fielding outcomes.",
      instr: [
        "You are batting. Before each ball you build a shot distribution over 6 outcomes: 0, 1, 2, 4, 6 and OUT.",
        "Tap an outcome to AMPLIFY it (raises its probability) or press H to reset to the base distribution. INTERFERE rotates the distribution.",
        "The bowler then BOWLS: the ball's line is also uncertain. Press MEASURE to collapse and see the result.",
        "Aggressive shots (4 and 6) carry a high OUT probability. Defensive shots are safe but score slowly.",
        "Chase the target in 12 balls without being bowled out twice."
      ],
      controls: "Tap outcomes to amplify, H to reset, INTERFERE to rotate, MEASURE to face the ball."
    },
    {
      id: "quantum-badminton", num: 32, title: "Quantum Badminton", emoji: "\u{1F3F8}", cat: "Sports", diff: 2, accent: "pink",
      tags: ["trajectory", "deception"],
      desc: "The shuttlecock has multiple possible trajectories before measurement. Use quantum positioning, interference and strategic measurements to create deceptive shots.",
      instr: [
        "Each hit sends the shuttle down TWO possible trajectories - a smash line and a drop line. The opponent must cover both.",
        "Drag or use the arrow pad to position your player, then tap HIT to return the shuttle.",
        "Press DECEIVE before hitting: your two trajectories diverge further, making the return nearly impossible to read.",
        "Press MEASURE to collapse your opponent's shuttle to one trajectory - but it costs you a point of stamina.",
        "First to 7 points. If the shuttle lands in your court you lose the point."
      ],
      controls: "Drag / arrow pad to move, HIT to return, DECEIVE, MEASURE."
    },
    {
      id: "quantum-tennis", num: 33, title: "Quantum Tennis", emoji: "\u{1F3BE}", cat: "Sports", diff: 2, accent: "yellow",
      tags: ["superposition", "rallies"],
      desc: "Ball trajectories and player positions exist in superposition. Decide when to measure and collapse possible rallies while using quantum operations to alter probabilities.",
      instr: [
        "The ball exists in two possible positions. The solid one is real; the ghost is the alternative.",
        "Move with drag or the arrow pad and press SWING to return the ball. Timing matters - the closer to the ball the stronger the return.",
        "Press COLLAPSE to force the ball into one definite position - easier to hit, but the AI reads it too.",
        "Press SPIN to add interference: the ball's ghost position drifts, making your next shot unpredictable.",
        "Win 6 points to take the set."
      ],
      controls: "Drag / arrow pad to move, SWING to hit, COLLAPSE, SPIN."
    },
    {
      id: "quantum-snooker", num: 34, title: "Quantum Snooker", emoji: "\u{1F3B1}", cat: "Sports", diff: 3, accent: "green",
      tags: ["trajectory", "interference"],
      desc: "Balls exist in multiple possible positions and trajectories before measurement. Manipulate quantum states to create favourable combinations and pocketing opportunities.",
      instr: [
        "Drag to aim (a second ghost aim line shows your alternative), then set POWER and press SHOOT.",
        "Your cue ball travels down both aim lines - it can pot two different balls in one shot if you are clever.",
        "Press MEASURE before shooting to collapse to one aim line: precise, but no double-pot.",
        "Balls sitting on interference zones (the wavy patches) count double when potted.",
        "Pot all 6 coloured balls in 10 shots. Fouls (cue ball potted) cost you a shot."
      ],
      controls: "Drag to aim, power slider, SHOOT / MEASURE."
    },
    {
      id: "quantum-fleet-war", num: 35, title: "Quantum Battleships: Fleet War", emoji: "\u{1F6A2}", cat: "Strategy", diff: 3, accent: "purple",
      tags: ["fleet", "probability"],
      desc: "Multiple ships exist across superposed positions and become definite only after measurements or attacks. Balance probing, probability manipulation and strategic attacks to locate the fleet.",
      instr: [
        "A 10x10 ocean. Your fleet of 5 ships is hidden from the AI; the AI's fleet is a probability cloud.",
        "Tap to fire. Every shot also REVEALS the AI's ship probability heatmap for one turn - use it to plan.",
        "Press SCAN (2 uses) to measure the entire enemy fleet into definite positions. Devastatingly accurate but the AI gets a free double-shot.",
        "Press JAM to distort the AI's targeting for 3 turns, reducing their accuracy.",
        "Sink all 5 enemy ships before your fleet is lost."
      ],
      controls: "Tap the ocean to fire. SCAN, JAM, and a heatmap toggle."
    },
    {
      id: "quantum-sudoku", num: 36, title: "Quantum Sudoku", emoji: "\u{1F522}", cat: "Puzzle", diff: 2, accent: "cyan",
      tags: ["superposition", "constraints"],
      desc: "Numbers initially occupy multiple possible cells or values simultaneously. Quantum constraints, measurements and entanglement let players solve puzzles while controlling when uncertainty collapses.",
      instr: [
        "A 4x4 mini-Sudoku (1-4 in each row, column and 2x2 box). Some cells are GIVEN and locked.",
        "Empty cells show small ghost digits - those are the values still possible there. This is the quantum state of the board.",
        "Tap a cell then a number to NARROW it: you are applying a constraint, not committing. Wrong narrowings are allowed but cost 1 hint.",
        "When a cell shows only ONE possible value it is DETERMINED. Press MEASURE to collapse all determined cells at once.",
        "Fill the whole grid correctly to win. Each wrong MEASURE costs a life (3 lives)."
      ],
      controls: "Tap a cell, then tap a digit to narrow. MEASURE to collapse determined cells."
    },
    {
      id: "quantum-crossword", num: 37, title: "Quantum Crossword", emoji: "\u{1F524}", cat: "Puzzle", diff: 2, accent: "magenta",
      tags: ["letters", "collapse"],
      desc: "Letters exist as superpositions of possible answers until clues or measurements resolve them. Correct quantum constraints can collapse several uncertain words simultaneously.",
      instr: [
        "A small grid with 5 across and 5 down answers. Every letter starts in a superposition of 2-3 candidate characters, shown stacked in each cell.",
        "Tap a word to select it, then type a letter to NARROW that cell. Correct narrowings are kept; wrong ones are rejected.",
        "Press MEASURE to collapse all cells that have been narrowed down to a single letter. Cells where two words agree collapse automatically - that is entanglement doing the work for you.",
        "Complete every cell with the correct letter to win.",
        "You have 3 wrong-letter attempts before the grid locks."
      ],
      controls: "Tap a word / cell, type a letter. MEASURE to collapse determined cells."
    },
    {
      id: "quantum-memory", num: 38, title: "Quantum Memory", emoji: "\u{1F0B4}", cat: "Puzzle", diff: 2, accent: "purple",
      tags: ["entanglement", "memory"],
      desc: "Matching cards exist in uncertain or entangled states rather than having fixed identities. Measure cards to gather information while trying to preserve useful quantum correlations.",
      instr: [
        "A 4x4 grid of face-down cards. Each card is ENTANGLED with one partner - flipping a card also reveals a hint about its partner.",
        "Tap a card to flip it. Flip two matching symbols in a row to score a pair.",
        "Entangled pairs show a shared glow. If you flip a card whose partner you have already seen, you get a bonus reveal of a random third card.",
        "Press ENTANGLE to link two cards you have not yet flipped - they will then match each other, guaranteeing a pair if you can remember both.",
        "Clear the board in as few flips as possible."
      ],
      controls: "Tap cards to flip. ENTANGLE links two hidden cards."
    },
    {
      id: "quantum-treasure-hunt", num: 39, title: "Quantum Treasure Hunt", emoji: "\u{1F5FA}", cat: "Puzzle", diff: 2, accent: "orange",
      tags: ["search", "measurement"],
      desc: "Treasure and clues exist in multiple possible locations simultaneously. Perform measurements and quantum operations to narrow the search while avoiding misleading collapses.",
      instr: [
        "The treasure is hidden on a 10x10 map and exists in 4 possible locations at once.",
        "Tap a location to DIG. A miss narrows the cloud and shows the new probability heatmap; a hit collapses the treasure and you win.",
        "Press CLUE (3 uses) to reveal which ROW or COLUMN definitely does not contain the treasure.",
        "Press INTERFERE to shuffle the treasure's possible locations - sometimes useful when the cloud clusters somewhere you have already dug.",
        "Find the treasure in 8 digs or fewer."
      ],
      controls: "Tap to dig. CLUE, INTERFERE, heatmap toggle."
    },
    {
      id: "quantum-indian-treasure", num: 40, title: "Quantum Indian Treasure Hunt", emoji: "\u{1F3EF}", cat: "Indian Classics", diff: 3, accent: "magenta", inTag: true,
      tags: ["multiplayer", "mythology", "india"],
      desc: "A multiplayer treasure hunt inspired by Indian landmarks, mythology and puzzles. Explore quantum versions of multiple possible locations using measurement, entanglement and interference to find the final treasure.",
      instr: [
        "You and the AI race across 6 legendary sites: Hampi, Konark, Taj Mahal, Meenakshi Temple, Sanchi Stupa and the Sundarbans.",
        "At each site a puzzle hides the relic. The relic exists in 3 possible locations - MEASURE to collapse it, but measuring early gives the AI a head start.",
        "Use ENTANGLE once per site to lock the relic to a location you already know is safe - it costs you nothing.",
        "Collect all 6 relics and reach the final vault before the AI, which pulls one relic every 5.5 seconds.",
        "Every wrong spot you search collapses that possibility, so searching is free information - measuring is the shortcut."
      ],
      controls: "Tap locations to search, MEASURE, ENTANGLE, and TRAVEL to the next site."
    }
  ];

  QG.byId = function (id) {
    for (var i = 0; i < QG.GAMES.length; i++) if (QG.GAMES[i].id === id) return QG.GAMES[i];
    return null;
  };
  QG.accentHex = function (g) {
    var key = g && g.accent ? g.accent : "cyan";
    return QG.PAL[key] || QG.PAL.cyan;
  };
})();
