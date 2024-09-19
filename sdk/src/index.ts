import { createServer } from "http";
import { readFile } from "fs/promises";
import { createProxyMiddleware } from "http-proxy-middleware";
import { join, extname } from "path";

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const serveFile = async (
  publicFolder: string,
  filePath: string = "/index.html"
) => {
  try {
    const completePath = join(publicFolder, filePath);
    const data = await readFile(completePath);
    const ext = extname(completePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";
    return { data, contentType, status: 200 };
  } catch {
    // If the file is not found, serve index.html for SPA routing
    const data = await readFile(`${publicFolder}/index.html`);
    return { data, contentType: "text/html", status: 200 };
  }
};

function createProxy(url: string | undefined) {
  if (!url) {
    return null;
  }
  const viteProxy = createProxyMiddleware({
    target: url,
    changeOrigin: true,
    ws: true, // Proxy WebSocket connections as well
  });
  return viteProxy;
}

export function createIntervalApp(options: {
  port: number;
  publicFrontendProxyUrl?: string;
}) {
  const publicFolder = join(__dirname, "static"); // Folder where SPA files are located

  console.log(`Serving UI bundle from ${publicFolder}`);

  const uiProxy = createProxy(options.publicFrontendProxyUrl);

  createServer(async (req, res) => {
    if (!uiProxy) {
      const { data, contentType, status } = await serveFile(
        publicFolder,
        req.url
      );
      res.writeHead(status, { "Content-Type": contentType });
      res.end(data);
    } else {
      uiProxy(req, res, (err) => {
        if (err) {
          console.error("Proxy error:", err);
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      });
    }
  }).listen(options.port, () => {
    console.log(`Server running at http://localhost:${options.port}`);
  });
}
