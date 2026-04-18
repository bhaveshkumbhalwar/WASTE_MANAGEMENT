




const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, authorize('admin'), getUsers);
router.post('/', protect, authorize('admin'), createUser);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.put('/:id/password', protect, changePassword);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
