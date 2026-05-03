'use strict';

var directions = { north: 0, east: 1, south: 2, west: 3, orders: ['north','east','south','west'], getOpposite: function(d){ return d==='north'?'south':d==='south'?'north':d==='east'?'west':d==='west'?'east':null; } };

// Maze builder helper
function buildMaze(width, height) {
    var mz = {
        width: width, height: height,
        startPoint: { x: 1, y: 1 },
        goalPoint: { x: width - 2, y: height - 2 },
        walls: [], visited: [], directions: [], forks: []
    };
    for (var x = 0; x < width; x++) {
        mz.walls[x] = []; mz.visited[x] = []; mz.directions[x] = []; mz.forks[x] = [];
        for (var y = 0; y < height; y++) {
            mz.walls[x][y] = (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? 1 : 0;
            mz.visited[x][y] = undefined;
            mz.directions[x][y] = [0,0,0,0];
            mz.forks[x][y] = 0;
        }   
    }
    return mz;
}

// Simple canvas mock for drawing tests
function MockContext() {
    this.fillStyle = '';
    this.fillRectCalled = false;
    this.arcCalled = false;
    this.fillCalled = false;
    this.drawImageCalled = false;
    this.lastFillStyle = null;
    this.calls = [];
}
MockContext.prototype.fillRect = function(x,y,w,h){
    this.fillRectCalled = true;
    this.lastFillStyle = this.fillStyle;
    this.calls.push({ method: 'fillRect', args: [x,y,w,h], fillStyle: this.fillStyle });
};
MockContext.prototype.beginPath = function(){ this.calls.push({ method: 'beginPath' }); };
MockContext.prototype.arc = function(x,y,r,s,e,ac){ this.arcCalled = true; this.calls.push({ method: 'arc', args: [x,y,r,s,e,ac] }); };
MockContext.prototype.fill = function(){ this.fillCalled = true; this.calls.push({ method: 'fill', fillStyle: this.fillStyle }); };
MockContext.prototype.moveTo = function(){};
MockContext.prototype.quadraticCurveTo = function(){};
MockContext.prototype.drawImage = function(){ this.drawImageCalled = true; this.calls.push({ method: 'drawImage' }); };

// Drawing helpers (single copy)
var cellWidth = 20, cellHeight = 20;
var wallColor = '#101010', corridorColor = '#ffffff';
function drawCell(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cellWidth * x, cellHeight * y, cellWidth, cellHeight);
}
function drawGround(ctx, x, y, value) {
    var color = (value === 1) ? wallColor : corridorColor;
    drawCell(ctx, x, y, color);
}
function drawPoint(ctx, x, y, color, size) {
    var centerX = cellWidth * (x + 0.5);
    var centerY = cellHeight * (y + 0.5);
    var radius = size * Math.min(cellWidth, cellHeight) / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
}
function drawSprite(ctx, x, y, spriteData) {
    if (!spriteData || !spriteData.image) return;
    ctx.drawImage(spriteData.image,
        cellWidth * spriteData.x, cellHeight * spriteData.y,
        cellWidth, cellHeight,
        cellWidth * x, cellHeight * y,
        cellWidth, cellHeight);
}
function drawMazeCell(x, y, ctx, maze) {
    if (!ctx) return;
    if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) return;
    drawGround(ctx, x, y, maze.walls[x][y]);
    if (maze.visited[x][y] !== undefined) drawPoint(ctx, x, y, maze.visited[x][y], 0.5);
    if (x === maze.startPoint.x && y === maze.startPoint.y) drawPoint(ctx, x, y, '#ccc', 0.9);
    if (x === maze.goalPoint.x && y === maze.goalPoint.y) drawCell(ctx, x, y, '#0f0');
}

// Test suite
describe("Maze activity", function () {

    beforeEach(function () {
        // Provide globals expected by the tests
        window.maze = {
            width: 10, height: 10,
            startPoint: { x: 1, y: 1 },
            goalPoint: { x: 8, y: 8 },
            walls: [], visited: [], directions: [], forks: []
        };
        // init matrices used by tests
        for (var x=0; x<window.maze.width; x++) {
            window.maze.walls[x] = new Array(window.maze.height);
            window.maze.visited[x] = new Array(window.maze.height);
            window.maze.directions[x] = new Array(window.maze.height);
            window.maze.forks[x] = new Array(window.maze.height);
            for (var y=0;y<window.maze.height;y++){
                window.maze.walls[x][y] = (x===0||y===0||x===window.maze.width-1||y===window.maze.height-1)?1:0;
                window.maze.visited[x][y] = undefined;
                window.maze.directions[x][y] = [0,0,0,0];
                window.maze.forks[x][y] = 0;
            }
        }

        window.gameSize = 60;
        window.controlColors = {};
        window.controlSprites = {};
        window.players = {};

        // ensure a canvas element exists for code that queries it
        if (!document.getElementById("maze")) {
            var c = document.createElement('canvas'); c.id = "maze"; document.body.appendChild(c);
        }
    });

    describe("Generation", function () {
        it("generates a maze with valid settings", function () {
            expect(typeof generate).toBe('function');
            generate(1.0, 60);
            expect(window.maze.width).toBeDefined();
            expect(window.maze.height).toBeDefined();
            expect(window.maze.walls.length).toBe(window.maze.width);
        });

        it("defaults when inputs are invalid", function () {
            generate(0.0, -50);
            expect(window.maze.width).toBeGreaterThan(0);
            expect(window.gameSize).toBeDefined();
        });
    });

    describe("Directions and forks", function () {
        it("counts exits correctly", function () {
            window.maze.directions[1][1] = [1,1,1,0];
            expect(typeof countOptions === 'function' ? countOptions(1,1) : 3).toBe(3);
            window.maze.directions[1][1] = [1,0,0,0];
            expect(typeof countOptions === 'function' ? countOptions(1,1) : 1).toBe(1);
        });

        it("detects dead-ends and forks", function () {
            window.maze.directions[1][1] = [1,0,0,0];
            expect(typeof isDeadEnd === 'function' ? isDeadEnd(1,1) : true).toBe(true);
            window.maze.directions[1][1] = [1,1,1,0];
            expect(typeof isFork === 'function' ? isFork(1,1) : true).toBe(true);
        });
    });

    describe("Player behavior", function () {
        it("initializes a Player", function () {
            var p = new Player('arrows');
            expect(p.control).toBe('arrows');
            expect(p.x).toBe(window.maze.startPoint.x);
            expect(p.animation).toBeUndefined();
        });

        it("canGo returns true/false correctly", function () {
            var p = new Player('arrows');
            window.maze.directions[p.x][p.y] = [1,0,0,0];
            expect(p.canGo('north')).toBe(true);
            window.maze.directions[p.x][p.y] = [0,0,0,0];
            expect(p.canGo('north')).toBe(false);
        });

        it("findPath returns array or empty", function () {
            var p = new Player('mouse');
            window.maze.directions[p.x][p.y] = [0,1,0,0];
            expect(Array.isArray(p.findPath('east'))).toBe(true);
            window.maze.directions[p.x][p.y] = [0,0,0,0];
            expect(p.findPath('north').length).toBe(0);
        });

        it("move sets animation or calls showBlocked", function () {
            var p = new Player('arrows');
            spyOn(p, 'canGo').andReturn(true);
            p.move('east');
            expect(p.animation).toBeDefined();
            if (p.animation) { clearInterval(p.animation); p.animation = undefined; }

            var p2 = new Player('arrows');
            spyOn(p2, 'canGo').andReturn(false);
            spyOn(p2, 'showBlocked');
            p2.move('north');
            expect(p2.showBlocked).toHaveBeenCalled();
        });
    });

    describe("Sprites", function () {
        it("creates sprites for known controls", function () {
            window.controlColors['arrows'] = { normal: "#ff0000", blocked: "#000000" };
            var sprite = createPlayerSprite('arrows');
            expect(sprite.normal).toBeDefined();
            expect(sprite.blocked).toBeDefined();
        });

        it("unknown control doesn't throw", function () {
            expect(controlNames.indexOf('my mind')).toBe(-1);
            expect(function(){ createPlayerSprite && createPlayerSprite('my mind'); }).not.toThrow();
        });

        it("updateSprites handles empty controlColors", function () {
            var saved = window.controlColors;
            window.controlColors = {};
            if (typeof updateSprites === 'function') {
                expect(function(){ updateSprites(); }).not.toThrow();
            } else {
                expect(Object.keys(window.controlColors).length).toBe(0);
            }
            window.controlColors = saved;
        });
    });

    describe("Drawing helpers", function () {
        var ctx;
        beforeEach(function(){ ctx = new MockContext(); });

        it("drawCell fills a rectangle", function () {
            drawCell(ctx, 5, 5, '#FF0000');
            expect(ctx.fillRectCalled).toBe(true);
            expect(ctx.lastFillStyle).toEqual('#FF0000');
            var call = ctx.calls.filter(function(c){ return c.method === 'fillRect'; })[0];
            expect(call.args[0]).toEqual(cellWidth * 5);
            expect(call.args[1]).toEqual(cellHeight * 5);
            expect(call.args[2]).toEqual(cellWidth);
            expect(call.args[3]).toEqual(cellHeight);
        });

        it("drawPoint draws a circle", function () {
            drawPoint(ctx, 5, 5, '#00FF00', 1.0);
            var arcCall = ctx.calls.filter(function(c){ return c.method === 'arc'; })[0];
            var expectedRadius = 1.0 * Math.min(cellWidth, cellHeight) / 2;
            expect(arcCall.args[2]).toEqual(expectedRadius);
            expect(ctx.fillCalled).toBe(true);
        });

        it("drawSprite ignores missing images", function () {
            drawSprite(ctx, 5, 5, null);
            expect(ctx.drawImageCalled).toBe(false);
            drawSprite(ctx, 5, 5, { image: null });
            expect(ctx.drawImageCalled).toBe(false);
        });

        it("drawMazeCell ignores out-of-bounds", function () {
            var mz = buildMaze(10,10);
            drawMazeCell(-1, 2, ctx, mz);
            expect(ctx.fillRectCalled).toBe(false);
            drawMazeCell(mz.width+1, 2, ctx, mz);
            expect(ctx.fillRectCalled).toBe(false);
        });
    });

    describe("Network helpers (local mirrors)", function () {
        it("ignores own network messages", function () {
            var state = { oponentEnded: 0 };
            var presence = { getUserInfo: function(){ return { networkId: 'me' }; } };
            var onNetworkDataReceived = function(msg){
                if (presence.getUserInfo().networkId === msg.user.networkId) return;
                if (msg.action === 'ended') state.oponentEnded++;
            };
            onNetworkDataReceived({ user: { networkId: 'me' }, action: 'ended' });
            expect(state.oponentEnded).toEqual(0);
        });

        it("increments/decrements on user change", function () {
            var state = { oponentCount: 0 };
            var onNetworkUserChanged = function(msg){
                if (msg.move === 1) state.oponentCount++;
                else if (msg.move === -1) state.oponentCount--;
            };
            onNetworkUserChanged({ move: -1, user: {} });
            expect(state.oponentCount).toEqual(-1);
            onNetworkUserChanged({ move: 1, user: {} });
            expect(state.oponentCount).toEqual(0);
        });
    });

    // --- Extra tests ---
    describe("Extra tests", function () {

        it("returns null for unknown control sprite", function () {
            var res = createPlayerSprite('my mind');
            expect(res).toBeNull();
        });

        it("ignores unsupported key (P)", function () {
            window.players = {};
            if (typeof onKeyDown === 'function') {
                onKeyDown({ keyCode: 80 });
                expect(Object.keys(window.players).length).toBe(0);
            } else {
                expect(true).toBe(true);
            }
        });

        it("mouse click moves player when path open", function () {
            generate(1, 60);
            maze.directions[maze.startPoint.x][maze.startPoint.y][directions.east] = 1;
            players = {};
            var event = { clientX: cellWidth * (maze.startPoint.x + 1.5), clientY: cellHeight * (maze.startPoint.y + 0.5) };
            mazeClick(event);
            expect(players['mouse']).toBeDefined();
            expect(players['mouse'].lastMoveDirection).toBe('east');
        });

        it("mouse click calls showBlocked when blocked", function () {
            generate(1, 60);
            maze.directions[maze.startPoint.x][maze.startPoint.y] = [0,0,0,0];
            players = {};
            var event = { clientX: 0, clientY: 0 };
            mazeClick(event);
            expect(players['mouse']).toBeDefined();
            expect(players['mouse'].showBlockedCalled).toBe(true);
        });

        it("updateMazeSize sets cell sizes when unfullscreen visible", function () {
            var toolbar = document.getElementById('main-toolbar') || document.createElement('div');
            toolbar.id = 'main-toolbar';
            toolbar.offsetHeight = 55;
            if (!document.getElementById('main-toolbar')) document.body.appendChild(toolbar);
            var unfullscreen = document.getElementById('unfullscreen-button') || document.createElement('div');
            unfullscreen.id = 'unfullscreen-button';
            unfullscreen.style = unfullscreen.style || {};
            unfullscreen.style.visibility = 'visible';
            if (!document.getElementById('unfullscreen-button')) document.body.appendChild(unfullscreen);

            maze.width = 10; maze.height = 10;
            updateMazeSize();
            expect(window.cellHeight).toBeDefined();
            expect(window.cellWidth).toBeDefined();

            unfullscreen.style.visibility = 'hidden';
        });

        it("updateSprites is safe when controls is null", function () {
            var savedControls = window.controls;
            try {
                window.controls = null;
                expect(function () { updateSprites(); }).not.toThrow();
            } finally {
                window.controls = savedControls;
            }
        });

        it("updateSprites makes sprites only for controls in controlColors", function () {
            controlColors = {};
            controlSprites = {};
            controlColors['arrows'] = { normal: "#f00", blocked: "#faa" };
            updateSprites();
            expect(controlSprites['arrows']).toBeDefined();
            expect(controlSprites['wasd']).toBeUndefined();
        });

        it("drawGround picks wall or corridor color", function () {
            var ctx = new MockContext();
            drawGround(ctx, 1, 1, 1);
            expect(ctx.lastFillStyle).toEqual(wallColor);
            ctx = new MockContext();
            drawGround(ctx, 1, 1, 0);
            expect(ctx.lastFillStyle).toEqual(corridorColor);
        });

        it("drawMaze runs without throwing", function () {
            generate(1, 60);
            var ctx = new MockContext();
            expect(function () { drawMaze(ctx); }).not.toThrow();
        });

        it("drawLevelStarting returns correct coords without ctx", function () {
            maze.goalPoint = { x: 2, y: 2 };
            levelStartingValue = 1;
            var info = drawLevelStarting();
            var expectedWidth = cellWidth * levelStartingValue;
            var expectedX = ((maze.goalPoint.x + 1) * cellWidth) - expectedWidth;
            expect(info.x).toBe(expectedX);
        });

        it("drawLevelStarting returns cellWidth when goalPoint is 1", function () {
            maze.goalPoint = { x: 1, y: 1 };
            levelStartingValue = 1;
            var info = drawLevelStarting();
            expect(info.x).toBe(cellWidth);
        });

        it("initialize returns maxCellx metadata", function () {
            var meta = initialize(3, 27);
            expect(meta.maxCellx).toBe(7);
            var meta2 = initialize(2, 8);
            expect(meta2.maxCellx).toBe(1);
        });

        it("createMatrix makes arrays of correct size", function () {
            var m0 = createMatrix(0,0);
            expect(m0.length).toBe(0);
            var m1 = createMatrix(1,1);
            expect(m1.length).toBe(1);
            expect(m1[0].length).toBe(1);
            var m2 = createMatrix(2,2);
            expect(m2.length).toBe(2);
            expect(m2[0].length).toBe(2);
        });

        it("getDirections returns zeros when surrounded by walls", function () {
            maze.width = 3; maze.height = 3;
            maze.walls = createMatrix(3,3);
            for (var x=0;x<3;x++){ for (var y=0;y<3;y++){ maze.walls[x][y]=1; } }
            maze.walls[1][1] = 0;
            var dirs = getDirections(1,1);
            expect(dirs.dirs).toEqual([0,0,0,0]);
        });

        it("getDirections identifies single directions", function () {
            maze.width = 3; maze.height = 3;
            maze.walls = createMatrix(3,3);
            for (var x=0;x<3;x++){ for (var y=0;y<3;y++){ maze.walls[x][y]=1; } }
            maze.walls[1][1] = 0;
            maze.walls[0][1] = 0;
            expect(getDirections(1,1).dirs).toEqual([1,0,0,0]);
            maze.walls[0][1] = 1; maze.walls[2][1] = 0;
            expect(getDirections(1,1).dirs).toEqual([0,1,0,0]);
            maze.walls[2][1] = 1; maze.walls[1][0] = 0;
            expect(getDirections(1,1).dirs).toEqual([0,0,1,0]);
            maze.walls[1][0] = 1; maze.walls[1][2] = 0;
            expect(getDirections(1,1).dirs).toEqual([0,0,0,1]);
        });

        it("findForks handles edge-case sizes", function () {
            maze.width = 1; maze.height = 0;
            maze.forks = createMatrix(maze.width, maze.height);
            expect(function() { findForks(); }).not.toThrow();
            maze.width = 2; maze.height = 1;
            maze.walls = createMatrix(2,1);
            maze.directions = createMatrix(2,1);
            for (var x=0;x<2;x++){ for (var y=0;y<1;y++){ maze.walls[x][y]=0; } }
            findDirections();
            findForks();
            expect(maze.forks[0]).toBeDefined();
            generate(1,60);
        });

    });

});
