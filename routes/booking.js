const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const Photographer = require("../models/Photographer");
const { default: axios } = require("axios");
const Client = require("../models/client");

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
	const { clientId, photographerId, date, timeSlot, isVip } = req.body;

	try {
		// Получаем информацию о клиенте
		const client = await Client.findById(clientId);
		const photographer = await Photographer.findById(photographerId);
		if (!photographer) {
			return res.status(404).json({ error: "Фотограф не найден." });
		}
		if (!client) {
			return res.status(404).json({ error: "Клиент не найден." });
		}
		// Проверяем VIP-статус клиента для данного фотографа
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

			const clientMessage =
				`Ваше бронирование отправлено фотографу на подтверждение.\n\n` +
				`Детали бронирования:\n` +
				`Фотограф: ${photographer.firstName}\nДата: ${date}\nВремя: ${timeSlot}`;
			const photographerMessage =
				`Новое брониров	ание ${isVip ? "от VIP-клиента" : ""}!\n\n` +
				`Клиент: ${client.name}\n` +
				`Дата: ${date}\n` +
				`Время: ${timeSlot}\n` +
				`Статус: ${booking.status}`;

			sendTelegramMessage(client.telegramId, clientMessage);
			sendTelegramMessage(photographer.telegramId, photographerMessage);

			return res.status(201).json({
				message: "Бронирование отправлено на рассмотрение фотографу.",
				booking: vipBooking,
			});
		}

		// Проверяем, доступен ли указанный слот для обычных клиентов
		const isSlotAvailable = photographer.schedule.some((slot) => {
			const slotDate = new Date(slot.date).toISOString().split("T")[0]; // Преобразуем в строку "YYYY-MM-DD"

			// Разделяем диапазон времени на отдельные интервалы
			const [startTime, endTime] = timeSlot.split("-");
			const startHour = parseInt(startTime.split(":")[0], 10);
			const endHour = parseInt(endTime.split(":")[0], 10);

			// Генерируем часовые интервалы из диапазона
			const requestedSlots = [];
			for (let hour = startHour; hour < endHour; hour++) {
				requestedSlots.push(
					`${hour.toString().padStart(2, "0")}:00-${(hour + 1)
						.toString()
						.padStart(2, "0")}:00`
				);
			}

			// Проверяем, что все интервалы из диапазона содержатся в availableSlots
			return (
				slotDate === date &&
				requestedSlots.every((requestedSlot) =>
					slot.availableSlots.includes(requestedSlot)
				)
			);
		});

		if (isSlotAvailable) {
			return res.status(400).json({
				message: "Выбранное время недоступно для бронирования.",
			});
		}
		await booking.save();

		const clientMessage =
			`Ваше бронирование создано!\n\n` +
			`Детали бронирования:\n` +
			`Фотограф: ${photographer.firstName}\nДата: ${date}\nВремя: ${timeSlot}\n\n` +
			`Пожалуйста, внесите предоплату в размере 1000 рублей для подтверждения.`;

		sendTelegramMessage(client.telegramId, clientMessage);

		res.status(201).json({
			message:
				"Бронирование создано. Пожалуйста, внесите предоплату для подтверждения.",
			booking,
		});
	} catch (error) {
		console.log("Ошибка при создании бронирования:", error);
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

router.delete("/:bookingId", async (req, res) => {
	const { bookingId } = req.params;

	try {
		// Пытаемся найти бронирование по ID
		const booking = await Booking.findById(bookingId);

		if (!booking) {
			return res.status(404).json({ message: "Бронирование не найдено" });
		}

		// Помечаем бронирование как отменённое
		booking.status = "cancelled";
		await booking.save();

		// Отправляем ответ с успешным статусом
		return res
			.status(200)
			.json({ message: "Бронирование отменено успешно" });
	} catch (error) {
		console.error("Ошибка при отмене бронирования:", error);
		return res
			.status(500)
			.json({ message: "Ошибка сервера при отмене бронирования" });
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
			parse_mode: undefined,
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
