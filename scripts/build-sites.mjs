import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const serverDir = resolve(root, "dist", "server");

mkdirSync(serverDir, { recursive: true });
writeFileSync(resolve(root, "dist", "index.html"), html, "utf8");

const worker = `const html = ${JSON.stringify(html)};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300"
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
`;

writeFileSync(resolve(serverDir, "index.js"), worker, "utf8");
