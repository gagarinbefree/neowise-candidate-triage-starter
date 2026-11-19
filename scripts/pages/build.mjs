import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Usage: node scripts/pages/build.mjs SOURCE OUTPUT");

const html = await readFile(resolve(source, "index.html"), "utf8");
const moduleTag = '<script type="module">';
if (!html.includes(moduleTag)) throw new Error("Expected a module script in index.html");

// Only the published page uses the in-browser transport. The local page calls the HTTP API.
const bootstrap = `<script type="importmap">
    {"imports":{"node:timers/promises":"./browser-timers.mjs"}}
  </script>
  <script type="module">
    import { fetchTriage as fetch } from "./pages-api.mjs";`;

await mkdir(output, { recursive: true });
await writeFile(resolve(output, "index.html"), html.replace(moduleTag, bootstrap));
await copyFile(resolve(source, "mock-ai.mjs"), resolve(output, "mock-ai.mjs"));
for (const file of ["browser-timers.mjs", "pages-api.mjs"]) {
  await copyFile(new URL(file, import.meta.url), resolve(output, file));
}
