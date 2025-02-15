const express = require('express');
const authController = require('../controllers/auth.controller');
const {
    registerValidator,
    loginValidator,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/login', loginValidator, authController.login);
router.post('/register', registerValidator, authController.register);

module.exports = router;
