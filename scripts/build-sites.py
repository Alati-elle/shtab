import base64
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text(encoding="utf-8")

dist_dir = root / "dist"
server_dir = dist_dir / "server"
server_dir.mkdir(parents=True, exist_ok=True)

(dist_dir / "index.html").write_text(html, encoding="utf-8")
if (root / "public").exists():
    shutil.copytree(root / "public", dist_dir / "public", dirs_exist_ok=True)

asset_routes = {}
public_dir = root / "public"
if public_dir.exists():
    for path in public_dir.rglob("*"):
        if path.is_file():
            route = "/public/" + path.relative_to(public_dir).as_posix()
            suffix = path.suffix.lower()
            content_type = "image/png" if suffix == ".png" else "image/svg+xml" if suffix == ".svg" else "application/octet-stream"
            asset_routes[route] = {"content_type": content_type, "base64": base64.b64encode(path.read_bytes()).decode("ascii")}

worker = f"""const html = {json.dumps(html, ensure_ascii=False)};
const assets = {json.dumps(asset_routes, ensure_ascii=False)};

function decodeBase64(value) {{
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}}

export default {{
  async fetch(request) {{
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {{
      return new Response(html, {{
        headers: {{
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300"
        }}
      }});
    }}

    const asset = assets[url.pathname];
    if (asset) {{
      return new Response(decodeBase64(asset.base64), {{
        headers: {{
          "content-type": asset.content_type,
          "cache-control": "public, max-age=31536000, immutable"
        }}
      }});
    }}

    return new Response("Not found", {{ status: 404 }});
  }}
}};
"""

(server_dir / "index.js").write_text(worker, encoding="utf-8")
