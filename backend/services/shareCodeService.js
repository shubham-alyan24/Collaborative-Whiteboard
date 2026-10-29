import Whiteboard from '../models/Whiteboard.js';

const generateShareCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generateUniqueShareCode = async () => {
  let isUnique = false;
  let shareCode = '';

  while (!isUnique) {
    shareCode = generateShareCode();
    const existing = await Whiteboard.findOne({ shareCode });
    if (!existing) {
      isUnique = true;
    }
  }

  return shareCode;
};
