import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/apiErrors.js';
import { User } from "../models/user.model.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import ApiResponse from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessTokenAndRefreshToken = async (userId) => {
    const user = await User.findById(userId);
    const accessToken = user.generateAccesstoken();
    const refreshToken = user.generateRefreshtoken();

    user.refreshToken = refreshToken;
    user.save({ ValidateBeforeSave: false });

    return { accessToken, refreshToken }
}

const registerUser = asyncHandler(async (req, res) => {
    // Get user detail from frontend
    // Validate user detail - no empty
    // Check if user is already exists: username, email
    // Check for images and avatar
    // Upload then to cloudinary
    // Create user object to save n db
    // Remove password and refresh token in response
    // Check user creation
    // return response

    const { fullName, email, username, password } = req.body;

    // Validation
    if (!fullName || !email || !username || !password) {
        throw new ApiError(400, "Invalid Credentials");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]  // Return trueor false
    });

    if (existedUser) {
        throw new ApiError(409, "User is existed");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    console.log("FILES:", req.files);
    console.log("BODY:", req.body);


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar's local path is required!!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar is required!!");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id)
        .select(
            "-password -refreshToken"
        );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registred Successfully")
    )


})

const loginUser = asyncHandler(async (req, res) => {
    // takes username, email, password from req.body
    // find the user in db
    // match the password
    // generate refresh token and access token
    // send cookies

    const { username, email, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(402, "Email or Username is incorrect");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        ssecure: true
    }

    return res
        .status(200)
        .cookie("AccessToken", accessToken, options)
        .cookie("RefreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("AccessToken", options)
        .clearCookie("RefreshToken", options)
        .json(new ApiResponse(200, {}, "User Logout Successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies.RefreshToken || req.body.RefreshToken;

    if (!incomingToken) {
        throw new ApiError(401, "Unauthorized Token");
    }

    const decodedToken = jwt.verify(incomingToken, process.env.ACCESS_REFRESH_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .setCookie("Refresh Token", newRefreshToken, options)
        .setCookie("Access Token", accessToken, options)
        .json(new ApiResponse(
            200,
            {
                accessToken,
                refreshToken: newRefreshToken
            },
            "New Refresh Token Generated Successfully"
        ));




})

export { registerUser, loginUser, logoutUser, refreshAccessToken };