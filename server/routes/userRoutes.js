import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.use(authController.protect);

router.get('/me', userController.getMe, userController.getUser);
router.delete('/me', userController.getMe, userController.deleteUser);
router.get('/logout', authController.logout);

router.route('/public-key').post(userController.createPublicKey)

router.route('/public-key/:id').get(userController.getPublicKey)

router.use(authController.restrictTo('admin'));

router.route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router.route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

export default router;