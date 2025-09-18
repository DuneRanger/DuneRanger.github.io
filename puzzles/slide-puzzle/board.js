"use strict"

let board_tiles = [[]]

let puzzle_board = document.getElementById("puzzle-board");
// in view-width
const board_width = 100*puzzle_board.clientWidth/document.body.clientWidth;
// in view-height
const board_height = 100*puzzle_board.clientHeight/document.body.clientHeight;

let in_animation = false;
let animation_speed = 1;

function in_bounds(row, col) {
	return row >= 0 && col >= 0 && row < board_tiles.length && col < board_tiles[0].length;
}

function is_empty_tile(row, col) {
	return board_tiles[row][col].id == 0;
}

function swap_tile_ids(row1, col1, row2, col2) {
	let temp = board_tiles[row2][col2].id;
	board_tiles[row2][col2].id = board_tiles[row1][col1].id;
	board_tiles[row1][col1].id = temp;
}

class Tile {
	static id = 1;
	// width and height are measured in view-width/view-height
	constructor(row, col, width, height) {
		this.row = row;
		this.col = col;
		this.id = Tile.id;
		Tile.id++;
		this.width = width;
		this.height = height;

		this.createBaseElement();
		this.setStyles()
		this.addMoveEvent();
	}

	createBaseElement() {
		this.el = document.createElement("div");
		this.el.setAttribute("class", "puzzle-tile");
		this.el.textContent = this.id.toString();
	}

	setStyles() {
		this.el.style.gridRow = 1+this.row;
		this.el.style.gridCol = 1+this.col;

		this.el.style.lineHeight = this.el.style.height;
		this.el.style.fontSize = Math.sqrt(this.height*this.width)/4 + "vw";
	}

	addMoveEvent() {
		this.el.onclick = (ev) => {
			if (in_animation) return;
			let moveset = [[0, 1], [0, -1], [1, 0], [-1, 0]];
			for (let [x, y] of moveset) {
				let new_x = this.row + x;
				let new_y = this.col + y;
				if (in_bounds(new_x, new_y) && is_empty_tile(new_x, new_y)) {
					this.succeedMove(new_x, new_y);
					return;
				}
			}
			this.failMove();
		}
	}

	succeedMove(row, col) {
		board_tiles[row][col].id = this.id;
		board_tiles[row][col].el.style.visibility = "visible";
		board_tiles[row][col].el.textContent = this.id.toString();
		this.id = 0;
		this.el.style.visibility = "hidden";
	}

	// TODO: add some sort of shake/struggle animation
	failMove() {
		// in_animation = true;
		let animation_length = 200*animation_speed;
		this.el.style.animation = "pulse " + animation_length + "ms normal";
		this.el.style.zIndex = "1";
		setTimeout(() => {
			this.el.style.animation = "";
			this.el.style.zIndex = "0";
		}, animation_length);
		// setTimeout(() => {in_animation = false;}, animation_length/2);
	}
}

function prepare_board() {
	let board_size = 4;
	let row_count = board_size;
	let col_count = board_size;
	Tile.id = 1;
	for (let i = 0; i < board_tiles.length; i++) {
		for (let j = 0; j < board_tiles[i].length; j++) {
			puzzle_board.removeChild(board_tiles[i][j].el);
		}
	}
	board_tiles = []
	let start_position = row_count*col_count;

	let width = board_width/col_count;
	let height = board_height/row_count;

	for (let i = 0; i < row_count; i++) {
		let row = []
		for (let j = 0; j < col_count; j++) {
			let tile = new Tile(i, j, width, height);
			puzzle_board.appendChild(tile.el);
			row.push(tile);
		}
		board_tiles.push(row);
	}
	let start_row = Math.floor((start_position-1)/row_count);
	let start_col = (start_position-1)%row_count;

	let start_block = board_tiles[start_row][start_col];
	start_block.id = 0;
	start_block.el.style.visibility = "hidden";
}

function find_empty_block() {
	for (let i = 0; i < board_tiles.length; i++) {
		for (let j = 0; j < board_tiles[i].length; j++) {
			if (board_tiles[i][j].id == 0) {
				return [i, j];
			}
		}
	}
}

function update_textContent() {
	for (let i = 0; i < board_tiles.length; i++) {
		for (let j = 0; j < board_tiles[i].length; j++) {
			board_tiles[i][j].el.textContent = board_tiles[i][j].id;
			if (board_tiles[i][j].id == 0) {
				board_tiles[i][j].el.style.visibility = "hidden";
			} else {
				board_tiles[i][j].el.style.visibility = "visible";
			}
		}
	}
}

function shuffle_board() {
	let row, col;
	[row, col] = find_empty_block();
	let moves = 1000;
	let moveset = [[0, 1], [0, -1], [1, 0], [-1, 0]];
	for (let i = 0; i < moves; i++) {
		let move = moveset[Math.floor(Math.random()*moveset.length)];
		let new_x = row + move[0];
		let new_y = col + move[1];
		if (in_bounds(new_x, new_y)) {
			swap_tile_ids(row, col, new_x, new_y);
			row = new_x;
			col = new_y;
		}
	}
	update_textContent();
}

prepare_board();