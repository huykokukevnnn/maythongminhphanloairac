import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dummy API Route for compatibility / diagnostics
app.post("/api/classify", (req, res) => {
  return res.status(200).json({
    bin_type: "vô cơ",
    explanation: "Đã chuyển đổi sang phân loại AI trực tiếp ở phía Client."
  });
});

// Configure Vite middleware in development, serve static in production
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    // Serve built SPA static files in production
    const distPath = path.resolve(process.cwd(), "./dist");
    app.use(express.static(distPath));

    app.get("*", (req, res, next) => {
      // Avoid interfering with API endpoints
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started successfully on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
