import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import rateLimiter from "./middleware/rateLimiter.js";

import transactionsRoute from "./routes/transactionsRoute.js";
import budgetsRoute from "./routes/budgetsRoute.js";
import settingsRoute from "./routes/settingsRoute.js";
import reportsRoute from "./routes/reportsRoute.js";
import recurringRoute from "./routes/recurringRoute.js";
import profileRoute from "./routes/profileRoute.js";
import job from "./config/cron.js";

dotenv.config();

const app = express();

if (process.env.NODE_ENV === "production") job.start();

// middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use((req, _res, next) => {
  console.log(
    `[REQ] ${req.method} ${req.path} from ${req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"} origin=${req.headers.origin || "n/a"}`
  );
  next();
});
app.use(rateLimiter);
app.use(express.json());

// our custom simple middleware
// app.use((req, res, next) => {
//   console.log("Hey we hit a req, the method is", req.method);
//   next();
// });

const PORT = process.env.PORT || 5001;

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/transactions", transactionsRoute);
app.use("/api/budgets", budgetsRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/reports", reportsRoute);
app.use("/api/recurring", recurringRoute);
app.use("/api/profile", profileRoute);

// basic error logger
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("[ERR]", req.method, req.path, err?.message, err?.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log("Server is up and running on PORT:", PORT);
});
