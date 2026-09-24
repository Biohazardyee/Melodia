import createError from "http-errors";
import express, { Request, Response, NextFunction, Express } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";

// DB Endpoints
import userRouter from "./routes/db/users.js";
import playlistRouter from "./routes/db/playlists.js";
import mediaRouter from "./routes/db/medias.js";
import reviewRouter from "./routes/db/reviews.js";
import banUserRouter from "./routes/db/ban.users.js";
import reportRouter from "./routes/db/reports.js";
import playlistItemRouter from "./routes/db/playlists.items.js";
import notificationRouter from "./routes/db/notifications.js";
import activitiesRouter from "./routes/db/activities.js";
import followRouter from "./routes/db/follows.js";
import messageRouter from "./routes/db/messages.js";
import conversationRouter from "./routes/db/conversations.js";
import reviewCommentRouter from "./routes/db/reviews.comment.js";
import badgeRouter from "./routes/db/badges.js";
import roomRouter from "./routes/db/rooms.js";
import journalRouter from "./routes/db/journal.js";

// API Endpoints
import albumsRouter from "./routes/api/albums.js";
import artistsRouter from "./routes/api/artists.js";
import searchRouter from "./routes/api/search.js";
import tagRouter from "./routes/api/tags.js";
import trackRouter from "./routes/api/tracks.js";
import spotifyRouter from "./routes/api/spotify.js";

import oauthRouter from "./routes/oauth/oauth.js";

import { ApiError, InternalError } from "./utils/errors.js";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);

const app: Express = express();

// Augmente la limite pour le JSON (Base64 passe par ici)
app.use(express.json({ limit: "10mb" }));

// Augmente la limite pour le URL encoded (si tu l'utilises)
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const allowedOrigins = [
  "http://localhost:5173",
  "https://melodia.cloud",
  "https://www.melodia.cloud",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Bloqué par CORS - Origine non autorisée"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

// front-end routes

// back-end routes
app.use("/messages", messageRouter);
app.use("/conversations", conversationRouter);
app.use("/follows", followRouter);
app.use("/activities", activitiesRouter);
app.use("/notifications", notificationRouter);
app.use("/playlist-items", playlistItemRouter);
app.use("/reports", reportRouter);
app.use("/bans", banUserRouter);
app.use("/medias", mediaRouter);
app.use("/playlists", playlistRouter);
app.use("/users", userRouter);
app.use("/reviews", reviewRouter);
app.use("/review-comments", reviewCommentRouter);
app.use("/badges", badgeRouter);
app.use("/rooms", roomRouter);
app.use("/journal", journalRouter);

// API routes
app.use("/api/tracks", trackRouter);
app.use("/api/tags", tagRouter);
app.use("/api/artists", artistsRouter);
app.use("/api/albums", albumsRouter);
app.use("/api/search", searchRouter);
app.use("/api/spotify", spotifyRouter);

app.use("/api/oauth", oauthRouter);

// catch 404 and forward to error handler

app.use(function (req, res, next: NextFunction): void {
  next(createError(404));
});

// Export app without auto-connecting to database
// Database connection is handled by bin/www.ts for the server
// and by test files for testing

// Centralized error handler
app.use(function (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let status: number = 500;
  let message: string = "Internal Server Error";

  // Handle custom API errors
  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
  }
  // Handle JSON parsing errors
  else if (err instanceof SyntaxError && "body" in err) {
    status = 400;
    message = "Invalid JSON payload";
  }
  // Handle 404 errors from createError
  else if (err.status === 404) {
    status = 404;
    message = err.message || "Not Found";
  }
  // Handle other errors
  else if (err.message) {
    message = err.message;
  }

  // Log error to console for debugging (skip in test environment to keep output clean)
  if (process.env.NODE_ENV !== "test") {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`❌ Error ${status}: ${req.path.startsWith("/journal") ? "Journal request failed" : message}`);
    console.error(`📍 ${req.method} ${req.path.startsWith("/journal") ? req.path : req.originalUrl}`);
    if (!req.path.startsWith("/journal") && req.body && Object.keys(req.body).length > 0) {
      console.error("📦 Request Body:", JSON.stringify(req.body, null, 2));
    }
    console.error("🔍 Stack Trace:");
    if (!req.path.startsWith("/journal")) console.error(err.stack || "No stack trace available");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // Build response object
  const errorResponse: any = {
    error: status,
    message: req.path.startsWith("/journal") && status >= 500 ? "Unable to process journal request" : message,
  };

  // In development mode, include stack trace in response
  const isDevelopment: boolean =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV !== "production";
  if (isDevelopment && err.stack && !req.path.startsWith("/journal")) {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      method: req.method,
      path: req.originalUrl,
      body: req.path.startsWith("/journal") ? undefined : req.body,
    };
  }

  res.status(status).json(errorResponse);
});

export default app;
