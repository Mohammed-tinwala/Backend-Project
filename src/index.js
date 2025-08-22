import app from "./app.js";
import connectDB from "./db/index.js";
import dotenv from 'dotenv';

dotenv.config({
    path: './env'
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

        app.on("error", (error) => {
            console.log("Express Connection Failed", error);
            throw error
        })
    }
    ).catch((error) => {
        console.log("MongoDB Connection Failed ", error);
        
    })


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