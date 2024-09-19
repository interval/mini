import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";

export function createIntervalApp(port: number) {
  const publicFolder = join(__dirname, "static"); // Folder where SPA files are located

  console.log(`Serving web app bundle from ${publicFolder}`);

  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".json": "application/json",
  };

  const serveFile = async (filePath: string) => {
    try {
      const data = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = mimeTypes[ext] || "application/octet-stream";
      return { data, contentType, status: 200 };
    } catch {
      // If the file is not found, serve index.html for SPA routing
      const data = await readFile(`${publicFolder}/index.html`);
      return { data, contentType: "text/html", status: 200 };
    }
  };

  createServer(async (req, res) => {
    const filePath = `${publicFolder}${
      req.url === "/" ? "/index.html" : req.url
    }`;
    const { data, contentType, status } = await serveFile(filePath);

    res.writeHead(status, { "Content-Type": contentType });
    res.end(data);
  }).listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
