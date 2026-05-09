const fs = require("fs");
const path = require("path");

const katexDir = path.join(process.cwd(), "node_modules", "katex");
console.log("katexDir exists?", fs.existsSync(katexDir));
console.log("css exists?", fs.existsSync(path.join(katexDir, "dist", "katex.min.css")));
