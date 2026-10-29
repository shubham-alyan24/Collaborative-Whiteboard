import crypto from "crypto";
import User from "../models/User.js";
import Whiteboard from "../models/Whiteboard.js";
import Notification from "../models/Notification.js";
import { uploadImage } from "../services/uploadService.js";
import { hashPassword, comparePassword } from "../services/passwordService.js";
import { generateToken } from "../services/tokenService.js";
import { getProvider } from "../services/oauthService.js";
import catchAsync from "../utils/catchAsync.js";
import { ALLOWED_ORIGINS } from "../utils/constants.js";
import ApiError from "../utils/ApiError.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const OAUTH_STATE_COOKIE = "oauth_state";

const readCookie = (req, name) => {
  const match = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([key]) => key === name);
  return match ? decodeURIComponent(match[1]) : null;
};

const redirectToClient = (res, path) =>
  res.redirect(`${ALLOWED_ORIGINS[0]}${path}`);

export const oauthStart = catchAsync(async (req, res) => {
  const provider = getProvider(req.params.provider);
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(provider.authUrl(state));
});

export const oauthCallback = async (req, res) => {
  const { provider: providerName } = req.params;
  const { code, state, error } = req.query;
  const expectedState = readCookie(req, OAUTH_STATE_COOKIE);
  res.clearCookie(OAUTH_STATE_COOKIE);

  try {
    if (error) throw new Error(error);
    if (!code || !state || state !== expectedState) {
      throw new Error("Invalid OAuth state");
    }

    const provider = getProvider(providerName);
    const profile = await provider.getProfile(code);
    const idField = `${providerName}Id`;

    // Match on provider id first, then link by (provider-verified) email
    let user =
      (await User.findOne({ [idField]: profile.providerId })) ||
      (await User.findOne({ email: profile.email.toLowerCase() }));

    if (user) {
      if (!user[idField]) {
        user[idField] = profile.providerId;
        await user.save();
      }
    } else {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        [idField]: profile.providerId,
        ...(profile.avatar && { profilePicture: profile.avatar }),
      });
    }

    // Token goes in the fragment so it never reaches server logs
    redirectToClient(res, `/oauth/callback#token=${generateToken(user._id)}`);
  } catch (err) {
    console.error(`OAuth ${providerName} error:`, err.message);
    redirectToClient(res, "/login?error=oauth_failed");
  }
};

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already in use" });
  }

  const hashedPassword = await hashPassword(password);
  const user = await User.create({ name, email, password: hashedPassword });

  const token = generateToken(user._id);

  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!user.password) {
    return res.status(401).json({
      message: "This account uses Google or GitHub sign-in",
    });
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

export const updateProfile = catchAsync(async (req, res) => {
  const { name, email } = req.body;

  const taken = await User.findOne({ email, _id: { $ne: req.user.id } });
  if (taken) throw ApiError.badRequest("Email already in use");

  const update = { name, email };
  if (req.file) update.profilePicture = await uploadImage(req.file.buffer);

  const user = await User.findByIdAndUpdate(req.user.id, update, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound("User not found");
  res.json(user);
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  if (!user) throw ApiError.notFound("User not found");

  // OAuth-only accounts have no password yet and may set one directly
  if (
    user.password &&
    !(await comparePassword(currentPassword || "", user.password))
  ) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  user.password = await hashPassword(newPassword);
  await user.save();
  res.json({ message: "Password updated" });
});

export const deleteAccount = catchAsync(async (req, res) => {
  const id = req.user.id;
  await Whiteboard.deleteMany({ owner: id });
  await Whiteboard.updateMany(
    {},
    { $pull: { sharedWith: { userId: id }, pendingRequests: { userId: id } } },
  );
  await Notification.deleteMany({ $or: [{ recipient: id }, { sender: id }] });
  await User.findByIdAndDelete(id);
  res.json({ message: "Account deleted" });
});

const RESET_TOKEN_TTL = 15 * 60 * 1000;
const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Always responds the same way so emails can't be enumerated
export const forgotPassword = catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashResetToken(token);
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL);
    await user.save();

    try {
      await sendPasswordResetEmail(
        user.email,
        `${ALLOWED_ORIGINS[0]}/reset-password?token=${token}`,
      );
    } catch (err) {
      console.error("Reset email error:", err.message);
    }
  }

  res.json({ message: "If that email exists, a reset link has been sent" });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetToken: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest("Reset link is invalid or has expired");

  user.password = await hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: "Password updated" });
});
