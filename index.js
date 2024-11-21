const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const apiRoutes = require("./apiRouter.js");
const clientsRoutes = require("./routes/clients");
const bookingRoutes = require("./routes/booking");
const authRoutes = require("./routes/auth");

const app = express();

const corsOptions = {
	origin: "*", // Укажите ваш домен или '*' для разрешения с любых источников
	methods: ["GET", "POST", "PUT", "DELETE"], // Укажите методы, для которых разрешен доступ
	allowedHeaders: "*", // Укажите разрешенные заголовки
};

// Применение CORS middleware ко всем маршрутам
app.use(cors(corsOptions));
app.use(bodyParser.json()); // Для парсинга JSON

// Подключение маршрутов
app.use("/api", apiRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);

// Подключение к MongoDB
async function main() {
	try {
		await mongoose.connect(
			"mongodb+srv://firdavsusmanov418:gPPbpsmhIDE5sf9b@cluster0.owmnn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
		);
		console.log("Connected successfully to MongoDB");

		app.listen(80, () => {
			console.log("Server is running on port 80");
		});
	} catch (err) {
		console.error("Error connecting to MongoDB", err);
	}
}

main();
