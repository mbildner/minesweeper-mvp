document.addEventListener('DOMContentLoaded', function(){
  'use strict';
  var root = document.createElement('div');
  root.id = 'root-element';
  document.body.appendChild(root);
  bootstrapGame(root);
});

function makeModel (ROW_SIZE, COL_SIZE, callback) {
  'use strict';
  var i,
  j,
  grid,
  row,
  box;

  grid = [];
  for(i=0; i<ROW_SIZE; i++) {
    row = [];
    for(j=0; j<COL_SIZE; j++) {
      box = callback ? callback(i, j) : {};
      row.push(box);
    }
    grid.push(row);
  }

  return {
    grid: grid,
    boundingIndices: function (r, c) {
      var maxRowSize = ROW_SIZE - 1;
      var maxColSize = COL_SIZE - 1;

      var maxRow = r === maxRowSize ? maxRowSize - 1 : r + 1;
      var maxCol = c === maxColSize ? maxColSize - 1 : c + 1;

      var minRow = r === 0 ? 0 : r - 1;
      var minCol = c === 0 ? 0 : c - 1;

      return {
        row: {
          min: minRow,
          max: maxRow
        },
        col: {
          min: minCol,
          max: maxCol
        }
      };
    }
  };
}


function bootstrapGame (root, gameModel) {
  'use strict';

  root.removeEventListener(handleClick);

  while (root.children.length) {
    root.removeChild(root.children[0]);
  }

  var GRID_SIZE = 20;
  var TOTAL_MINES = 40;

  var model = makeModel(GRID_SIZE, GRID_SIZE, function(rowIndex, colIndex){
    return {
      row: rowIndex,
      col: colIndex,
      exposed: false,
      bomb: false,
      expose: function(){
        this.exposed = true;
      },
      isExposed: function (){
        return this.exposed;
      },
      isBomb: function (){
        return this.bomb;
      },
      neighbors: function(){
        return getNeighbors(this);
      },
      neighboringBombs: function (){
        return getNeighboringBombs(this);
      },
      isAlone: function(){
        return isAlone(this);
      },
      element: function (){
        var qsString = '[data-row="{row}"][data-col="{col}"]'
        .replace('{row}', this.row)
        .replace('{col}', this.col);

        return document.querySelector(qsString);
      }
    };
  });

  model.grid.forEach(function(row, r){
    var rowDiv = document.createElement('div');
    rowDiv.classList.add('row');
    root.appendChild(rowDiv);

    row.forEach(function (box, b) {
      var boxDiv = document.createElement('div');
      rowDiv.appendChild(boxDiv);
      boxDiv.setAttribute('data-row', r);
      boxDiv.setAttribute('data-col', b);
      boxDiv.classList.add('box');
    });
  });


  function rand (){
    return Math.floor(Math.random() * GRID_SIZE);
  }

  // move to cleaner initializer
  var totalFlags = 10;
  var flagsUsed = 0;

  var totalMines = TOTAL_MINES;
  var flaggedMines = 0;

  var unflaggedMines = totalMines - flaggedMines;

  var bombsToPlace = totalMines;
  var tries = 0;

  // todo improve bomb seeding: favors the top right like crazy
  while (bombsToPlace) {
    tries++;
    if (tries > 1000) { throw new Error('breaking to prevent infinite loop'); }

    var r = rand();
    var c = rand();

    var box = model.grid[r][c];

    if (box.bomb) {
      continue;
    }

    box.bomb = true;
    bombsToPlace--;
  }


  function isAlone (box) {
    return getNeighboringBombs(box) === 0;
  }

  function getNeighbors (box) {
    var indices = model.boundingIndices(box.row, box.col);
    var boxes = [];

    for (var r=indices.row.min; r<=indices.row.max; r++) {
      for (var c=indices.col.min; c<= indices.col.max; c++) {
        if (r !== box.row || c !== box.col) {
          boxes.push(model.grid[r][c]);
        }
      }
    }

    // assert for safety
    if(boxes.some(function(box){
      return !box;
    })) {

      throw new Error('Neighbors would have returned a sparse array, this is a problem');
    }

    return boxes;
  }

  function getNeighboringBombs (box) {
    return getNeighbors(box).filter(function(b){
      return b.isBomb();
    }).length;
  }

  function sweepFromBox (box) {
    if (!box.isAlone()) { return ;}

    box.neighbors().forEach(function(b){
      if (b.isExposed()) { return ;}
      if (!b.isAlone()) { return ;}
      b.expose();
      sweepFromBox(b);
    });
  }


  function renderGrid (grid){
    grid.forEach(function(row){
      row.forEach(function(box){
        var element = box.element();
        element.classList.remove('flagged');

        if (box.flag) {
          element.classList.add('flagged');
        }

        if (box.isExposed()) {
          element.classList.add('exposed');
        }

        if (box.isBomb()) {
          element.classList.add('bomb');
        }

      });
    });
  }

  // TODO clean up event handling

  function handleClick(event) {
    var boxElement = event.target;

    var r = boxElement.getAttribute('data-row');
    var c = boxElement.getAttribute('data-col');

    if (!r || !c) {
      return;
    }

    r = +r;
    c = +c;

    var box = model.grid[r][c];

    if (event.metaKey) {
      box.flag = !box.flag;
      renderGrid(model.grid);
      return;
    }

    box.expose();

    if (box.isBomb()) {
      confirm('you hit a bomb! the game needs some refactoring, for now I\'m going to reload the browser for you');
      window.location = window.location;
      bootstrapGame(root);
      return;
    }

    boxElement.textContent = box.neighboringBombs() ? box.neighboringBombs() : '';
    sweepFromBox(box);

    // only fire once
    event.stopPropagation();
    renderGrid(model.grid);

  }
  root.addEventListener('click', handleClick);
}

