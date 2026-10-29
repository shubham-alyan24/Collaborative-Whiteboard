import express from 'express';
import {
  register,
  login,
  getMe,
  oauthStart,
  oauthCallback,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  updateProfileValidation,
  changePasswordValidation,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/me', protect, getMe);
router.patch('/me', protect, upload.single('avatar'), updateProfileValidation, updateProfile);
router.patch('/me/password', protect, changePasswordValidation, changePassword);
router.delete('/me', protect, deleteAccount);
router.get('/:provider', oauthStart);
router.get('/:provider/callback', oauthCallback);

export default router;
