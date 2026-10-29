import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional for users who only sign in with Google/GitHub
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.githubId;
      },
      minlength: 6,
      select: false,
    },
    // sha256 of the emailed reset token
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    profilePicture: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/9.x/lorelei/svg?seed=${this.name}`;
      },
    },
    ownedBoards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Whiteboard",
      },
    ],
    sharedBoards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Whiteboard",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual("notifications", {
  ref: "Notification",
  localField: "_id",
  foreignField: "recipient",
});

const User = mongoose.model("User", userSchema);
export default User;
