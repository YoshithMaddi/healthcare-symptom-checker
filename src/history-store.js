import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const historyFile = path.join(dataDir, "history.ndjson");

export async function appendHistory(entry) {
  await mkdir(dataDir, { recursive: true });
  await appendFile(historyFile, `${JSON.stringify(entry)}\n`, "utf8");
}
