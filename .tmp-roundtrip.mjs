import { readFileSync } from "node:fs"
import YAML from "yaml"

const src = readFileSync("/compose.yml", "utf8")
const out = YAML.stringify(YAML.parse(src), { lineWidth: 1000 })
const again = YAML.parse(out)
const test = again.services.api.healthcheck.test
process.stdout.write("ROUNDTRIP " + JSON.stringify(test) + "\n")
process.stdout.write("TWO_DOLLARS " + String(test[1].includes("$$")) + "\n")
process.stdout.write("DOLLAR_BRACE " + String(test[1].includes("${")) + "\n")
process.stdout.write("---FILE---\n")
process.stdout.write(out)
