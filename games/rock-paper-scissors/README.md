# Rock-Paper-Scissors — a minimal Tardi game

A minimal, complete Tardi game you can fork to build your own. Two players throw
at the same time; each hand keeps its throw secret until both are in, and the
table reveals them and keeps score. First to 3 round wins takes the match.

It shows the whole shape of a Tardi game: a **table** (the TV display), a
**hand** (each player's controller), and **shared** modules used by both.

## Layout

```
game.json            title, description, player count
assets/thumbnail.png 512x512
src/
  table.js           the TV display: owns the game state
  hand.js            a player's controller: renders and sends throws
  shared/
    rps-rules.js       game rules (what beats what) — used by table AND hand
    arena.js           the responsive score + hands UI — used by table AND hand
dev/index.html       local test harness (one table + two hands)
hand.js, table.js    Build outputs. Must be committed.
```

## The SDK

Your game imports the SDK; nothing is injected globally.

```js
// table.js
import * as TardiTable from '@juxhouse/tardi-core/table'

// hand.js
import * as TardiHand from '@juxhouse/tardi-core/hand'
```

- The **table** calls `TardiTable.startMatch({ onMessage, onPlayersChange })`, broadcasts
  state with `TardiTable.sendToAllHands(state)`, and ends with `TardiTable.endMatch({ victor })`.
- The **hand** calls `TardiHand.joinMatch({ onStateChange })` and sends actions with
  `TardiHand.sendToTable(action)`.

See the Tardi GameSDK docs for the full callback shapes.

## Build

```
npm install
npm run build      # bundles src/ into ES5 hand.js + table.js for old TV browsers
```

`npm run build` runs `tardi-build`, which transpiles your modern JS (classes,
arrow functions, `import`, shared modules) down to a single self-contained ES5
file per role that runs on 2018 TVs. You write modern code; the build makes it
compatible.

## Test it locally

```
npm run dev
```

This serves `dev/index.html`: one table and two hands side by side, wired
together exactly like the Tardi platform but with no PeerJS or lobby. Open it,
play both hands, and watch the table. Throw from each hand: the table shows a
`?` for a throw that is in but not yet revealed, then reveals both.

## Make it yours

1. Edit `game.json` (title, description, players).
2. Replace `assets/thumbnail.png` (512x512).
3. Rewrite `src/` for your game. Keep rules and UI that both sides need in
   `src/shared/`.
4. `npm run build`, then publish the repo.
