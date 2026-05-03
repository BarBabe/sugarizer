'use strict';

    (function () {
    // Minimal directions map
    var directions = {
        north: 0, east: 1, south: 2, west: 3,
        orders: ['north', 'east', 'south', 'west'],
        getOpposite: function (dir) {
            if (dir === 'north') return 'south';
            if (dir === 'south') return 'north';
            if (dir === 'east') return 'west';
            if (dir === 'west') return 'east';
            return null;
        }
    };

    // Public state
    var maze = {
        width: 0, height: 0,
        startPoint: { x: 1, y: 1 },
        goalPoint: { x: 1, y: 1 },
        walls: [], visited: [], directions: [], forks: []
    };

    var controls = {
        'arrows': [38, 39, 40, 37],
        'wasd': [87, 68, 83, 65],
        'ijkl': [73, 76, 75, 74],
        'mouse': [-1, -1, -1, -1]
    };
    var controlNames = ['arrows', 'wasd', 'ijkl', 'mouse'];

    var controlColors = {};
    var controlSprites = {};
    var players = {};
    var gameSize = 60;

    // Drawing defaults (used by draw helpers)
    var cellWidth = 20, cellHeight = 20;
    var wallColor = '#101010', corridorColor = '#ffffff';
    var startColor = "hsl(0, 0%, 80%)";
    var startPlayerColor = "hsl(0, 90%, 50%)";
    var goalColor = "#0f0";
    var debug = false;
    var levelStartingValue = undefined;

    // Utilities
    function createMatrix(width, height) {
        var matrix = [];
        for (var x = 0; x < width; x++) {
            matrix[x] = new Array(height);
        }
        return matrix;
    }

    // initialize returns metadata so tests can inspect maxCellX/Y
    function initialize(aspectRatio, size) {
        // defensive defaults
        aspectRatio = (typeof aspectRatio === 'number' && aspectRatio > 0) ? aspectRatio : (window.innerWidth / window.innerHeight || 1);
        size = (typeof size === 'number' && size > 0) ? size : 60;

        var h = Math.sqrt(size / aspectRatio);
        var w = h * aspectRatio;
        maze.height = Math.floor(h);
        maze.width = Math.floor(w);

        if (maze.width < 3) maze.width = 3;
        if (maze.height < 3) maze.height = 3;

        var maxCellX;
        var maxCellY;
        if (maze.width % 2) {
            maxCellX = maze.width - 2;
        } else {
            maxCellX = maze.width - 3;
        }
        if (maze.height % 2) {
            maxCellY = maze.height - 2;
        } else {
            maxCellY = maze.height - 3;
        }

        // place start and goal on opposite corners 
        maze.startPoint = { x: 1, y: 1 };
        maze.goalPoint = { x: maxCellX, y: maxCellY };

        return { maxCellx: maxCellX, maxCelly: maxCellY, width: maze.width, height: maze.height };
    }

    function generate(aspectRatio, size) {
        initialize(aspectRatio, size);

        maze.walls = createMatrix(maze.width, maze.height);
        maze.visited = createMatrix(maze.width, maze.height);
        maze.directions = createMatrix(maze.width, maze.height);
        maze.forks = createMatrix(maze.width, maze.height);

        // outer border walls = 1, interior = 0 
        for (var x = 0; x < maze.width; x++) {
            for (var y = 0; y < maze.height; y++) {
                maze.walls[x][y] = (x === 0 || y === 0 || x === maze.width - 1 || y === maze.height - 1) ? 1 : 0;
                maze.visited[x][y] = undefined;
                maze.directions[x][y] = [0, 0, 0, 0];
                maze.forks[x][y] = 0;
            }
        }

        findDirections();
        findForks();

        return maze;
    }

    // getDirections returns an Array but also exposes .dirs for backward compatibility
    function getDirections(x, y) {
        var dirs = [0, 0, 0, 0];
        if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) {
            dirs.dirs = dirs;
            return dirs;
        }
        if (maze.walls[x][y] === 1) {
            dirs.dirs = dirs;
            return dirs;
        }

        if (x - 1 >= 0 && maze.walls[x - 1][y] === 0) dirs[directions.west] = 1;
        if (x + 1 < maze.width && maze.walls[x + 1][y] === 0) dirs[directions.east] = 1;
        if (y - 1 >= 0 && maze.walls[x][y - 1] === 0) dirs[directions.north] = 1;
        if (y + 1 < maze.height && maze.walls[x][y + 1] === 0) dirs[directions.south] = 1;

        dirs.dirs = dirs;
        return dirs;
    }

    function findDirections() {
        for (var x = 0; x < maze.width; x++) {
            for (var y = 0; y < maze.height; y++) {
                maze.directions[x][y] = getDirections(x, y);
            }
        }
    }

    function countOptions(x, y) {
        var dirs = (maze.directions[x] && maze.directions[x][y]) || [0, 0, 0, 0];
        return dirs.reduce(function (acc, v) { return acc + (v || 0); }, 0);
    }

    function isDeadEnd(x, y) {
        return countOptions(x, y) === 1;
    }

    function isFork(x, y) {
        return countOptions(x, y) > 2;
    }

    function findForks() {
        for (var x = 0; x < maze.width; x++) {
            for (var y = 0; y < maze.height; y++) {
                maze.forks[x][y] = (isDeadEnd(x, y) || isFork(x, y)) ? 1 : 0;
            }
        }
    }

    // Drawing helpers 
    function drawCell(ctx, x, y, color) {
        if (!ctx) return;
        ctx.fillStyle = color;
        ctx.fillRect(cellWidth * x, cellHeight * y, cellWidth, cellHeight);
    }

    function drawGround(ctx, x, y, value) {
        var color = (value === 1) ? wallColor : corridorColor;
        drawCell(ctx, x, y, color);
    }

    function drawPoint(ctx, x, y, color, size) {
        if (!ctx) return;
        var centerX = cellWidth * (x + 0.5);
        var centerY = cellHeight * (y + 0.5);
        var radius = size * Math.min(cellWidth, cellHeight) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawPlayerFace(ctx, x, y, color) {
        if (!ctx) return;
        drawPoint(ctx, x, y, color, 0.9);
        var eye1X = cellWidth * (x + 0.3);
        var eye1Y = cellHeight * (y + 0.45);
        var eyeRadius = 0.28 * Math.min(cellWidth, cellHeight) / 2;
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeRadius, 0, 2 * Math.PI, false);
        var eye2X = cellWidth * (x + 0.7);
        var eye2Y = cellHeight * (y + 0.45);
        ctx.arc(eye2X, eye2Y, eyeRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeRadius / 2, 0, 2 * Math.PI, false);
        ctx.arc(eye2X, eye2Y, eyeRadius / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cellWidth * (x + 0.25), cellHeight * (y + 0.65));
        ctx.quadraticCurveTo(cellWidth * (x + 0.5), cellHeight * (y + 0.75),
            cellWidth * (x + 0.75), cellHeight * (y + 0.65));
        ctx.fillStyle = "#ffffff";
        ctx.fill();
    }

    function drawSprite(ctx, x, y, spriteData) {
        if (!ctx) return;
        if (!spriteData || !spriteData.image) return;
        ctx.drawImage(spriteData.image,
            cellWidth * spriteData.x, cellHeight * spriteData.y,
            cellWidth, cellHeight,
            cellWidth * x, cellHeight * y,
            cellWidth, cellHeight);
    }

    function drawMazeCell(x, y, ctx) {
        if (!ctx) return;
        if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) return;
        drawGround(ctx, x, y, maze.walls[x][y]);
        if (maze.visited[x][y] !== undefined) drawPoint(ctx, x, y, maze.visited[x][y], 0.5);
        if (debug && maze.forks[x][y] === 1) drawPoint(ctx, x, y, '#faa', 0.5);
        if (x === maze.startPoint.x && y === maze.startPoint.y) drawPoint(ctx, x, y, startColor, 0.9);
        if (x === maze.goalPoint.x && y === maze.goalPoint.y) drawCell(ctx, x, y, goalColor);
        for (var control in players) {
            if (!players.hasOwnProperty(control)) continue;
            var p = players[control];
            if (x === p.x && y === p.y) drawSprite(ctx, x, y, p.sprite);
        }
    }

    function drawMaze(ctx) {
        if (!ctx) return;
        for (var x = 0; x < maze.width; x++) {
            for (var y = 0; y < maze.height; y++) {
                drawGround(ctx, x, y, maze.walls[x][y]);
                if (maze.visited[x][y] !== undefined) drawPoint(ctx, x, y, maze.visited[x][y], 0.5);
                if (debug && maze.forks[x][y] === 1) drawPoint(ctx, x, y, '#faa', 0.5);
            }
        }
        drawPoint(ctx, maze.startPoint.x, maze.startPoint.y, startColor, 0.9);
        drawPlayerFace(ctx, maze.startPoint.x, maze.startPoint.y, startPlayerColor);
        drawCell(ctx, maze.goalPoint.x, maze.goalPoint.y, goalColor);
        for (var c in players) {
            if (!players.hasOwnProperty(c)) continue;
            drawSprite(ctx, players[c].x, players[c].y, players[c].sprite);
        }
    }

    // drawLevelStarting: always compute and return coords; draw only when ctx provided.
    function drawLevelStarting(ctx) {
        var width = cellWidth * (typeof levelStartingValue === 'number' ? levelStartingValue : 1);
        var height = cellHeight * (typeof levelStartingValue === 'number' ? levelStartingValue : 1);
        var x;
        var y;
        if (maze.goalPoint.x === 1) x = cellWidth;
        else x = ((maze.goalPoint.x + 1) * cellWidth) - width;
        if (maze.goalPoint.y === 1) y = cellHeight;
        else y = ((maze.goalPoint.y + 1) * cellHeight) - height;

        if (!ctx) {
            return { x: x, y: y, width: width, height: height };
        }

        ctx.fillStyle = goalColor;
        ctx.fillRect(x, y, width, height);
        drawPoint(ctx, maze.startPoint.x, maze.startPoint.y, startColor, 0.9 * (typeof levelStartingValue === 'number' ? levelStartingValue : 1));
        return { x: x, y: y, width: width, height: height };
    }

    // Player implementation 
    function Player(control) {
        this.control = control;
        this.x = maze.startPoint.x;
        this.y = maze.startPoint.y;
        this.color = (controlColors[control] && controlColors[control].normal) || ('hsl(' + Math.floor(Math.random() * 360) + ',90%,50%)');
        this.sprite = (controlSprites[control] && controlSprites[control].normal) || null;
        this.visitedColor = (controlColors[control] && controlColors[control].visited) || '#eee';
        this.path = undefined;
        this.animation = undefined;
        this.blockTween = undefined;
        this.showBlockedCalled = false;
        this.lastMoveDirection = undefined;

        // ensure color/sprite exist for known controls
        if (controlNames.indexOf(control) !== -1 && !(control in controlColors)) {
            var hue = Math.floor(Math.random() * 360);
            controlColors[control] = {
                normal: 'hsl(' + hue + ', 90%, 50%)',
                blocked: 'hsl(' + hue + ', 90%, 80%)',
                visited: 'hsl(' + hue + ', 30%, 80%)'
            };
            controlSprites[control] = createPlayerSprite(control);
            this.color = controlColors[control].normal;
            this.sprite = controlSprites[control].normal;
            this.visitedColor = controlColors[control].visited;
        }
    }

    Player.prototype.isMoving = function () {
        return this.animation !== undefined;
    };

    Player.prototype.canGo = function (direction) {
        var dirs = maze.directions[this.x] && maze.directions[this.x][this.y];
        var i = directions[direction];
        if (!dirs || i === undefined) return false;
        return dirs[i] === 1;
    };

    Player.prototype.findPath = function (direction) {
        // emulate activity behavior: follow straight corridors until fork/dead-end
        if (!this.canGo(direction)) return [];
        var path = [];
        var cx = this.x, cy = this.y, dir = direction;
        path.push(dir);
        while (true) {
            if (dir === 'north') cy -= 1;
            else if (dir === 'east') cx += 1;
            else if (dir === 'south') cy += 1;
            else if (dir === 'west') cx -= 1;
            if (cx < 0 || cy < 0 || cx >= maze.width || cy >= maze.height) break;
            if (isDeadEnd(cx, cy) || isFork(cx, cy)) break;
            var dirs = maze.directions[cx][cy].slice(0);
            // block the direction we came from
            var opp = directions[getOpposite(dir)];
            if (typeof opp !== 'undefined') dirs[opp] = 0;
            var idx = dirs.indexOf(1);
            if (idx === -1) break;
            dir = directions.orders[idx];
            path.push(dir);
        }
        return path;
    };

    Player.prototype.stop = function () {
        if (this.animation) {
            clearInterval(this.animation);
            this.animation = undefined;
        }
    };

    Player.prototype.showBlocked = function () {
        this.showBlockedCalled = true;
        // simulate blocked animation by toggling sprite/color if available
        if (this.control in controlColors) {
            this.color = controlColors[this.control].blocked;
            this.sprite = (controlSprites[this.control] && controlSprites[this.control].blocked) || this.sprite;
        }
    };

    Player.prototype.move = function (direction) {
        if (this.isMoving()) return;
        if (!this.canGo(direction)) { this.showBlocked(); return; }
        var that = this;
        this.lastMoveDirection = direction;
        this.path = this.findPath(direction);
        this.animation = setInterval(function () {
            // process one step then stop to avoid long-running timers in tests
            var dir = that.path.shift();
            if (!dir) {
                clearInterval(that.animation);
                that.animation = undefined;
                return;
            }
            // move
            if (dir === 'north') that.y -= 1;
            else if (dir === 'east') that.x += 1;
            else if (dir === 'south') that.y += 1;
            else if (dir === 'west') that.x -= 1;
            // mark visited
            if (that.x >= 0 && that.y >= 0 && that.x < maze.width && that.y < maze.height) {
                maze.visited[that.x][that.y] = that.visitedColor;
            }
            if (that.path.length === 0) {
                clearInterval(that.animation);
                that.animation = undefined;
            }
        }, 40);
    };

    function createPlayerSprite(control) {
        // If control is not a known control name, return null to indicate "not drawn"
        if (controlNames.indexOf(control) === -1) {
            return null;
        }
        var i = controlNames.indexOf(control);
        var sprite = {
            normal: { image: null, x: 0, y: i },
            blocked: { image: null, x: 1, y: i }
        };
        controlSprites[control] = sprite;
        return sprite;
    }

    // UI / interaction helpers 
    function updateMazeSize() {
        // try to compute cellWidth/cellHeight based on DOM if available, otherwise use defaults
        var mazeCanvas = document.getElementById && document.getElementById('maze');
        var toolbarElem = document.getElementById && document.getElementById('main-toolbar');
        var unfullscreen = document.getElementById && document.getElementById('unfullscreen-button');

        var canvasWidth = (typeof window !== 'undefined') ? window.innerWidth : (maze.width * cellWidth);
        var canvasHeight = (typeof window !== 'undefined') ? window.innerHeight : (maze.height * cellHeight);

        if (unfullscreen && unfullscreen.style && unfullscreen.style.visibility === 'visible') {
            canvasHeight = (typeof window !== 'undefined') ? window.innerHeight - 3 : canvasHeight - 3;
        } else if (toolbarElem && toolbarElem.offsetHeight) {
            canvasHeight = (typeof window !== 'undefined') ? window.innerHeight - toolbarElem.offsetHeight - 3 : canvasHeight - 3;
        }

        cellWidth = Math.max(1, Math.floor(canvasWidth / Math.max(maze.width, 1)));
        cellHeight = Math.max(1, Math.floor(canvasHeight / Math.max(maze.height, 1)));

        if (mazeCanvas) {
            mazeCanvas.width = canvasWidth;
            mazeCanvas.height = canvasHeight;
        }
    }

    function updateSprites() {
        if (!controls) return;
        for (var control in controls) {
            if (!controls.hasOwnProperty(control)) continue;
            if (control in controlColors) {

                var spr = createPlayerSprite(control);
                if (spr) controlSprites[control] = spr;
            }
        }
    }

    function mazeClick(event) {
        var currentControl = 'mouse';
        if (!(currentControl in players)) players[currentControl] = new Player(currentControl);
        var player = players[currentControl];

        var mazeElem = document.getElementById && document.getElementById('maze');
        var canvasLeft = mazeElem ? mazeElem.offsetLeft || 0 : 0;
        var canvasTop = mazeElem ? mazeElem.offsetTop || 0 : 0;

        var px = cellWidth * (player.x + 0.5);
        var py = cellHeight * (player.y + 0.5);

        var x = (event.clientX || 0) - canvasLeft;
        var y = (event.clientY || 0) - canvasTop;

        var angle = Math.atan2(y - py, x - px) * 180 / Math.PI;
        if (45 < angle && angle < 135) player.move('south');
        else if (-135 < angle && angle < -45) player.move('north');
        else if (-45 < angle && angle < 45) player.move('east');
        else player.move('west');
    }

    function onKeyDown(event) {
        var currentControl;
        var currentDirection;
        for (var control in controls) {
            if (!controls.hasOwnProperty(control)) continue;
            var idx = controls[control].indexOf(event.keyCode);
            if (idx !== -1) {
                currentControl = control;
                currentDirection = directions.orders[idx];
            }
        }
        if (currentControl === undefined) return;
        if (!(currentControl in players)) players[currentControl] = new Player(currentControl);
        players[currentControl].move(currentDirection);
    }

  
    var presence = null;
    var isHost = false;
    var oponentEnded = 0;
    var oponentCount = 0;

    function onNetworkDataReceived(msg) {
        if (!msg || !msg.user) return;
        if (presence && presence.getUserInfo && presence.getUserInfo().networkId === msg.user.networkId) {
            return;
        }
        if (msg.action === 'start') {
            oponentEnded = 0;
            if (msg.content) maze = msg.content;
            if (typeof msg.SizeOfGame !== 'undefined') gameSize = msg.SizeOfGame;
            if (typeof msg.oponentCount !== 'undefined') oponentCount = msg.oponentCount;
            updateMazeSize();
            updateSprites();
        } else if (msg.action === 'ended') {
            oponentEnded++;
        }
    }

    function onNetworkUserChanged(msg) {
        if (!msg || !msg.user) return;
        if (msg.move === 1) oponentCount++;
        else if (msg.move === -1) oponentCount--;
        // if host, would send start broadcast in real app; shim does not perform network I/O
    }

    function getOpposite(dirName) {
        return directions.getOpposite(dirName);
    }

    // Expose API to window & CommonJS for tests
    if (typeof window !== 'undefined') {
        window.directions = directions;
        window.generate = generate;
        window.initialize = initialize;
        window.countOptions = countOptions;
        window.isDeadEnd = isDeadEnd;
        window.isFork = isFork;
        window.Player = Player;
        window.createPlayerSprite = createPlayerSprite;
        window.getDirections = getDirections;
        window.findDirections = findDirections;
        window.findForks = findForks;
        window.createMatrix = createMatrix;
        window.drawCell = drawCell;
        window.drawGround = drawGround;
        window.drawPoint = drawPoint;
        window.drawPlayerFace = drawPlayerFace;
        window.drawSprite = drawSprite;
        window.drawMazeCell = drawMazeCell;
        window.drawMaze = drawMaze;
        window.drawLevelStarting = drawLevelStarting;
        window.updateMazeSize = updateMazeSize;
        window.updateSprites = updateSprites;
        window.mazeClick = mazeClick;
        window.onKeyDown = onKeyDown;
        window.onNetworkDataReceived = onNetworkDataReceived;
        window.onNetworkUserChanged = onNetworkUserChanged;

        
        window.maze = maze;
        window.controlColors = controlColors;
        window.controlNames = controlNames;
        window.controlSprites = controlSprites;
        window.players = players;
        window.gameSize = gameSize;
        window.oponentEnded = oponentEnded;
        window.oponentCount = oponentCount;
        window.debug = debug;
        window.presence = presence;
        window.isHost = isHost;
        window.cellWidth = cellWidth;
        window.cellHeight = cellHeight;
        window.levelStartingValue = levelStartingValue;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            generate: generate,
            initialize: initialize,
            countOptions: countOptions,
            isDeadEnd: isDeadEnd,
            isFork: isFork,
            Player: Player,
            createPlayerSprite: createPlayerSprite,
            getDirections: getDirections,
            findDirections: findDirections,
            findForks: findForks,
            createMatrix: createMatrix,
            drawCell: drawCell,
            drawGround: drawGround,
            drawPoint: drawPoint,
            drawSprite: drawSprite,
            drawMazeCell: drawMazeCell,
            drawMaze: drawMaze,
            drawLevelStarting: drawLevelStarting,
            updateMazeSize: updateMazeSize,
            updateSprites: updateSprites,
            mazeClick: mazeClick,
            onKeyDown: onKeyDown,
            onNetworkDataReceived: onNetworkDataReceived,
            onNetworkUserChanged: onNetworkUserChanged,
            maze: maze,
            controlColors: controlColors,
            controlNames: controlNames,
            controlSprites: controlSprites,
            players: players,
            debug: debug,
            presence: presence,
            isHost: isHost,
            cellWidth: cellWidth,
            cellHeight: cellHeight,
            levelStartingValue: levelStartingValue
        };
    }
})();


(function () {
    // helper to execute a player's path synchronously
    function runPlayerPathSync(playerOrControl, direction) {
        var player = playerOrControl;
        if (typeof playerOrControl === 'string') {
            player = players[playerOrControl];
            if (!player) return null;
        }
        if (!player) return null;

        // If direction provided, compute path for that direction.
        if (typeof direction === 'string') {
            player.path = player.findPath(direction);
        } else if (!player.path || player.path.length === 0) {
            // use lastMoveDirection if available
            if (player.lastMoveDirection) {
                player.path = player.findPath(player.lastMoveDirection);
            } else {
                player.path = [];
            }
        }

        while (player.path && player.path.length > 0) {
            var dir = player.path.shift();
            if (dir === 'north') player.y -= 1;
            else if (dir === 'east') player.x += 1;
            else if (dir === 'south') player.y += 1;
            else if (dir === 'west') player.x -= 1;

            if (player.x >= 0 && player.y >= 0 && player.x < maze.width && player.y < maze.height) {
                maze.visited[player.x][player.y] = player.visitedColor;
            }
        }
        // clear animation state to match end of run
        if (player.animation) {
            clearInterval(player.animation);
            player.animation = undefined;
        }
        return { x: player.x, y: player.y };
    }

    function runAllPlayersPathSync() {
        for (var c in players) {
            if (!players.hasOwnProperty(c)) continue;
            runPlayerPathSync(players[c]);
        }
    }

    // expose helpers
    if (typeof window !== 'undefined') {
        window.runPlayerPathSync = runPlayerPathSync;
        window.runAllPlayersPathSync = runAllPlayersPathSync;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.runPlayerPathSync = runPlayerPathSync;
        module.exports.runAllPlayersPathSync = runAllPlayersPathSync;
    }
})();
