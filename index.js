const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const apiRoutes = require("./apiRouter.js");
const clientsRoutes = require("./routes/clients");
const bookingRoutes = require("./routes/booking");
const authRoutes = require("./routes/auth");
const fs = require("fs");
const path = require("path");

const app = express();

// Применение CORS middleware ко всем маршрутам
app.use(cors());
// Подключение маршрутов
app.use("/api", apiRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);

// Подключение к MongoDB

const rootDir = path.resolve(__dirname, "uploads/portfolio"); // Например, если вы находитесь в папке /src

// Функция для получения файлов из директории
fs.readdir(rootDir, (err, files) => {
	if (err) {
		console.error("Ошибка при чтении директории:", err);
		return;
	}

	console.log("Файлы в корневой директории:", files);
});
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
