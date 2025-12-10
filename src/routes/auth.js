const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup-simple', authController.signUp);
router.post('/signin-simple', authController.signIn);

module.exports = router;
