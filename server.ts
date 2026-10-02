import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sportsRouter } from "./server/sports/routes.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
app.use(express.json());

// Serve static public assets (logos, icons)
app.use(express.static(path.join(__dirname, "public")));

// Sports API Root
app.use("/api/sports", sportsRouter);

// Health check endpoint for Railway
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "JMH Sports Live API & Arena",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    features: ["tournaments_world_concacaf", "live_matches_sound_alert", "standings_d3_charts", "clean_player_streams", "api_key_auth"]
  });
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[JMH Sports Arena] Server running on port ${PORT}`);
});
