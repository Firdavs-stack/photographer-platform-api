const mongoose = require("mongoose");

const connectToDatabase = async function main() {
	try {
		await mongoose.connect(
			"mongodb+srv://firdavsusmanov418:gPPbpsmhIDE5sf9b@cluster0.owmnn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
		);
		console.log("Connected successfully to MongoDB");
	} catch (err) {
		console.error("Error connecting to MongoDB", err);
	}
};

module.exports = { connectToDatabase };
