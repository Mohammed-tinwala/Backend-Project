import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Middlewares
app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
))
app.use(express.json({ limit: "16kb" }));   // we limits the json data coming from frontend
app.use(urlencoded({ extended: true, limit: "16kb" }));    // for every type of url encoded.
app.use(express.static("public"));   // to store static public asset
app.use(cookieParser());   // Cookie Parser

// Import Router
import userRouter from './routes/user.routes.js';

// Routes Declaration

app.use("/api/v1/users/", userRouter );   // https://localhost:8000/api/v1/users/register






export default app;