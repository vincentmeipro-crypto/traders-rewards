// Serves the exported React Native web preview for local review only.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]) || 4173;
const host = args.includes("--host")
  ? args[args.indexOf("--host") + 1]
  : "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      let stat = await fs.stat(file).catch(() => null);
      if (!stat || !stat.isFile()) file = path.join(root, "index.html");
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, host, () => console.log("Mobile preview ready"));
