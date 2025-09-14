import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/apiErrors.js';
import { User } from "../models/user.model.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import ApiResponse from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Old Password");
    }

    user.password = password;
    await user.save({ ValidateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Password has changes successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200, req.user, "Current User Fetched Successfully")
})

const updateAccountDetail = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(401, "Invalid Crediential");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account Details Updated Successfully"));
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.avatar[0]?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image local path is required!!");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Failed Uploading Cover Image On Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Updated Successfuly"));

});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar's local path is required!!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Failed Uploading Avatar On Cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image Updated Successfuly"));



});

const getChannelUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is not available");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }


    ])

    if (!channel?.length) {
        throw new ApiError(400, "Channel Not Found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "Channel Fetched Successfully")
        )



})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,

                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }

    ])

    res
        .status(200)
        .json(new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History Fetched Successfully"
        ))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage,
    getWatchHistory
};