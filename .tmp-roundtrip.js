const fs = require("fs")
const YAML = require("C:/Users/sikar/AppData/Local/Temp/yaml-parse-test/node_modules/yaml")

const src = fs.readFileSync("docker-compose.prod.yml", "utf8")
const out = YAML.stringify(YAML.parse(src), { lineWidth: 1000 })
const again = YAML.parse(out)
const test = again.services.api.healthcheck.test
console.log("ROUNDTRIP:", JSON.stringify(test))
const s = test[1]
console.log("VALUE:", s)
console.log("includes two dollars", s.includes("$$"))
console.log("includes dollar brace", s.includes("${"))
