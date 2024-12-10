const Booking = require("./models/booking");

const updateBookings = async (updatedBookings) => {
	// Модель бронирований
	try {
		// Очищаем прошедшие бронирования
		await Booking.deleteMany({ date: { $lt: new Date() } });

		// (Если необходимо, можно дополнительно обновлять другие данные)
	} catch (error) {
		console.error("Ошибка при обновлении бронирований:", error);
		throw error;
	}
};
const deletePastBookings = async () => {
	const today = new Date();
	today.setHours(0, 0, 0, 0); // Только текущая дата без времени

	const bookings = await getBookings(); // Получаем все бронирования из базы
	const updatedBookings = bookings.filter((booking) => {
		const bookingDate = new Date(booking.date);
		return bookingDate >= today; // Оставляем только будущие даты
	});

	await updateBookings(updatedBookings); // Обновляем базу данных
};

deletePastBookings();
