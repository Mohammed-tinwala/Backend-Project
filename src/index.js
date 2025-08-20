import connectDB from "./db/index.js";
import dotenv from 'dotenv';

dotenv.config({
    path: './env'
})

connectDB();


// First Approach to connect a DB in index.js file.
/*
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error", () => {
            console.log("ERROR:".error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on ${process.env.PORT}`)
        })

    } catch (error) {
        console.log("ERROR:", error);
        throw error;
    }

})()

*/