const express = require('express');
const router = express.Router();
const controller = require('../controllers/v_roles.controller');

router.get('/', controller.getAll);

module.exports = router;
