const express = require("express");
const router = express.Router();
const Client = require("../models/client"); // Модель клиента
const Photographer = require("../models/Photographer"); // Модель фотографа
const axios = require("axios");
const { setUserState } = require("../utils/stateManager");
const multer = require("multer");
const path = require("path");
const bodyParser = require("body-parser");

// Настройка multer для сохранения файлов в зависимости от типа запроса
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		// Разделяем по папкам в зависимости от типа файла, который передаётся
		console.log("siska", file);
		if (req.body.type === "profile") {
			cb(null, "uploads/photographers"); // Путь для фото профиля
		} else {
			cb(null, "uploads/portfolio"); // Путь для фото портфолио
		}
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname)); // Генерация уникального имени файла
	},
});

// Создаем multer instance
const upload = multer({ storage: storage });

// URL для отправки сообщений в Telegram
const botToken = "7456265736:AAH8zdizZ8nvXo2N8kTHmOWIO9yn-1TYYU8"; // Укажите ваш токен бота
const apiUrl = `https://api.telegram.org/bot${botToken}`;

// Функция для отправки интерфейса фотографа
const sendPhotographerInterface = async (chatId) => {
	const url = `${apiUrl}/sendMessage`;

	const photographerKeyboard = {
		keyboard: [
			[{ text: "📸 Добавить портфолио" }],
			[{ text: "📅 Просмотреть бронирования" }],
			[{ text: "⚙️ Настройки личной информации" }],
			[{ text: "🕒 Выбрать временные промежутки" }],
			[{ text: "💳 Управление реквизитами" }], // Новая кнопка
			[{ text: "🎟 Получить ссылку для приглашения" }], // Новая кнопка
		],
		resize_keyboard: true,
		one_time_keyboard: false,
	};

	try {
		await axios.post(url, {
			chat_id: chatId,
			text: "Добро пожаловать в личный кабинет фотографа! Выберите нужную опцию:",
			reply_markup: {
				keyboard: photographerKeyboard.keyboard,
				resize_keyboard: photographerKeyboard.resize_keyboard,
				one_time_keyboard: photographerKeyboard.one_time_keyboard,
			},
		});

		setUserState(chatId, "photographer");
	} catch (error) {
		console.error(
			"Ошибка при отправке интерфейса:",
			error.response ? error.response.data : error.message
		);
	}
};

// Получить всех клиентов
router.get("/", async (req, res) => {
	try {
		const clients = await Client.find();
		res.json(clients);
	} catch (error) {
		res.status(500).json({ message: "Server error", error });
	}
});

//Получение по айди телеграмма
router.get("/telegram/:telegramId", async (req, res) => {
	try {
		const client = await Client.findOne({
			telegramId: req.params.telegramId,
		});
		if (!client) {
			return res.status(404).json({ message: "Client not found" });
		}
		res.json(client);
	} catch (error) {
		res.status(500).json({ message: "Server error", error });
	}
});

// Получить клиента по ID
router.get("/:id", async (req, res) => {
	try {
		const client = await Client.findById(req.params.id);
		if (!client) {
			return res.status(404).json({ message: "Client not found" });
		}
		res.json(client);
	} catch (error) {
		res.status(500).json({ message: "Server error", error });
	}
});

// Маршрут для промоушена клиента в фотографа и загрузки профильного фото
// Основной обработчик POST-запроса для промоушена клиента
router.post("/:id/promote", upload.any(), async (req, res) => {
	res.json("GOOD");
});

module.exports = router;
