import * as TardiTable from '@juxhouse/tardi-core/table'
import { createGame, createBoardElement, updateBoardElement } from './shared/battleship-core.js'

(function () {
  var TABLE_STYLES = `
    :root {
      font-size: calc(6px + 1.2vmin);
    }

    .table-game {
      display: flex;
      flex-direction: column;
      gap: 2vmin;
      height: 100%;
      min-height: 0;
    }

    .table-game-title {
      margin: 0;
      font-size: 2rem;
      line-height: 1.05;
    }

    .table-game-status {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.2;
      color: #cbd5e1;
    }

    .table-turn-banner {
      margin: 0;
      padding: 2vmin 3vmin;
      border-radius: 5vmin;
      background: #334155;
      font-size: 2.4rem;
      line-height: 1;
      text-align: center;
      font-weight: bold;
      letter-spacing: .08em;
      color: #e2e8f0;
    }

    .table-game-boards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: minmax(0, 1fr);
      gap: 2.5vmin;
      flex: 1;
      min-height: 0;
    }

    .table-game-panel {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      gap: 1vmin;
      box-sizing: border-box;
      min-height: 0;
      overflow: hidden;
    }

    .table-game-panel-title {
      margin: 0;
      font-size: 1.7rem;
      line-height: 1.05;
    }

    .table-game-panel-note {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.15;
      color: #cbd5e1;
    }

    .table-game-header {
      display: flex;
      flex-direction: column;
      gap: 1vmin;
    }

    .board-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5vmin;
      width: min(100%, calc((100vh - 44vmin) * 0.88));
      align-self: center;
      justify-self: center;
      flex: 0 1 auto;
    }

    .board-row {
      display: grid;
      grid-template-columns: minmax(1.5vmin, .45fr) repeat(8, minmax(0, 1fr)) minmax(1.5vmin, .45fr);
      gap: 0.5vmin;
    }

    .board-coordinate {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 1.5vmin;
      color: #93c5fd;
      font-size: .9rem;
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
      border-radius: 1.5vmin;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .05);
      background: #0f172a;
      color: #e2e8f0;
      font-size: 1.1rem;
      font-weight: bold;
      position: relative;
      opacity: 1;
    }

    .board-cell[disabled] {
      opacity: 1;
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
    }

    .board-cell-miss {
      background: #1d4ed8;
      color: #ffffff;
      border-color: #93c5fd;
    }

    .board-cell-miss-wave {
      position: absolute;
      display: block;
      font-size: .8rem;
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

  `
  var root = document.createElement('main')
  var game = createGame()
  var latestState = null
  var latestPlayers = []
  var latestWinnerId = ''
  var view = createTableView()

  appendStyleOnce('battleship-table-styles', TABLE_STYLES)

  root.style.width = '100%'
  root.style.height = '100%'
  document.body.replaceChildren(root)
  root.append(view.wrap)

  TardiTable.startMatch({
    onMessage: handleMessage,
    onPlayersChange: handlePlayersChange,
  })

  function handlePlayersChange(data) {
    latestPlayers = normalizePlayers(data.players)
    game.syncPlayers(latestPlayers)
    syncAndPublish()
  }

  function handleMessage(message) {
    if (!message || !message.playerId) {
      return
    }

    game.receivePlayerMessage(message.playerId, message.messageFromHand || {})
    syncAndPublish()
  }

  function syncAndPublish() {
    latestState = game.getTableState(latestPlayers)
    render()
    publishToHands()
    publishGameOver()
  }

  function render() {
    if (!latestState) {
      view.wrap.style.display = 'none'
      return
    }

    view.wrap.style.display = 'flex'
    renderBattleshipTableView(view, latestState)
  }

  function renderBattleshipTableView(tableView, state) {
    var index
    var player

    tableView.title.textContent = state.name
    tableView.turnBanner.textContent = getTableTurnBannerText(state)
    tableView.status.textContent = state.statusText

    for (index = 0; index < state.players.length; index += 1) {
      player = state.players[index]
      syncPlayerPanel(tableView, index, player, state)
    }

    while (tableView.panels.length > state.players.length) {
      tableView.boards.removeChild(tableView.panels.pop().panel)
    }
  }

  function createTableView() {
    var wrap = document.createElement('section')
    var turnBanner = document.createElement('p')
    var heading = document.createElement('div')
    var title = document.createElement('h2')
    var status = document.createElement('p')
    var boards = document.createElement('div')

    wrap.className = 'table-game'
    wrap.style.display = 'none'
    turnBanner.className = 'table-turn-banner'
    heading.className = 'table-game-header'
    title.className = 'table-game-title'
    status.className = 'table-game-status'
    boards.className = 'table-game-boards'

    heading.append(title, status)
    wrap.append(turnBanner, heading, boards)

    return {
      wrap: wrap,
      turnBanner: turnBanner,
      title: title,
      status: status,
      boards: boards,
      panels: [],
    }
  }

  function syncPlayerPanel(tableView, index, player, state) {
    var panelView = tableView.panels[index]
    var boardPlayer

    if (!panelView) {
      panelView = createPlayerPanelView()
      tableView.panels.push(panelView)
      tableView.boards.append(panelView.panel)
    }

    panelView.title.textContent = player.name
    if (state.phase === 'placement') {
      panelView.note.textContent = player.ready ? 'Fleet locked in.' : 'Placing ships.'
    } else {
      panelView.note.textContent = 'Red means ship. Blue means sea.'
    }

    boardPlayer = getSwappedBoardPlayer(state.players, index)
    updateBoardElement(panelView.board, boardPlayer.board, { interactive: false })
  }

  function getSwappedBoardPlayer(players, index) {
    if (players.length < 2) {
      return players[index]
    }

    return players[(players.length - 1) - index]
  }

  function createPlayerPanelView() {
    var panel = document.createElement('section')
    var title = document.createElement('h3')
    var note = document.createElement('p')
    var board = createBoardElement(createEmptyBoardView(), { interactive: false })

    panel.className = 'table-game-panel'
    title.className = 'table-game-panel-title'
    note.className = 'table-game-panel-note'
    panel.append(title, note, board)

    return {
      panel: panel,
      title: title,
      note: note,
      board: board,
    }
  }

  function createEmptyBoardView() {
    var cells = {}
    var index

    for (index = 0; index < 64; index += 1) {
      cells[index] = 'fog'
    }

    return {
      size: 8,
      cells: cells,
    }
  }

  function getTableTurnBannerText(state) {
    if (state.phase === 'placement') {
      return 'PLACE YOUR FLEETS'
    }

    if (state.phase === 'battle') {
      return 'MARK ENEMY BOARDS'
    }

    if (state.phase === 'finished') {
      return 'BATTLE FINISHED'
    }

    return 'WAITING FOR PLAYERS'
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

  function publishToHands() {
    var playerStatesById = {}
    var index
    var player

    for (index = 0; index < latestPlayers.length; index += 1) {
      player = latestPlayers[index]
      playerStatesById[player.id] = game.getPlayerState(player.id, latestPlayers)
    }

    TardiTable.sendToAllHands({
      tableState: latestState,
      playerStatesById: playerStatesById,
    })
  }

  function publishGameOver() {
    var winnerId = latestState && latestState.winnerId ? latestState.winnerId : ''

    if (!winnerId || winnerId === latestWinnerId) {
      latestWinnerId = winnerId
      return
    }

    latestWinnerId = winnerId
    TardiTable.endMatch({ victor: winnerId })
  }

  function normalizePlayers(players) {
    var normalized = []
    var index
    var player

    for (index = 0; index < players.length; index += 1) {
      player = players[index] || {}
      normalized.push({
        id: player.playerId || ('player-' + index),
        name: player.nick || '<No Nick>',
      })
    }

    return normalized
  }
}())
