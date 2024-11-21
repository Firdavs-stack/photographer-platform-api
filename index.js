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

app.use(cors());
app.options("*", cors());

const allowedOrigins = ["https://two2one.uz"];

app.use((req, res, next) => {
	const origin = req.headers.origin;
	if (allowedOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS"
	);
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization"
	);
	next();
});
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
			"mongodb+srv://test-user:eYpp3OsdXrBnsQDc@cluster0.owmnn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
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
