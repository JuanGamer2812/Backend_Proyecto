const express = require('express');
const router = express.Router();
const controller = require('../controllers/v_evento_unificado.controller');

router.get('/', controller.getAll);

module.exports = router;
