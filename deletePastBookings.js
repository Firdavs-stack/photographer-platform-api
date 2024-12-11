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
			// Находим документы с датами в schedule меньше текущей и устанавливаем флаг
			const result = await Photographer.updateMany(
				{ "schedule.date": { $lt: today } }, // Проверяем наличие элемента с date < today
				{
					$set: { "schedule.$[elem].hasPastDates": true }, // Устанавливаем флаг hasPastDates в массиве schedule
				},
				{
					arrayFilters: [{ "elem.date": { $lt: today } }], // Фильтруем элементы массива с date < today
				}
			);
			console.log(
				`Обновлено ${result.modifiedCount} документов с флагом hasPastDates.`
			);
		} catch (error) {
			console.error("Ошибка при обновлении флага в schedule:", error);
			throw error; // Пробрасываем ошибку дальше
		}

		console.log("Обновление флагов завершено.");
	} catch (error) {
		console.error("Ошибка при выполнении скрипта:", error);
	}
};

cron.schedule("* * * * *", () => {
	console.log("Running scheduled task: deletePastBookings");
	run();
});
