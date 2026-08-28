import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text(encoding="utf-8")

server_dir = root / "dist" / "server"
server_dir.mkdir(parents=True, exist_ok=True)

(root / "dist" / "index.html").write_text(html, encoding="utf-8")

worker = f"""const html = {json.dumps(html, ensure_ascii=False)};

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

    return new Response("Not found", {{ status: 404 }});
  }}
}};
"""

(server_dir / "index.js").write_text(worker, encoding="utf-8")
