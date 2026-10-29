import { ALLOWED_ORIGINS } from "../utils/constants.js";

const socketOptions = {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
};

export default socketOptions;
