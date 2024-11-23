const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const apiRoutes = require("./apiRouter.js");
const clientsRoutes = require("./routes/clients");
const bookingRoutes = require("./routes/booking");
const authRoutes = require("./routes/auth");

const app = express();

// Применение CORS middleware ко всем маршрутам
app.use(cors());
app.use((req, res, next) => {
	// Если CORS не включается автоматически, можно добавить эти заголовки вручную
	res.header("Access-Control-Allow-Origin", "*"); // или укажите ваш домен
	res.header(
		"Access-Control-Allow-Methods",
		"GET, POST, OPTIONS, PUT, DELETE"
	); // Разрешаем методы
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Разрешаем заголовки

	// Обработка OPTIONS запроса
	if (req.method === "OPTIONS") {
		return res.sendStatus(200);
	}

	next();
});

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
