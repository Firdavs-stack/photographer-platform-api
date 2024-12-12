const mongoose = require("mongoose");
const cron = require("node-cron");
const { connectToDatabase } = require("./db"); // Импортируем функцию подключения
const Photographer = require("./models/Photographer"); // Импортируем модель бро

// Запуск работы
const run = async () => {
	try {
		// Подключение к базе данных
		await connectToDatabase();

		// Установка текущей даты на начало дня
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		try {
			// Удаление всех прошедших дат из schedule.date
			const result = await Photographer.updateMany(
				{},
				{
					$pull: {
						schedule: {
							date: { $lt: today }, // Удаляем даты меньше сегодняшнего дня
						},
					},
				}
			);

			console.log(
				`Удалено прошедших дат у ${result.modifiedCount} документов.`
			);
		} catch (error) {
			console.error(
				"Ошибка при удалении прошедших дат из schedule:",
				error
			);
			throw error; // Пробрасываем ошибку дальше
		}

		console.log("Удаление прошедших дат завершено.");
	} catch (error) {
		console.error("Ошибка при выполнении скрипта:", error);
	}
};

cron.schedule("* * * * *", () => {
	console.log("Running scheduled task: deletePastBookings");
	run();
});
