import * as TardiHand from '@juxhouse/tardi-core/hand'
import { createBoardElement } from './shared/battleship-core.js'

(function () {
  var HAND_STYLES = `
    :root {
      font-size: calc(6px + 1.2vmin);
    }

    .game-shell {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .game-status {
      margin: 0;
      font-size: 1.7rem;
      line-height: 1.12;
      color: #f8fafc;
    }

    .game-turn-banner {
      margin: 0;
      padding: 6px 8px;
      border-radius: 12px;
      background: #334155;
      font-size: 3.7rem;
      line-height: 1;
      text-align: center;
      font-weight: bold;
      letter-spacing: .08em;
      color: #e2e8f0;
    }

    .game-panel-title {
      margin: 0;
      font-size: 1.7rem;
      line-height: 1.05;
      color: #93c5fd;
    }

    .game-panel {
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr);
      gap: 4px;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    }

    .game-note {
      margin: 0;
      font-size: 1.3rem;
      line-height: 1.08;
      color: #cbd5e1;
    }

    .game-button {
      min-height: 28px;
      padding: 5px 8px;
      border: 0;
      border-radius: 12px;
      background: #38bdf8;
      color: #082f49;
      font-size: 2.1rem;
      font-weight: bold;
    }

    .game-button-secondary {
      background: #334155;
      color: #e2e8f0;
    }

    .game-controls {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: start;
      min-height: 0;
    }

    .game-boards {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 8px;
      min-height: 0;
      flex: 1;
    }

    .board-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: min(100%, 28vh, 92vw);
      max-width: 100%;
      min-width: 0;
      align-self: center;
      justify-self: center;
    }

    .board-grid-live-target {
      padding: 2px;
      background: #0f172a;
      box-shadow: inset 0 0 0 2px rgba(148, 163, 184, .22);
    }

    .board-row {
      display: grid;
      grid-template-columns: minmax(.7em, .42fr) repeat(8, minmax(0, 1fr)) minmax(.7em, .42fr);
      gap: 2px;
    }

    .board-coordinate {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: .8em;
      color: #93c5fd;
      font-size: 1.1rem;
      font-weight: bold;
      line-height: 1;
    }

    .board-coordinate-row-label {
      aspect-ratio: 1 / 1;
      align-self: center;
    }

    .board-cell {
      appearance: none;
      -webkit-appearance: none;
      aspect-ratio: 1 / 1;
      min-height: 0;
      padding: 0;
      border: 1px solid rgba(125, 211, 252, .35);
      border-radius: 4px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .05);
      background: #0f172a;
      color: #e2e8f0;
      font-size: 1.5rem;
      font-weight: bold;
      position: relative;
      opacity: 1;
    }

    .board-cell[disabled] {
      opacity: 1;
    }

    .board-grid-interactive .board-cell {
      cursor: pointer;
    }

    .board-cell-water {
      background: #10233a;
    }

    .board-cell-fog {
      background: #1e293b;
    }

    .board-cell-ship {
      background: #6b7280;
      border-color: #d1d5db;
    }

    .board-cell-hit {
      background: #dc2626;
      border-color: #fecaca;
      color: #fee2e2;
      font-size: 4.7rem;
      line-height: 1;
    }

    .board-cell-miss {
      background: #1d4ed8;
      color: #ffffff;
      border-color: #93c5fd;
    }

    .board-cell-miss-wave {
      position: absolute;
      display: block;
      font-size: 3.1rem;
      font-weight: bold;
      line-height: 1;
      color: #ffffff;
    }

    .board-cell-miss-wave-first {
      left: 24%;
      top: 8%;
    }

    .board-cell-miss-wave-second {
      right: 24%;
      bottom: 8%;
    }

    @media (max-height: 420px) {
      .game-shell {
        gap: 5px;
      }

      .game-boards {
        gap: 5px;
      }

      .game-panel {
        gap: 3px;
      }

      .game-turn-banner {
        padding: 4px 6px;
        font-size: 2.7rem;
      }

      .game-status,
      .game-panel-title {
        font-size: 2.1rem;
      }

      .game-note {
        font-size: 1.5rem;
        line-height: 1.04;
      }

      .game-controls {
        gap: 4px;
      }

      .game-button {
        min-height: 22px;
        padding: 3px 6px;
        font-size: 2.1rem;
        border-radius: 9px;
      }

      .board-grid {
        width: min(100%, 18vh, 68vw);
      }

      .board-row {
        gap: 1px;
      }

      .board-coordinate {
        font-size: 0.9rem;
      }

      .board-cell {
        font-size: 1.2rem;
        border-radius: 3px;
      }
    }
  `
  var latestState = null
  var root = document.createElement('main')

  appendStyleOnce('battleship-hand-styles', HAND_STYLES)

  root.style.width = '100%'
  root.style.height = '100%'
  root.style.overflow = 'hidden'
  document.body.replaceChildren(root)

  TardiHand.joinMatch({
    onStateChange: handleStateChange,
  })

  function handleStateChange(msg) {
    if (!msg || !msg.messageFromTable) {
      return
    }

    latestState = msg.messageFromTable.playerStatesById
      ? msg.messageFromTable.playerStatesById[msg.playerId] || null
      : null
    render()
  }

  function render() {
    root.replaceChildren()

    if (!latestState) {
      return
    }

    renderBattleshipPlayerView(root, latestState, {
      sendToTable: function (message) {
        TardiHand.sendToTable(message)
      },
    })
  }

  function renderBattleshipPlayerView(container, state, controls) {
    var wrap = document.createElement('section')
    var turnBanner = document.createElement('p')
    var header = document.createElement('div')
    var status = document.createElement('p')
    var boards = document.createElement('div')
    var orderedPlayers = getHandBoardPlayers(state)
    var index
    var player

    wrap.className = 'game-shell'
    turnBanner.className = 'game-turn-banner'
    header.className = 'game-header'
    status.className = 'game-status'
    boards.className = 'game-boards'

    turnBanner.textContent = getTurnBannerText(state)
    status.textContent = state.statusText

    header.append(status)

    for (index = 0; index < orderedPlayers.length; index += 1) {
      player = orderedPlayers[index]
      boards.append(createPlayerBoardPanel(player, state, controls))
    }

    wrap.append(turnBanner, header, boards)
    container.replaceChildren(wrap)
  }

  function getHandBoardPlayers(state) {
    var opponents = []
    var self = null
    var index
    var player

    for (index = 0; index < state.players.length; index += 1) {
      player = state.players[index]
      if (player.isSelf) {
        self = player
      } else if (state.phase !== 'placement') {
        opponents.push(player)
      }
    }

    if (self) {
      opponents.push(self)
    }

    return opponents
  }

  function createPlayerBoardPanel(player, state, controls) {
    var panel = document.createElement('section')
    var title = document.createElement('h2')
    var note = document.createElement('p')
    var controlsRow = document.createElement('div')
    var readyButton = document.createElement('button')
    var boardState = player.isSelf ? state.ownBoard : state.targetBoard
    var isPlacementBoard = player.isSelf && state.phase === 'placement' && state.isParticipant && !state.fleetReady
    var isTargetBoard = !player.isSelf && state.phase === 'battle' && state.isParticipant && state.canMarkTarget
    var boardElement

    panel.className = 'game-panel'
    title.className = 'game-panel-title'
    note.className = 'game-note'
    controlsRow.className = 'game-controls'
    readyButton.className = 'game-button'

    title.textContent = player.isSelf ? 'Your Fleet' : 'Enemy Waters'

    if (player.isSelf) {
      if (state.phase === 'placement' && state.isParticipant) {
        readyButton.textContent = 'Ready for battle'
        readyButton.onclick = function () {
          controls.sendToTable({
            type: 'ready_fleet',
          })
        }

        if (!state.fleetReady) {
          controlsRow.append(readyButton)
        }
        note.textContent = state.fleetReady ? 'Fleet locked in.' : 'Tap cells to mark or erase your ship positions.'
      } else {
        note.textContent = state.phase === 'battle' ? 'Your fleet. Ships are grey. Turn-taking and hit calls happen in real life.' : state.statusText
      }
    } else if (!state.isParticipant) {
      note.textContent = 'This round is full.'
    } else if (state.phase === 'battle') {
      note.textContent = 'Enemy board. Tap a cell to cycle unknown, hit, miss, then back to unknown.'
    } else {
      note.textContent = 'Enemy waters. Unlocks once both fleets are placed.'
    }

    boardElement = createBoardElement(boardState, {
      interactive: isPlacementBoard || isTargetBoard,
      onSelect: function (x, y, cell) {
        if (isPlacementBoard) {
          controls.sendToTable({
            type: 'toggle_ship_cell',
            x: x,
            y: y,
          })
          return
        }

        controls.sendToTable({
          type: 'toggle_target_cell',
          x: x,
          y: y,
        })
      },
    })

    if (isTargetBoard) {
      boardElement.className += ' board-grid-live-target'
    }

    panel.append(title, note, controlsRow, boardElement)
    return panel
  }

  function getTurnBannerText(state) {
    if (state.phase === 'placement' && state.fleetReady) {
      return 'WAITING...'
    }

    return state.turnBannerText
  }

  function appendStyleOnce(styleId, cssText) {
    var existingStyle = document.getElementById(styleId)
    var style

    if (existingStyle) {
      return existingStyle
    }

    style = document.createElement('style')
    style.id = styleId
    style.textContent = cssText
    document.head.append(style)
    return style
  }

}())
