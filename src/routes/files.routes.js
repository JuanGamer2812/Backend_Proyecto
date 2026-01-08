const express = require('express');
const router = express.Router();
const filesController = require('../controllers/files.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth.middleware');

// GET /api/files/signed-url?publicId=...&resourceType=raw
// Allow optional authentication for GET so files can be public; keep POST protected
router.get('/signed-url', optionalAuth, filesController.getSignedUrl);

// POST alternative
router.post('/signed-url', authenticateToken, filesController.getSignedUrl);

// Proxy (no auth for now, but can be protected)
router.get('/proxy', filesController.proxy);

module.exports = router;