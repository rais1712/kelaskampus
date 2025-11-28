// server/index.ts
// ✅ UPDATED: Added all new routes

import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSignup, handleSignin, handleGoogle, handleMe } from "./routes/auth";

// ✅ Import new routes
import irtRoutes from "./routes/irt";
import recommendationRoutes from "./routes/recommendations";
import preferencesRoutes from "./routes/preferences";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging middleware (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({
      message: ping,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: '1.0.0'
    });
  });

  // Demo route
  app.get("/api/demo", handleDemo);

  // Auth routes
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/signin", handleSignin);
  app.get("/api/auth/google", handleGoogle);
  app.get("/api/auth/me", handleMe);

  // ✅ IRT routes
  app.use("/api", irtRoutes);

  // ✅ Recommendation routes
  app.use("/api", recommendationRoutes);

  // ✅ Preferences routes
  app.use("/api", preferencesRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method
    });
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('❌ Server Error:', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  return app;
}
