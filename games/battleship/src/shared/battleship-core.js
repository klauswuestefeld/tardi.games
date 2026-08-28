// Shared battleship core: board model, ship + serialization helpers, and
// DOM board rendering. Imported by both the table and the hand.

var GAME_ID = 'battleship'
var GAME_NAME = 'Battleship'
var BOARD_SIZE = 8
var MAX_PLAYERS = 2

function createBattleshipInstance() {
  var participantIds = []
  var boardsByPlayerId = {}
  var latestPlayers = []
  var phase = 'waiting_for_players'
  var statusText = 'Waiting for two captains.'
  var winnerId = ''

  return {
    loadSnapshot: loadSnapshot,
    syncPlayers: syncPlayers,
    onPlayerDisconnect: onPlayerDisconnect,
    receivePlayerMessage: receivePlayerMessage,
    getPlayerState: getPlayerState,
    getTableState: getTableState,
  }

  function loadSnapshot(players, tableState, playerStatesById) {
    var nextPlayers = players || []
    var nextTableState = tableState || null
    var nextPlayerStates = playerStatesById || {}
    var nextParticipantIds = createPlayerIds(nextPlayers)
    var nextBoardsByPlayerId = {}
    var index
    var playerId

    latestPlayers = nextPlayers.slice()
    participantIds = nextParticipantIds.slice(0, MAX_PLAYERS)

    for (index = 0; index < participantIds.length; index += 1) {
      playerId = participantIds[index]
      nextBoardsByPlayerId[playerId] = createBoardFromPlayerState(nextPlayerStates[playerId] || null)
    }

    boardsByPlayerId = nextBoardsByPlayerId

    if (!nextTableState) {
      updatePhase()
      return
    }

    phase = nextTableState.phase || phase
    statusText = nextTableState.statusText || statusText
    winnerId = nextTableState.winnerId || ''
  }

  function syncPlayers(players) {
    var connectedIds = createPlayerIds(players)
    var openSlots
    var index

    latestPlayers = players.slice()
    participantIds = filterParticipants(participantIds, connectedIds)
    openSlots = MAX_PLAYERS - participantIds.length

    for (index = 0; index < players.length && openSlots > 0; index += 1) {
      if (!contains(participantIds, players[index].id)) {
        participantIds.push(players[index].id)
        openSlots -= 1
      }
    }

    ensureBoards()
    updatePhase()
  }

  function onPlayerDisconnect(playerId, players) {
    latestPlayers = players.slice()

    if (!contains(participantIds, playerId)) {
      return
    }

    participantIds = filterParticipants(participantIds, createPlayerIds(players))
    delete boardsByPlayerId[playerId]
    winnerId = ''
    updatePhase()
  }

  function receivePlayerMessage(playerId, action) {
    var board

    if (!action || !action.type) {
      return
    }

    ensureParticipantForMessage(playerId)

    if (!contains(participantIds, playerId)) {
      return
    }

    board = boardsByPlayerId[playerId]

    if (action.type === 'reset_board') {
      boardsByPlayerId[playerId] = createBoard()
      winnerId = ''
      updatePhase()
      statusText = 'Fleet reset. Mark your ship cells.'
      return
    }

    if (action.type === 'toggle_ship_cell') {
      if (phase !== 'placement') {
        return
      }

      toggleShipCell(board, action.x, action.y)
      statusText = 'Mark your ship cells, then lock in your fleet.'
      return
    }

    if (action.type === 'ready_fleet') {
      if (phase !== 'placement') {
        return
      }

      board.isReady = true
      updatePhase()
      return
    }

    if (action.type === 'toggle_target_cell') {
      if ((phase !== 'battle' && phase !== 'finished') || !getOpponentIdFor(playerId)) {
        return
      }

      toggleTargetCell(board, action.x, action.y)
      updateWinner()
      if (!winnerId) {
        statusText = 'Call coordinates out loud and mark the enemy board yourselves.'
      }
    }
  }

  function ensureParticipantForMessage(playerId) {
    if (contains(participantIds, playerId)) {
      return
    }

    if (!contains(createPlayerIds(latestPlayers), playerId) || participantIds.length >= MAX_PLAYERS) {
      return
    }

    participantIds.push(playerId)
    ensureBoards()
    updatePhase()
  }

  function getPlayerState(playerId, players) {
    var isParticipant = contains(participantIds, playerId)
    var ownBoard = boardsByPlayerId[playerId]
    var opponentId = getOpponentIdFor(playerId)
    var opponentBoard = opponentId ? boardsByPlayerId[opponentId] : null

    return {
      id: GAME_ID,
      name: GAME_NAME,
      phase: phase,
      statusText: getPlayerStatusText(playerId, players),
      participantIds: participantIds.slice(),
      isParticipant: isParticipant,
      players: createOrderedPlayerSummaries(participantIds, players, playerId),
      ownBoard: ownBoard ? serializeOwnBoard(ownBoard) : createEmptyBoardView('water'),
      targetBoard: opponentBoard && ownBoard ? serializeTargetBoard(ownBoard) : createEmptyBoardView('fog'),
      fleetReady: !!(ownBoard && ownBoard.isReady),
      canMarkTarget: (phase === 'battle' || phase === 'finished') && !!opponentBoard && isParticipant,
      opponentName: getPlayerName(players, opponentId),
      turnBannerText: getTurnBannerText(playerId),
      winnerId: winnerId,
    }
  }

  function getTableState(players) {
    var summaries = []
    var index
    var playerId
    var board

    for (index = 0; index < participantIds.length; index += 1) {
      playerId = participantIds[index]
      board = boardsByPlayerId[playerId]
      summaries.push({
        id: playerId,
        name: getPlayerName(players, playerId),
        slotLabel: index === 0 ? 'A' : 'B',
        ready: !!board && board.isReady,
        marksPlaced: board ? countMarkedTargetCells(board) : 0,
        board: board ? serializeTargetBoard(board) : createEmptyBoardView('fog'),
        isWinner: winnerId === playerId,
      })
    }

    return {
      id: GAME_ID,
      name: GAME_NAME,
      phase: phase,
      statusText: statusText,
      players: summaries,
      winnerId: winnerId,
    }
  }

  function updatePhase() {
    var readyCount = countReadyBoards()

    if (participantIds.length < 2) {
      phase = 'waiting_for_players'
      winnerId = ''
      statusText = 'Waiting for two captains.'
      return
    }

    if (readyCount < 2) {
      phase = 'placement'
      winnerId = ''
      if (readyCount === 0) {
        statusText = 'Both captains are marking ship cells.'
      } else {
        statusText = 'One fleet locked in. Waiting for the second captain.'
      }
      return
    }

    if (winnerId) {
      phase = 'finished'
      statusText = 'Battle finished.'
      return
    }

    phase = 'battle'
    statusText = 'Call coordinates out loud and mark the enemy board yourselves.'
  }

  function updateWinner() {
    var index
    var playerId
    var opponentId

    winnerId = ''

    for (index = 0; index < participantIds.length; index += 1) {
      playerId = participantIds[index]
      opponentId = getOpponentIdFor(playerId)

      if (opponentId && hasMarkedAllEnemyShips(boardsByPlayerId[playerId], boardsByPlayerId[opponentId])) {
        winnerId = playerId
        break
      }
    }

    updatePhase()
  }

  function ensureBoards() {
    var index
    var playerId

    for (index = 0; index < participantIds.length; index += 1) {
      playerId = participantIds[index]
      if (!boardsByPlayerId[playerId]) {
        boardsByPlayerId[playerId] = createBoard()
      }
    }
  }

  function countReadyBoards() {
    var count = 0
    var index
    var board

    for (index = 0; index < participantIds.length; index += 1) {
      board = boardsByPlayerId[participantIds[index]]
      if (board && board.isReady) {
        count += 1
      }
    }

    return count
  }

  function getPlayerStatusText(playerId, players) {
    var board = boardsByPlayerId[playerId]

    if (!contains(participantIds, playerId)) {
      return 'Two captains are already playing this round.'
    }

    if (phase === 'waiting_for_players') {
      return 'Waiting for another player to join.'
    }

    if (phase === 'placement') {
      if (board && board.isReady) {
        return 'Fleet ready. Waiting for the other captain.'
      }

      return 'Mark your ship cells, then lock in your fleet.'
    }

    if (phase === 'finished') {
      return 'Battle finished.'
    }

    return 'Call coordinates out loud. Tap the enemy board to cycle unknown, hit, and miss.'
  }

  function getTurnBannerText(playerId) {
    if (!contains(participantIds, playerId)) {
      return 'ROUND FULL'
    }

    if (phase === 'placement') {
      return 'PLACE YOUR FLEET'
    }

    if (phase === 'battle') {
      return 'MARK ENEMY BOARD'
    }

    if (phase === 'finished') {
      return 'BATTLE FINISHED'
    }

    return 'WAITING FOR PLAYERS'
  }

  function getOpponentIdFor(playerId) {
    if (participantIds.length !== 2) {
      return ''
    }

    return participantIds[0] === playerId ? participantIds[1] : participantIds[0]
  }
}

function createBoard() {
  return {
    shipCells: {},
    targetMarks: {},
    isReady: false,
  }
}

function toggleShipCell(board, x, y) {
  var cellIndex = toIndex(x, y)

  if (board.isReady) {
    return
  }

  if (board.shipCells[cellIndex]) {
    delete board.shipCells[cellIndex]
    return
  }

  board.shipCells[cellIndex] = true
}

function toggleTargetCell(board, x, y) {
  var cellIndex = toIndex(x, y)
  var currentMark = board.targetMarks[cellIndex]

  if (currentMark === 'hit') {
    board.targetMarks[cellIndex] = 'miss'
    return
  }

  if (currentMark === 'miss') {
    delete board.targetMarks[cellIndex]
    return
  }

  board.targetMarks[cellIndex] = 'hit'
}

function createBoardFromPlayerState(playerState) {
  var board = createBoard()

  if (!playerState) {
    return board
  }

  applyOwnBoardCells(board.shipCells, playerState.ownBoard)
  applyTargetBoardCells(board.targetMarks, playerState.targetBoard)
  board.isReady = !!playerState.fleetReady
  return board
}

function applyOwnBoardCells(shipCells, ownBoard) {
  var cells = ownBoard && ownBoard.cells ? ownBoard.cells : []
  var index

  for (index = 0; index < cells.length; index += 1) {
    if (cells[index] === 'ship') {
      shipCells[index] = true
    }
  }
}

function applyTargetBoardCells(targetMarks, targetBoard) {
  var cells = targetBoard && targetBoard.cells ? targetBoard.cells : []
  var index

  for (index = 0; index < cells.length; index += 1) {
    if (cells[index] === 'hit' || cells[index] === 'miss') {
      targetMarks[index] = cells[index]
    }
  }
}

function serializeOwnBoard(board) {
  return serializeBoardCells(function (index) {
    if (board.shipCells[index]) {
      return 'ship'
    }

    return 'water'
  })
}

function serializeTargetBoard(board) {
  return serializeBoardCells(function (index) {
    if (board.targetMarks[index] === 'hit') {
      return 'hit'
    }

    if (board.targetMarks[index] === 'miss') {
      return 'miss'
    }

    return 'fog'
  })
}

function createEmptyBoardView(fillState) {
  return serializeBoardCells(function () {
    return fillState
  })
}

function serializeBoardCells(getCellState) {
  var cells = []
  var index

  for (index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    cells.push(getCellState(index))
  }

  return { size: BOARD_SIZE, cells: cells }
}

function countMarkedTargetCells(board) {
  var count = 0
  var index

  for (index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    if (board.targetMarks[index]) {
      count += 1
    }
  }

  return count
}

function hasMarkedAllEnemyShips(attackerBoard, defenderBoard) {
  var index
  var hasAnyShips = false

  if (!attackerBoard || !defenderBoard) {
    return false
  }

  for (index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    if (attackerBoard.targetMarks[index] === 'hit' && !defenderBoard.shipCells[index]) {
      return false
    }

    if (defenderBoard.shipCells[index]) {
      hasAnyShips = true
    }

    if (defenderBoard.shipCells[index] && attackerBoard.targetMarks[index] !== 'hit') {
      return false
    }
  }

  return hasAnyShips
}

function createOrderedPlayerSummaries(orderedPlayerIds, players, selfPlayerId) {
  var summaries = []
  var index
  var playerId

  for (index = 0; index < orderedPlayerIds.length; index += 1) {
    playerId = orderedPlayerIds[index]
    summaries.push({
      id: playerId,
      name: getPlayerName(players, playerId),
      slotLabel: index === 0 ? 'A' : 'B',
      isSelf: selfPlayerId === playerId,
    })
  }

  return summaries
}

function createBoardElement(boardState, options) {
  var board = document.createElement('div')

  board.className = 'board-grid'
  updateBoardElement(board, boardState, options)
  return board
}

function updateBoardElement(board, boardState, options) {
  var interactive = !!(options && options.interactive)
  var row
  var cell
  var x
  var y
  var cellIndex
  var cellState

  board.className = interactive ? 'board-grid board-grid-interactive' : 'board-grid'

  ensureBoardRows(board, boardState.size)

  for (y = 0; y < boardState.size; y += 1) {
    row = board.children[y + 1]

    for (x = 0; x < boardState.size; x += 1) {
      cell = row.children[x + 1]
      cellIndex = toIndex(x, y)
      cellState = boardState.cells[cellIndex]
      cell.className = 'board-cell board-cell-' + cellState
      updateCellLabel(cell, cellState)

      if (interactive) {
        attachCellHandler(cell, options.onSelect, x, y, cellState)
      } else {
        cell.onclick = null
        cell.disabled = true
      }
    }
  }
}

function ensureBoardRows(board, size) {
  var headerRow
  var row
  var label
  var corner
  var cell
  var x
  var y

  if (board.childNodes.length === size + 2 && board.firstChild && board.firstChild.childNodes.length === size + 2) {
    return
  }

  board.replaceChildren()

  headerRow = document.createElement('div')
  headerRow.className = 'board-row board-coordinate-row'
  corner = document.createElement('span')
  corner.className = 'board-coordinate board-coordinate-corner'
  headerRow.append(corner)

  for (x = 0; x < size; x += 1) {
    label = document.createElement('span')
    label.className = 'board-coordinate board-coordinate-column'
    label.textContent = columnLabelForIndex(x)
    headerRow.append(label)
  }

  corner = document.createElement('span')
  corner.className = 'board-coordinate board-coordinate-corner'
  headerRow.append(corner)
  board.append(headerRow)

  for (y = 0; y < size; y += 1) {
    row = document.createElement('div')
    row.className = 'board-row'
    label = document.createElement('span')
    label.className = 'board-coordinate board-coordinate-row-label'
    label.textContent = String(y + 1)
    row.append(label)

    for (x = 0; x < size; x += 1) {
      cell = document.createElement('button')
      cell.type = 'button'
      row.append(cell)
    }

    label = document.createElement('span')
    label.className = 'board-coordinate board-coordinate-row-label'
    label.textContent = String(y + 1)
    row.append(label)
    board.append(row)
  }

  row = document.createElement('div')
  row.className = 'board-row board-coordinate-row'
  corner = document.createElement('span')
  corner.className = 'board-coordinate board-coordinate-corner'
  row.append(corner)

  for (x = 0; x < size; x += 1) {
    label = document.createElement('span')
    label.className = 'board-coordinate board-coordinate-column'
    label.textContent = columnLabelForIndex(x)
    row.append(label)
  }

  corner = document.createElement('span')
  corner.className = 'board-coordinate board-coordinate-corner'
  row.append(corner)
  board.append(row)
}

function attachCellHandler(cell, onSelect, x, y, cellState) {
  cell.onclick = function () {
    onSelect(x, y, cellState)
  }
  cell.disabled = false
}

function cellLabelForState(cellState) {
  if (cellState === 'hit') {
    return '🔥'
  }

  if (cellState === 'ship') {
    return 'S'
  }

  return ''
}

function updateCellLabel(cell, cellState) {
  var firstWave
  var secondWave

  if (cellState !== 'miss') {
    cell.textContent = cellLabelForState(cellState)
    return
  }

  firstWave = document.createElement('span')
  secondWave = document.createElement('span')
  firstWave.className = 'board-cell-miss-wave board-cell-miss-wave-first'
  secondWave.className = 'board-cell-miss-wave board-cell-miss-wave-second'
  firstWave.textContent = '~'
  secondWave.textContent = '~'
  cell.replaceChildren(firstWave, secondWave)
}

function columnLabelForIndex(index) {
  return String.fromCharCode(65 + index)
}

function getPlayerName(players, playerId) {
  var index

  if (!playerId) {
    return 'Unknown captain'
  }

  for (index = 0; index < players.length; index += 1) {
    if (players[index].id === playerId) {
      return players[index].name
    }
  }

  return 'Captain'
}

function filterParticipants(participantIds, connectedIds) {
  var nextIds = []
  var index

  for (index = 0; index < participantIds.length; index += 1) {
    if (contains(connectedIds, participantIds[index])) {
      nextIds.push(participantIds[index])
    }
  }

  return nextIds
}

function createPlayerIds(players) {
  var ids = []
  var index

  for (index = 0; index < players.length; index += 1) {
    ids.push(players[index].id)
  }

  return ids
}

function contains(values, expected) {
  var index

  for (index = 0; index < values.length; index += 1) {
    if (values[index] === expected) {
      return true
    }
  }

  return false
}

function toIndex(x, y) {
  return (y * BOARD_SIZE) + x
}

export {
  createBattleshipInstance as createGame,
  createBoardElement,
  updateBoardElement,
}
