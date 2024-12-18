const express = require("express");
const router = express.Router();
const Client = require("../models/client"); // Модель клиента
const Photographer = require("../models/Photographer"); // Модель фотографа
const axios = require("axios");
const { setUserState } = require("../utils/stateManager");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "../../.."); // Корневая директория сервера

// Настройка multer для сохранения файлов в зависимости от типа запроса
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		// Переносим тип файла в `req.body.type` для правильной обработки
		const uploadPath =
			req.query.type === "profile" // Если `type` передан в query-параметрах
				? `${path.resolve(sourceDir, "two2one.uz/images/profile")}`
				: `${path.resolve(sourceDir, "two2one.uz/images/portfolio")}`;
		photoPath = uploadPath;
		console.log("Выбранный путь:", uploadPath);
		cb(null, uploadPath);
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
	},
});

// Создаем multer instance
const upload = multer({ storage: storage }).fields([
	{ name: "profilePhoto" },
	{ name: "lastName" },
	{ name: "age" },
	{ name: "experience" },
	{ name: "favoriteStyles" },
	{ name: "hourlyRate" },
	{ name: "sessionTypes" },
	{ name: "status" },
	{ name: "type" },
]);

// URL для отправки сообщений в Telegram
const botToken = "7647751844:AAGSToi5DCbuRGAA156G52obCl3FLHBn5j4"; // Укажите ваш токен бота
const apiUrl = `https://api.telegram.org/bot${botToken}`;

// Функция для отправки интерфейса фотографа
const sendPhotographerInterface = async (chatId) => {
	const url = `${apiUrl}/sendMessage`;

	const photographerKeyboard = {
		keyboard: [
			[{ text: "📸 Добавить портфолио" }],
			[{ text: "📅 Бронирования" }, { text: "⚙️ Настройки" }],
			[{ text: "🕒 Выбрать временные промежутки" }],
			[{ text: "💳 Реквизиты" }, { text: "🎟 Ссылка" }],
			[{ text: "🔍 Поиск клиентов" }],
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

router.post("/vip", async (req, res) => {
	try {
		const { clientId, photographerId } = req.body; // Получаем clientId и photographerId из тела запроса

		if (!clientId || !photographerId) {
			return res.status(400).json({
				success: false,
				message: "Client ID and Photographer ID are required.",
			});
		}

		// Ищем клиента по ID
		const client = await Client.findById(clientId);

		if (!client) {
			return res
				.status(404)
				.json({ success: false, message: "Client not found." });
		}

		// Проверяем, есть ли уже фотограф в списке photographers клиента
		const photographerIndex = client.photographers.findIndex(
			(p) => p.photographerId.toString() === photographerId
		);

		if (photographerIndex === -1) {
			// Если фотографа нет, добавляем его с статусом VIP
			client.photographers.push({
				photographerId,
				status: "vip",
			});
		} else {
			// Если фотограф уже есть, обновляем его статус
			client.photographers[photographerIndex].status = "vip";
		}

		await client.save();

		return res.status(200).json({
			success: true,
			message: "Client status updated to VIP for the photographer.",
			client: {
				name: client.name,
				phone: client.phone,
				photographers: client.photographers, // Отправляем список фотографов с их статусами
			},
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Server error",
			error,
		});
	}
});

// Маршрут для промоушена клиента в фотографа и загрузки профильного фото
// Основной обработчик POST-запроса для промоушена клиента
router.post("/:id/promote", upload, async (req, res) => {
	try {
		const clientId = req.params.id;
		const type = req.body.type; // Извлекаем `type` из тела запроса

		const { path: tempPath, filename } = req.files.profilePhoto[0];

		// const optimizedPath = path.resolve(
		// 	tempPath,
		// 	"..",
		// 	`optimized-${filename}`
		// );

		// await sharp(tempPath)
		// 	.resize(800, 800, { fit: "inside" }) // Изменение размера (например, максимум 800x800)
		// 	.toFormat("webp") // Конвертация в WebP
		// 	.toFile(optimizedPath);

		// fs.unlinkSync(tempPath);

		if (!type) {
			return res
				.status(400)
				.json({ message: "Type is required in the request body" });
		}
		console.log(req.type);
		if (type === "profile") {
			// **1. Промоушен клиента в фотографа**
			const client = await Client.findById(clientId);
			if (!client) {
				return res.status(404).json({ message: "Client not found" });
			}
			console.log(client);
			// Формирование данных для нового фотографа
			const newPhotographerData = {
				firstName: client.name,
				lastName: req.body.lastName,
				telegramId: client.telegramId,
				telegramUsername: client.telegramUsername,
				phoneNumber: client.phone,
				age: req.body.age,
				experience: req.body.experience,
				favoriteStyles: req.body.favoriteStyles,
				hourlyRate: req.body.hourlyRate,
				sessionTypes: req.body.sessionTypes,
				status: req.body.status,
				telegramId: client.telegramId,
				portfolio: [],
			};

			// Обработка фото профиля, если он был загружен
			if (req.files.profilePhoto && req.files.profilePhoto.length > 0) {
				const profilePhoto = req.files.profilePhoto[0]; // Берем первый файл из массива

				// Проверяем MIME-тип файла
				if (profilePhoto.mimetype.startsWith("image/")) {
					newPhotographerData.profilePhoto = tempPath; // Сохраняем путь к файлу
				} else {
					console.error("Загруженный файл не является изображением");
				}
			} else {
				console.error("Файл профиля не найден");
			}

			// Создаем нового фотографа и удаляем клиента из базы данных
			const newPhotographer = new Photographer(newPhotographerData);
			await newPhotographer.save();
			await Client.findByIdAndDelete(clientId);

			// Отправляем сообщение с интерфейсом фотографа
			sendPhotographerInterface(newPhotographer.telegramId);
			res.json({
				message: "Client promoted to photographer successfully",
				photographer: newPhotographer,
			});
		} else if (type === "portfolio") {
			// **2. Добавление фото в портфолио существующего фотографа**
			const photographer = await Photographer.findById(clientId); // Ищем фотографа по ID (тут используется `clientId` как ID фотографа)
			if (!photographer) {
				return res
					.status(404)
					.json({ message: "Photographer not found" });
			}

			// Проверяем, есть ли файлы в запросе
			if (req.files) {
				for (const file of req.files) {
					photographer.portfolio.push(file.path); // Добавляем каждый файл в портфолио фотографа
				}
				await photographer.save();
				return res.json({
					message: "Photos successfully added to portfolio",
					portfolio: photographer.portfolio,
				});
			} else {
				return res
					.status(400)
					.json({ message: "No files provided for portfolio" });
			}
		} else {
			// Если неизвестный тип, возвращаем ошибку
			return res.status(400).json({ message: `Unknown type: ${type}` });
		}
	} catch (error) {
		console.error("Error promoting client or adding to portfolio:", error);
		res.status(500).json({ message: "Server error", error });
	}
});

module.exports = router;
