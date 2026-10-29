import Whiteboard from "../models/Whiteboard.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { generateUniqueShareCode } from "../services/shareCodeService.js";
import * as notificationService from "../services/notificationService.js";
import catchAsync from "../utils/catchAsync.js";
import ApiError from "../utils/ApiError.js";
import {
  uploadImage,
  uploadThumbnail,
  deleteImageByUrl,
} from "../services/uploadService.js";
export const joinByCode = catchAsync(async (req, res) => {
  const { code } = req.params;

  const board = await Whiteboard.findOne({ shareCode: code }).select(
    "-sharedWith -pendingRequests",
  );

  if (!board) {
    throw ApiError.notFound("Board not found");
  }

  res.json(board);
});

export const getAll = catchAsync(async (req, res) => {
  const whiteboards = await Whiteboard.find({
    $or: [{ owner: req.user.id }, { "sharedWith.userId": req.user.id }],
  })
    .populate("owner", "name profilePicture")
    .populate("sharedWith.userId", "name, profilePicture")
    .select("name createdAt updatedAt owner sharedWith shareCode thumbnail")
    .sort({ updatedAt: -1 });

  res.json(whiteboards);
});

export const patchThumbnail = catchAsync(async (req, res) => {
  const { thumbnail } = req.body;

  if (!thumbnail) throw ApiError.badRequest("No thumbnail provided");

  const board = await Whiteboard.findOneAndUpdate(
    {
      _id: req.params.id,
      $or: [{ owner: req.user.id }, { "sharedWith.userId": req.user.id }],
    },
    { $set: { thumbnail } },
    { returnDocument: "after", select: "_id thumbnail" },
  );
  if (!board) throw ApiError.notFound("Board not found");

  res.json({ success: true });
});

export const getOne = catchAsync(async (req, res) => {
  const whiteboard = await Whiteboard.findOne({
    _id: req.params.id,
    $or: [{ owner: req.user.id }, { "sharedWith.userId": req.user.id }],
  });

  if (!whiteboard) {
    throw ApiError.notFound("Whiteboard not found");
  }

  res.json(whiteboard);
});

export const create = catchAsync(async (req, res) => {
  const { name } = req.body;
  const shareCode = await generateUniqueShareCode();

  const whiteboard = await Whiteboard.create({
    name: name || "Untitled",
    owner: req.user.id,
    strokes: [],
    shareCode,
  });
  await User.findByIdAndUpdate(req.user.id, {
    $push: { ownedBoards: whiteboard._id },
  });
  res.status(201).json(whiteboard);
});

export const update = catchAsync(async (req, res) => {
  const { strokes, name } = req.body;

  const whiteboard = await Whiteboard.findOneAndUpdate(
    {
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { sharedWith: { $elemMatch: { userId: req.user.id, role: "editor" } } },
      ],
    },
    { strokes, name },
    { returnDocument: "after" },
  );
  if (!whiteboard) {
    throw ApiError.notFound("Whiteboard not found or not authorized");
  }

  res.json(whiteboard);
});

export const remove = catchAsync(async (req, res) => {
  const whiteboard = await Whiteboard.findOneAndDelete({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!whiteboard) {
    throw ApiError.notFound("Whiteboard not found");
  }

  res.json({ message: "Deleted successfully" });
});

export const requestAccess = catchAsync(async (req, res) => {
  const { id } = req.params;
  const board = await Whiteboard.findById(id);

  if (!board) {
    throw ApiError.notFound("Board not found");
  }

  // 1. Prevent owner from requesting access to their own board
  if (board.owner.toString() === req.user.id) {
    throw ApiError.badRequest("You are the owner of this board");
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);

  const alreadyRequested = board.pendingRequests.some((r) =>
    r.userId?.equals(userId),
  );
  const alreadyShared = board.sharedWith.some((s) => s.userId?.equals(userId));

  // If you see a 400 Bad Request in your network tab, it is triggering here
  // because you already have a pending request saved from a previous attempt!
  if (alreadyRequested || alreadyShared) {
    throw ApiError.badRequest("Already requested or has access");
  }

  // 2. Add the request FIRST
  board.pendingRequests.push({ userId });
  await board.save();

  // 3. NOW grab the newly created request (which is safely the last item)
  const newlyCreatedRequest =
    board.pendingRequests[board.pendingRequests.length - 1];

  const sender = await User.findById(req.user.id).select("name");

  // 4. Create the notification safely
  await notificationService.createNotification({
    recipient: board.owner,
    sender: req.user.id,
    board: board._id,
    type: "request_received",
    message: `${sender.name} has requested access to your board "${board.name}"`,
    actionData: {
      requestId: newlyCreatedRequest._id,
    },
  });

  res.json({ message: "Request sent successfully" });
});
export const respondToRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { requestId, approve } = req.body;

  const board = await Whiteboard.findById(id);
  if (!board) {
    throw ApiError.notFound("Board not found");
  }

  if (!board.owner.equals(req.user.id)) {
    throw ApiError.forbidden("Only the owner can respond to requests");
  }

  const pendingReq = board.pendingRequests.find(
    (r) => r._id.toString() === requestId.toString(),
  );

  if (!pendingReq) {
    throw ApiError.badRequest("Request not found");
  }

  board.pendingRequests = board.pendingRequests.filter(
    (r) => r._id.toString() !== requestId.toString(),
  );

  if (approve) {
    board.sharedWith.push({ userId: pendingReq.userId, role: "editor" });
    await User.findByIdAndUpdate(pendingReq.userId, {
      $push: { sharedBoards: board._id },
    });
  }
  await board.save();

  const requester = await User.findById(pendingReq.userId).select("name");
  const owner = await User.findById(req.user.id).select("name");

  await notificationService.createNotification({
    recipient: pendingReq.userId,
    sender: req.user.id,
    board: board._id,
    type: approve ? "request_approved" : "request_denied",
    message: approve
      ? `Your request to join "${board.name}" was approved by ${owner.name}`
      : `Your request to join "${board.name}" was denied`,
    actionData: {
      role: approve ? "editor" : undefined,
    },
  });

  res.json({
    message: approve ? "Access granted" : "Request denied",
  });
});

export const uploadBoardImage = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No image file provided");

  const whiteboard = await Whiteboard.findOne({
    _id: req.params.id,
    $or: [
      { owner: req.user.id },
      { sharedWith: { $elemMatch: { userId: req.user.id, role: "editor" } } },
    ],
  });
  if (!whiteboard) {
    throw ApiError.notFound("Whiteboard not found or not authorized");
  }

  const url = await uploadImage(req.file.buffer);
  res.status(200).json({ success: true, imageUrl: url });
});
export const uploadBoardThumbnail = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No thumbnail file provided");

  const whiteboard = await Whiteboard.findOne({
    _id: req.params.id,
    $or: [{ owner: req.user.id }, { "sharedWith.userId": req.user.id }],
  });

  if (!whiteboard) throw ApiError.notFound("Whiteboard not found");

  if (whiteboard.thumbnail) {
    await deleteImageByUrl(whiteboard.thumbnail);
  }

  // 1. Upload to Cloudinary
  const url = await uploadThumbnail(req.file.buffer);

  // 2. Use findOneAndUpdate to bypass full document validation
  await Whiteboard.findOneAndUpdate(
    { _id: req.params.id },
    { $set: { thumbnail: url } },
  );

  res.status(200).json({ success: true, thumbnail: url });
});
