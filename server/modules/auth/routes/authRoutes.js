// routes/authRoutes.js — mounts all /auth/* endpoints
'use strict';

const express    = require('express');
const controller = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /auth/register
router.post('/register',        controller.register);

// POST /auth/login
router.post('/login',           controller.login);

// POST /auth/logout
router.post('/logout',          controller.logout);

// POST /auth/forgot-password
router.post('/forgot-password', controller.forgotPassword);

// POST /auth/reset-password
router.post('/reset-password',  controller.resetPassword);

// GET  /auth/me   (protected)
router.get('/me',               requireAuth, controller.me);

module.exports = router;
