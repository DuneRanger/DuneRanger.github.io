let files = ["Anomaly.jpg","Cloud beast.png","Detailed2.jpg","Fireflies.jpg","Goldenwalk.jpg","Misty forest.jpg","Mushroom Tree.jpg","North pole.jpg","Portal.png","Soaring Roots.jpg"];
let filesTEST = ["Anomaly.jpg","Mushroom Tree.png", "Detailed2.jpg"];
let Canvas, img, failedLoad = false;
let tiles = [];
let selected = [];
let highRes = false;
let shuffled = false;
let toggleBoxes = false;

let locked = document.getElementById("lock").checked;

//Defined these inputs because of later manipulation outside of native functions
//Honestly need to double check if I even need to define them, maybe just a rename would do
let widthSlider = document.getElementById("gridWidth");
let gridWidth = widthSlider.valueAsNumber;

let heightSlider = document.getElementById("gridHeight");
let gridHeight = heightSlider.valueAsNumber;

class imageTile {
    constructor(src, gridX, gridY, tileWidth, tileHeight, imgX, imgY) {
        this.src = src;
        this.width = tileWidth;
        this.height = tileHeight;
        this.gridX = gridX;
        this.gridY = gridY;
        this.imgX = imgX;
        this.imgY = imgY;
        this.origX = this.gridX;
        this.origY = this.gridY;
    }
    imgDraw() {
        if (selected.length) {
            if (selected[0][0] == this.gridY && selected[0][1] == this.gridX) {
                push();
                let x = this.gridX*this.width;
                let y = this.gridY*this.height;
                imageMode(CENTER)
                fill(150)
                stroke(255);
                rect(x+1, y+1, x + this.width-1, y + this.height-1);
                x = max(min(mouseX, Canvas.width), 0)
                y = max(min(mouseY, Canvas.height), 0)
                image(this.src, x, y, this.width, this.height, this.imgX, this.imgY, this.width, this.height)
                pop();
                return
            }
        }
        imageMode(CORNERS)
        let x = this.gridX*this.width;
        let y = this.gridY*this.height;
        image(this.src, x, y, x + this.width, y + this.height, this.imgX, this.imgY, this.width, this.height);
        //tried to make dynamic box colour
        // img.loadPixels();
        // console.log(img.pixels[4*(this.imgX + this.imgY*img.width)])
        // stroke(255 - img.pixels[4*(this.imgX + this.imgY*img.width)])
        // stroke(150)
        if (toggleBoxes) rect(x, y, x + this.width, y + this.height);
    }
}

function setup() {
    Canvas = createCanvas(innerWidth*0.8, innerHeight*0.8);
    Canvas.parent("canvas");
    img = loadImage(getRandomImage(files));
    resizeImgCanvas(img);
    imageMode(CORNERS);
    noFill();
    strokeWeight(0.1)
    rectMode(CORNERS);
    textSize(32);
    textAlign(CENTER);
    noLoop();
}

function draw() {
    document.getElementById("puzzleSize").innerHTML = "Puzzle width: " + gridWidth + "\t|\t|\tPuzzle height: " + gridHeight;
    background(150)
    if (failedLoad) {
        push();
        fill(0);
        resizeImgCanvas({"width": 300, "height": 300});
        text("Failed to load image", Canvas.width/2, Canvas.height/2);
        pop();
    }
    else {
        tiles.forEach(v => v.forEach(i => i.imgDraw()))
        // console.log(tiles[0])
        // tiles.forEach(v => v.forEach(t => console.log((t.imgX))))
    }
    if (shuffled) {
        if (tiles.every(v => v.every(i => i.origX == i.gridX && i.origY == i.gridY))) {
            victoryScreen();
        }
    } 
}

function getRandomImage(src) { 
    let randomInd = Math.ceil(Math.random()*src.length-1);
    return "./images/" + src[randomInd];
}

function resizeImgCanvas() {
    if (img.height+img.width > 5000) {
        highRes = true;
    }
    else highRes = false;
    let heightIncrease = max(1, img.height/img.width)
    img.height *= 1.5;
    img.width *= 1.5;
    while(img.height > heightIncrease*innerHeight*0.77 || img.width > innerWidth*0.9) {
        img.width *= 0.95;
        img.height *= 0.95;
    }
    resizeCanvas(img.width, img.height);
}

function prepareImage() {
    selected = [];
    img = loadImage(getRandomImage(files), () => {
        //resizeImgCanvas ends up doing redraw(), but the tiles aren't created yet, so it doesn't display the image
        //But for some reason, having createTiles() and redraw() happen in newPuzzle.onclick doesnt' work... :/
        resizeImgCanvas();
        createTiles();
        redraw();
        failedLoad = false;
    }, () => {
        failedLoad = true;
    });
}

function victoryScreen() {
    push();
    textSize(img.width/12);
    fill("brown");
    text("Congrats! You did it!", Canvas.width/2, Canvas.height/2);
    pop();
}

function swapTiles(tile1, tile2) {
    tiles[tile1.gridY][tile1.gridX] = tile2;
    tiles[tile2.gridY][tile2.gridX] = tile1;

    //Made to not let temp be a reference to tile1 or something else that made it not work
    let temp = [tile1.gridX, tile1.gridY];
    tile1.gridX = tile2.gridX;
    tile1.gridY = tile2.gridY;
    tile2.gridX = temp[0];
    tile2.gridY = temp[1];
}

function createTiles() {
    tiles = [];
    shuffled = false;
    solved = false;
    //Divided into rows, purely for easier array reading
    let tempRow = [];
    let tileWidth = img.width/gridWidth
    let tileHeight = img.height/gridHeight

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            tempRow.push(new imageTile(img, x, y, tileWidth, tileHeight, x*tileWidth, y*tileHeight))
        }
        tiles.push(tempRow)
        tempRow = []
    }
}

showBoxes.onclick = function() {
    toggleBoxes = !toggleBoxes;
    redraw();
}

shiftUp.onclick = function() {
    for (let i = 1; i < tiles.length; i++) {
        tiles[i].forEach((v, ind) => swapTiles(v, tiles[i-1][ind]))
    }
    redraw();
}

shiftDown.onclick = function() {
    for (let i = tiles.length-1; i > 0; i--) {
        tiles[i].forEach((v, ind) => swapTiles(v, tiles[i-1][ind]))
    }
    redraw();
}

shiftLeft.onclick = function() {
    for (let i = 1; i < tiles.length; i++) {
        tiles.forEach((v, ind) => swapTiles(v[i], tiles[ind][i-1]))
    }
    redraw();
}

shiftRight.onclick = function() {
    for (let i = tiles.length-1; i > 0; i--) {
        tiles.forEach((v, ind) => swapTiles(v[i], tiles[ind][i-1]))
    }
    redraw();
}

newPuzzle.onclick = function() {
    prepareImage();
}

puzzleShuffle.onclick = function() {
    for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < tiles[y].length; x++) {
            let i = Math.floor(Math.random() * tiles[y].length);
            let j = Math.floor(Math.random() * tiles.length)
            swapTiles(tiles[y][x], tiles[j][i])
        }
    }
    shuffled = true;
    redraw();
}

lock.onclick = function() {
    locked = this.checked;
    gridHeight = gridWidth;
    heightSlider.value = widthSlider.value;
    createTiles();
    redraw();
}

disable.onclick = function() {
    let x = this.checked //A bool value
	widthSlider.disabled = x;
	heightSlider.disabled = x;
	newPuzzle.disabled = x;
	puzzleShuffle.disabled = x;
}

widthSlider.oninput = function() {
    gridWidth = this.valueAsNumber;
    if (locked) {
        heightSlider.value = this.value;
        gridHeight = gridWidth;
    }
    createTiles();
    redraw();
}


heightSlider.oninput = function() {
    gridHeight = this.valueAsNumber;
    if (locked) {
        widthSlider.value = this.value;
        gridWidth = gridHeight;
    }
    createTiles();
    redraw();
}

//Is there really a need for this? Probably no. Does it atleast work and barely increase performance? Hopefully.
//Ok, this geuniunely helps for puzzles with a lot of tiles, just needed to make adjustments, so that it isn't that easy to break
//But high res pictures still break, when each tile has a shit ton of pixels
function redrawProximity(tile) {
    let maximums = [tiles[0].length, tiles.length]
    let bound = [ceil(gridHeight/8), ceil(gridWidth/8)]
    if (highRes) {bound[0] = 1; bound[1] = 1}
    for (let y = max(tile.gridY-bound[0], 0); y < min(tile.gridY+1+bound[0], maximums[1]); y++) {
        for (let x = max(tile.gridX-bound[1], 0); x < min(tile.gridX+1+bound[1], maximums[0]); x++) {
            tiles[y][x].imgDraw();
        }
    }
}

//One version of selecting tiles
function mousePressed() {
    if (mouseX > 0 && mouseX < img.width && mouseY > 0 && mouseY < img.height) {
        //Gets the grid coordinates for mouseX and Y
        let mouseGridX = Math.floor(mouseX/(img.width/gridWidth));
        let mouseGridY = Math.floor(mouseY/(img.height/gridHeight));
        selected.push([mouseGridY, mouseGridX]);
        if (selected.length > 1) {
            let temp = [tiles[selected[0][0]][selected[0][1]], tiles[selected[1][0]][selected[1][1]]]
            swapTiles(temp[0], temp[1]);
            selected = [];
            redraw();
        }
    }
}

function mouseMoved() {
    if (selected.length) {
        let x = max(min(mouseX, Canvas.width)-1, 0)
        let y = max(min(mouseY, Canvas.height)-1, 0)
        let mouseGridX = Math.floor(x/(img.width/gridWidth));
        let mouseGridY = Math.floor(y/(img.height/gridHeight));
        redrawProximity(tiles[mouseGridY][mouseGridX]);
        tiles[selected[0][0]][selected[0][1]].imgDraw();
    }
}


// fileInput.addEventListener("input", (img) => {
    // img = loadImage(img.target.files[0].path, img => {
    //     resizeImgCanvas(img)
    //     failedLoad = false
    // }, () => {
    //     failedLoad = true
    // })
    // console.log(img)
// })
// Custom images put on hold because browser security issues are a valid concern and not worth circumventing