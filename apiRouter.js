// api.js

const express = require("express");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const Photographer = require("./models/Photographer");
const User = require("./models/user"); // Убедитесь, что у вас есть модель User
const authMiddleware = require("./middleware/authMiddleware"); // Импортируйте ваш middleware
const Client = require("./models/client");

// const app = express();
// // Обслуживание статических файлов из папки 'client/build'
// app.use(express.static(path.join(__dirname, 'client', 'build')));

// // Обслуживание статических файлов из папки 'uploads'
// app.use('./admin-panel', express.static(path.join(__dirname, 'uploads')));

// // Обработка всех остальных маршрутов и отправка index.html
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
// });

const sourceDir = path.resolve(__dirname, "../../..");

const router = express.Router();
// Настройка хранилища для multer
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		// Переносим тип файла в `req.body.type` для правильной обработки
		const uploadPath =
			req.query.type === "profile" // Если `type` передан в query-параметрах
				? `${path.resolve(sourceDir, "two2one.uz/images/profile")}`
				: `${path.resolve(sourceDir, "two2one.uz/images/portfolio")}`;
		photoPath = uploadPath;
		cb(null, uploadPath);
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
	},
});

const upload = multer({ storage: storage });

// Примените authMiddleware для защищенных маршрутов
// router.use('/photographers', authMiddleware); // Применяем middleware ко всем маршрутам, начинающимся с '/photographers'

router.get("/photographers", async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const level = req.query.level;
	const search = req.query.search;
	const age = req.query.age;
	const styles = req.query.styles;
	const experience = req.query.experience;
	const referringPhotographerId = req.query.clientTelegramId;

	const client = await Client.findOne({
		telegramId: referringPhotographerId,
	});
	try {
		const filter = {};

		if (level) {
			filter.status = level;
		}

		if (search) {
			filter.firstName = { $regex: search, $options: "i" };
		}

		if (age) {
			filter.age = { $gte: parseInt(age) };
		}

		if (styles) {
			filter.favoriteStyles = { $in: styles.split(",") };
		}

		if (experience) {
			filter.experience = { $gte: parseInt(experience) };
		}

		if (referringPhotographerId) {
			filter._id = client.referringPhotographerId;
		}
		const photographers = await Photographer.find(filter)
			.skip((page - 1) * limit)
			.limit(limit);

		const total = await Photographer.countDocuments(filter);
		const pages = Math.ceil(total / limit);

		res.json({
			photographers,
			page,
			pages,
			total,
		});
	} catch (err) {
		res.status(500).json({ message: "Ошибка сервера" });
	}
});

router.delete("photographers/past-dates/:id", async (req, res) => {
	const { photographerId } = req.params;

	try {
		// Получаем текущую дату
		const today = new Date();

		// Находим фотографа и удаляем старые записи из его расписания
		const photographer = await Photographer.findById(photographerId);

		// Если фотограф найден, фильтруем и обновляем расписание
		if (photographer) {
			// Обновляем массив schedule, удаляя все даты меньше сегодняшней
			photographer.schedule = photographer.schedule.filter(
				(slot) => new Date(slot.date) >= today
			);
			await photographer.save();

			res.status(200).send("Прошедшие записи из расписания удалены");
		} else {
			res.status(404).send("Фотограф не найден");
		}
	} catch (error) {
		console.error("Ошибка при удалении записей:", error);
		res.status(500).send("Ошибка при удалении записей");
	}
});

// Получение информации о фотографе и расписании
router.get("/photographers/:id", async (req, res) => {
	const photographerId = req.params.id;

	try {
		const photographer = await Photographer.findById(photographerId);

		if (!photographer) {
			return res.status(404).json({ message: "Фотограф не найден" });
		}

		res.json(photographer);
	} catch (err) {
		res.status(500).json({ message: "Ошибка сервера" });
	}
});

router.get("/checkUserRole/:telegramId", async (req, res) => {
	const { telegramId } = req.params;

	try {
		// Сначала проверяем в базе фотографов
		const photographer = await Photographer.findOne({ telegramId });
		if (photographer) {
			return res
				.status(200)
				.json({ role: "photographer", user: photographer });
		}

		// Если не найден в базе фотографов, проверяем в базе клиентов
		const client = await Client.findOne({ telegramId });
		if (client) {
			return res.status(200).json({ role: "client", user: client });
		}

		// Если не найден ни в одной базе
		return res.status(404).json({ message: "User not found" });
	} catch (error) {
		console.log("Ошибка при проверке пользователя:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

// Маршрут для добавления нового фотографа
router.post(
	"/photographers",
	upload.single("profilePhoto"),
	async (req, res) => {
		try {
			// Преобразование строки в массив, если это строка
			const parseArray = (field) =>
				typeof field === "string"
					? field.split(",").map((item) => item.trim())
					: Array.isArray(field)
					? field
					: [];

			// Очистка данных
			const hourlyRate =
				parseFloat(req.body.hourlyRate.replace(/[^0-9.]/g, "")) || 0;

			const photographer = new Photographer({
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				age: parseInt(req.body.age, 10),
				experience: req.body.experience,
				favoriteStyles: parseArray(req.body.favoriteStyles), // Преобразование строки в массив
				profilePhoto: req.file ? req.file.path : null, // Путь к загруженной фотографии
				portfolio: parseArray(req.body.portfolio), // Преобразование строки в массив
				status: req.body.status,
				hourlyRate: hourlyRate, // Преобразованное значение
				sessionTypes: parseArray(req.body.sessionTypes), // Преобразование строки в массив
			});

			await photographer.save();
			res.status(201).json(photographer);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	}
);

// Получаем расписание фотографа
router.get("/photographers/:id/schedule", async (req, res) => {
	const { id } = req.params;
	const { date } = req.query; // Получаем дату из параметра запроса
	try {
		const photographer = await Photographer.findById(id);
		if (!photographer) {
			return res.status(404).send({ message: "Фотограф не найден" });
		}

		// Фильтрация расписания по указанной дате
		const scheduleForDate = photographer.schedule.filter(
			(scheduleItem) =>
				scheduleItem.date.toISOString().slice(0, 10) == date
		);

		if (!scheduleForDate) {
			return res
				.status(404)
				.send({ message: "Нет доступного времени для указанной даты" });
		}

		// Возвращаем доступные слоты для даты
		res.json({
			availableSlots: scheduleForDate.flatMap(
				(scheduleItem) => scheduleItem.availableSlots
			),
		});
	} catch (error) {
		res.status(500).send({ message: "Ошибка сервера" });
	}
});

// Маршрут для обновления расписания
router.post("/photographers/:id/schedule", async (req, res) => {
	try {
		const { date, slots } = req.body; // Дата и временные промежутки
		const photographer = await Photographer.findById(req.params.id);
		if (!photographer)
			return res.status(404).send("Photographer not found");

		// Обновление расписания
		const existingScheduleIndex = photographer.schedule.findIndex(
			(s) => s.date.toDateString() === new Date(date).toDateString()
		);
		if (existingScheduleIndex > -1) {
			photographer.schedule[existingScheduleIndex] = {
				date: new Date(date),
				availableSlots: [...slots],
			};
		} else {
			photographer.schedule.push({
				date: new Date(date),
				availableSlots: [...slots],
			});
		}

		await photographer.save();
		res.status(200).json(photographer.schedule);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Секретный ключ для JWT
const JWT_SECRET = "your_jwt_secret";

// Регистрация
router.post("/register", async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = new User({ username, password });
		await user.save();
		res.status(201).json({ message: "User registered successfully" });
	} catch (error) {
		res.status(500).json({ error: "Registration failed" });
	}
});

// Логин
router.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		if (!user)
			return res.status(401).json({ error: "Invalid credentials" });

		const isMatch = await user.comparePassword(password);
		if (!isMatch)
			return res.status(401).json({ error: "Invalid credentials" });

		const token = jwt.sign({ id: user._id }, JWT_SECRET, {
			expiresIn: "1h",
		});
		res.status(200).json({ token });
	} catch (error) {
		res.status(500).json({ error: "Login failed" });
	}
});

module.exports = router;
