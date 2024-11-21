// index.js
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const apiRoutes = require("./apiRouter.js");
const clientsRoutes = require("./routes/clients");
const bookingRoutes = require("./routes/booking");
const authRoutes = require("./routes/auth");
const path = require("path");

const app = express();
// app.use(
// 	cors({
// 		origin: "https://two2one.uz", // Разрешаем только с этого источника
// 		methods: ["GET", "POST", "PUT", "DELETE"], // Разрешаем все методы
// 		allowedHeaders: [
// 			"Content-Type",
// 			"Authorization",
// 			"Accept",
// 			"X-Custom-Header",
// 		], // Указываем заголовки, которые сервер должен разрешить
// 		preflightContinue: false, // Для обработки предварительных запросов (OPTIONS)
// 	})
// );
// app.options("*", cors());
app.use(bodyParser.json()); // Для парсинга JSON

// Обслуживание статических файлов из папки 'client/build'
// app.use(express.static(path.join(__dirname, "client", "build")));

// Обслуживание статических файлов из папки 'uploads'
// app.use("./admin-panel", express.static(path.join(__dirname, "uploads")));

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
// });
// Подключение к MongoDB
// Подключение маршрутов
app.use("/api", apiRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);

async function main() {
	try {
		await mongoose.connect(
			"mongodb+srv://firdavsusmanov418:gPPbpsmhIDE5sf9b@cluster0.owmnn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
		);
		console.log("Connected successfully to MongoDB");

		// Запуск сервера
		app.listen(80, () => {
			console.log("Server is running on port 80");
		});
	} catch (err) {
		console.error("Error connecting to MongoDB", err);
	}
}

main();
