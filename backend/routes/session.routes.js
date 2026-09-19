const express = require('express');
const { getSession } = require('../controllers/session.controller');

const router = express.Router();

router.get('/', getSession);

module.exports = router;
