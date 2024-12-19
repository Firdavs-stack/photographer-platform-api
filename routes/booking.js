const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const Photographer = require("../models/Photographer");
const { default: axios } = require("axios");

// Получить все бронирования с определенным статусом
router.get("/", async (req, res) => {
	const { status } = req.query;
	try {
		const bookings = await Booking.find(status ? { status } : {});
		res.status(200).json(bookings);
	} catch (error) {
		res.status(500).json({ error: "Ошибка получения бронирований" });
	}
});

// Найти бронирование по id

router.get("/client/:clientId", async (req, res) => {
	try {
		const bookings = await Booking.find({ clientId: req.params.clientId });
		res.json(bookings);
	} catch (error) {
		res.status(500).json({
			message: "Ошибка при получении бронирований",
			error,
		});
	}
});

// Создать новое бронирование
router.post("/", async (req, res) => {
	const { clientId, photographerId, date, timeSlot } = req.body;

	try {
		// Получаем информацию о клиенте
		const client = await Client.findById(clientId);
		console.log(client);
		if (!client) {
			return res.status(404).json({ error: "Клиент не найден." });
		}

		// Проверяем VIP-статус клиента для данного фотографа
		const isVip = client.photographers.includes(photographerId);

		if (isVip) {
			// Если клиент VIP, бронирование создаётся без проверки доступности и без предоплаты
			const vipBooking = new Booking({
				clientId,
				photographerId,
				date,
				timeSlot: timeSlot || "Any", // Если слот не указан, указываем "Any"
				status: "awaiting_confirmation", // Для VIP-клиента статус будет "awaiting_confirmation"
				prepayment: 0, // Для VIP клиентов предоплата не нужна
			});
			await vipBooking.save();

			return res.status(201).json({
				message: "Бронирование отправлено на рассмотрение фотографу.",
				booking: vipBooking,
			});
		}

		// Получаем расписание фотографа для обычных клиентов
		const photographer = await Photographer.findById(photographerId);
		if (!photographer) {
			return res.status(404).json({ error: "Фотограф не найден." });
		}

		// Проверяем, доступен ли указанный слот для обычных клиентов
		const isSlotAvailable = photographer.schedule.some(
			(slot) =>
				slot.date === date && slot.availableSlots.includes(timeSlot)
		);

		if (!isSlotAvailable) {
			return res.status(400).json({
				message: "Выбранное время недоступно для бронирования.",
			});
		}

		// Создаём бронирование для обычного клиента с предоплатой
		const booking = new Booking({
			clientId,
			photographerId,
			date,
			timeSlot,
			status: "awaiting_prepayment", // Требуется предоплата
			prepayment: 1000, // Устанавливаем сумму предоплаты для обычных клиентов (можно изменить)
		});
		await booking.save();

		res.status(201).json({
			message:
				"Бронирование создано. Пожалуйста, внесите предоплату для подтверждения.",
			booking,
		});
	} catch (error) {
		console.error("Ошибка при создании бронирования:", error);
		res.status(500).json({
			error: "Ошибка сервера при создании бронирования.",
			details: error,
		});
	}
});

// Загрузить скриншот оплаты и обновить статус на "awaiting_confirmation"
router.put("/:id/uploadScreenshot", async (req, res) => {
	const { id } = req.params;
	const { paymentScreenshot } = req.body;
	try {
		const booking = await Booking.findByIdAndUpdate(
			id,
			{ paymentScreenshot, status: "awaiting_confirmation" },
			{ new: true }
		);
		if (!booking)
			return res.status(404).json({ error: "Бронирование не найдено" });
		res.status(200).json(booking);
	} catch (error) {
		res.status(500).json({ error: "Ошибка обновления бронирования" });
	}
});

// Подтвердить бронирование
// Обновлённая функция для отправки сообщения с кнопкой
async function sendTelegramMessageWithButton(chatId, message, bookingId) {
	const botToken = "7647751844:AAGSToi5DCbuRGAA156G52obCl3FLHBn5j4"; // Ваш токен бота
	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			text: message,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Добавить детали",
							callback_data: `add_details_${bookingId}`,
						},
					],
				],
			},
		}),
	});

	const data = await response.json();
	if (!data.ok) {
		console.error(
			"Ошибка отправки сообщения в Telegram:",
			data.description
		);
	}
}

async function sendTelegramMessage(chatId, message) {
	const botToken = "7647751844:AAGSToi5DCbuRGAA156G52obCl3FLHBn5j4";
	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			text: message,
			parse_mode: "Markdown",
		}),
	});

	const data = await response.json();
	if (!data.ok) {
		console.error(
			"Ошибка отправки сообщения в Telegram:",
			data.description
		);
	}
}

router.put("/:id/confirm", async (req, res) => {
	const { id } = req.params;
	try {
		// Находим бронирование по id и обновляем статус
		const booking = await Booking.findByIdAndUpdate(id, {
			status: "approved",
		});

		if (!booking) {
			return res.status(404).json({ message: "Booking not found!" });
		}
		const { clientId, photographerId } = booking;

		const photographer = await axios.get(
			`https://localhost:3000/api/photographers/${photographerId}`
		);
		const client = await axios.get(
			`https://localhost:3000/api/clients/${clientId}`
		);

		// Уведомление клиенту
		await sendTelegramMessage(
			client.data.telegramId,
			`Ваше бронирование подтверждено! Фотограф ${photographer.data.name} скоро свяжется с вами для уточнения деталей.`
		);
		console.log(client);

		// Уведомление фотографу с контактной информацией клиента и кнопкой для добавления деталей
		await sendTelegramMessageWithButton(
			photographer.data.telegramId,
			`Бронирование подтверждено! Вот контакты клиента: 
            Имя: ${client.data.name} 
            Телефон: ${client.data.phone}
            // Telegram: @${client.data.telegramUsername}
            
            Пожалуйста, свяжитесь с клиентом для уточнения деталей и нажмите кнопку "Добавить детали" после завершения.`,
			booking.id
		);

		return res
			.status(200)
			.json({ message: "Booking confirmed and notifications sent." });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
});

router.post("/", async (req, res) => {
	try {
		const { clientId, photographerId, date, timeSlot } = req.body;

		const newBooking = new Booking({
			clientId,
			photographerId,
			date,
			timeSlot,
			status: "awaiting_confirmation",
		});

		await newBooking.save();
		res.status(201).json(newBooking);
	} catch (error) {
		res.status(500).json({
			message: "Ошибка при создании бронирования",
			error,
		});
	}
});

router.put("/:id/add-details", async (req, res) => {
	const { id } = req.params;
	const { details, meetingAddress } = req.body;

	try {
		const booking = await Booking.findByIdAndUpdate(
			id,
			{ details, meetingAddress },
			{ new: true }
		);

		if (!booking) {
			return res.status(404).json({ message: "Booking not found" });
		}

		// Получаем информацию о клиенте и фотографе
		const client = await axios.get(
			`https://localhost:3000/api/clients/${booking.clientId}`
		);
		const photographer = await axios.get(
			`https://localhost:3000/api/photographers/${booking.photographerId}`
		);

		// Уведомляем клиента о том, что все детали съемки добавлены
		await sendTelegramMessage(
			client.data.telegramId,
			`Ваше бронирование обновлено. Детали фотосессии:
            Время: ${booking.timeSlot}
            Адрес: ${booking.meetingAddress}
            Фотограф: ${photographer.data.name}
            Детали: ${booking.details}`
		);

		return res
			.status(200)
			.json({ message: "Details added and client notified." });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
});

module.exports = router;
