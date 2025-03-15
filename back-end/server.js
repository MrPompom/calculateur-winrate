import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import gameRoutes from "./routes/gameRoutes.js";
import playerRoutes from "./routes/playerRoutes.js";

dotenv.config();
const app = express();

app.use(cors({
  origin: "*", // 🔥 Change si besoin
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connexion MongoDB réussie"))
  .catch(err => console.error("❌ Erreur MongoDB:", err));

app.use("/games", gameRoutes);
app.use("/players", playerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
