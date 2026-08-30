import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, cpSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const distDir = resolve(root, "dist");
const serverDir = resolve(distDir, "server");
const publicDir = resolve(root, "public");

mkdirSync(serverDir, { recursive: true });
writeFileSync(resolve(distDir, "index.html"), html, "utf8");

const assets = {};
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else {
      const route = "/public/" + relative(publicDir, path).split(sep).join("/");
      const suffix = extname(path).toLowerCase();
      assets[route] = {
        content_type: suffix === ".png" ? "image/png" : suffix === ".svg" ? "image/svg+xml" : "application/octet-stream",
        base64: readFileSync(path).toString("base64")
      };
    }
  }
}

try {
  cpSync(publicDir, resolve(distDir, "public"), { recursive: true });
  walk(publicDir);
} catch {}

const worker = `const html = ${JSON.stringify(html)};
const assets = ${JSON.stringify(assets)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

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

    const asset = assets[url.pathname];
    if (asset) {
      return new Response(decodeBase64(asset.base64), {
        headers: {
          "content-type": asset.content_type,
          "cache-control": "public, max-age=31536000, immutable"
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
`;

writeFileSync(resolve(serverDir, "index.js"), worker, "utf8");
