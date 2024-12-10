const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const apiRoutes = require("./apiRouter.js");
const clientsRoutes = require("./routes/clients");
const bookingRoutes = require("./routes/booking");
const authRoutes = require("./routes/auth");
const { connectToDatabase } = require("./db.js");

const app = express();

// Применение CORS middleware ко всем маршрутам
app.use(cors());
app.use(bodyParser.json());
// Подключение маршрутов
app.use("/api", apiRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);

// Подключение к MongoDB
connectToDatabase();

main();
