import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);  
        // It will returns an object.
        console.log(`\n MongoDB Connected!! DB Host: ${connectionInstance.connection.host}`);
        // consoling the DB Host name.
        
        
    } catch (error) {
        console.log("ERROR:", error);
        process.exit(1);   // If any error comes than it will exit the process same as throw error.
    }
    
}

export default connectDB;