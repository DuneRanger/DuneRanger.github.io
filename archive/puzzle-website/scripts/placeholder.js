//Man, is there really not a better solution than this for local machines?
//I know I can improve this if I put it on a server, but at that point, I might as well put the images on the server as well, no? 
//And that would make this redundant...


const fs = require("fs")
let files = fs.readdirSync("./images")
console.log(JSON.stringify(files))