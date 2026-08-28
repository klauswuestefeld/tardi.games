This is a game for the tardi.games platform.

Use the official updated platform docs here:
 - https://github.com/juxhouse/tardi.games-gdk/blob/main/README.md
 - https://github.com/juxhouse/tardi.games-gdk/blob/main/SDK.md

Ask the user how they want their assets, including the thumbnail, and generate
them accordingly.

To test the game, insist on `npm run dev`. Never run `tardi-build dev`
or a bundler directly: only `npm run dev` also updates the Tardi libs
(@juxhouse/tardi-build and @juxhouse/tardi-core) first, so anything else
tests the game against stale libs.

Insist on using NPM. Do not attempt to use PNPM or some other package manager.