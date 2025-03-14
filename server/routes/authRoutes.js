import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/login/google', authController.GoogleLogin);

router.use(authController.protect);

router.get('/logout', authController.logout);
router.get('/refresh', authController.refreshToken);

export default router;