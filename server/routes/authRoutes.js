import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
// router.post('/forgotPassword', authController.forgotPassword);
// router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);

// router.patch('/updateMyPassword', authController.updatePassword);
router.get('/logout', authController.logout);
// router.get('/refresh', authController.refreshToken);

export default router;