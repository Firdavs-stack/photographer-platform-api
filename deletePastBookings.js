const mongoose = require("mongoose");
const cron = require("node-cron");
const { connectToDatabase } = require("./db"); // Импортируем функцию подключения
const Booking = require("./models/booking"); // Импортируем модель бро

// Запуск работы
const run = async () => {
	try {
		// Подключение к базе данных
		await connectToDatabase();

		// Удаление старых бронирований
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня

		try {
			// Удаляем бронирования, у которых дата меньше текущей

			const result = await Booking.updateMany(
				{}, // Применяем ко всем документам
				{
					$pull: {
						schedule: { date: { $lt: today } }, // Удаляем элементы массива с date < today
					},
				}
			);
			console.log(`Обновлено ${result.modifiedCount} документов.`);
		} catch (error) {
			console.error("Ошибка при удалении старых дат из schedule:", error);
			throw error; // Пробрасываем ошибку дальше, если она произошла
		}
		console.log("Удаление старых бронирований завершено.");
	} catch (error) {
		console.error("Ошибка при удалении старых бронирований:", error);
	}
};

cron.schedule("* * * * *", () => {
	console.log("Running scheduled task: deletePastBookings");
	run();
});
