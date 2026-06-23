const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');

// Rota de login
router.post('/login', ctrl.login);

module.exports = router;
