import { readFile } from "fs/promises";
import { IncomingMessage, ServerResponse } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { extname, join } from "path";

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

export function makeUIServer(opts: {
  publicFolderPath: string;
  publicFrontendProxyUrl?: string;
}) {
  const proxy = createProxy(opts.publicFrontendProxyUrl);
  if (proxy) {
    console.log(`Serving UI by proxy to ${opts.publicFrontendProxyUrl}`);
  } else {
    console.log(`Serving UI from ${opts.publicFolderPath}`);
  }

  return async function serveUI(req: IncomingMessage, res: ServerResponse) {
    if (!proxy) {
      const { data, contentType, status } = await serveFile(
        opts.publicFolderPath,
        req.url
      );
      res.writeHead(status, { "Content-Type": contentType });
      res.end(data);
    } else {
      proxy(req, res, (err) => {
        if (err) {
          console.error("Proxy error:", err);
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      });
    }
  };
}
