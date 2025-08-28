import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,    // Cloudinary URL
        required: true,
    },
    coverImage: {
        type: String,    // Cloudinary URL
    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }],
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String
    }

}, { timestamps: true });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();   // if password doesnt modified by the user then we dont need to hash the password again and again.  
    this.password = await bcrypt.hash(this.password, 10);   // 10 round hashing
    next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)     // Comparing users password with encrypted password.
}

userSchema.methods.generateAccesstoken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY 
        }
    )
};
userSchema.methods.generateRefreshtoken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.ACCESS_REFRESH_SECRET,
        {
            expiresIn: process.env.ACCESS_REFRESH_EXPIRY 
        }
    )
};

export const User = mongoose.model("User", userSchema);
