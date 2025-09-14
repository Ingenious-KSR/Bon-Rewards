const express = require('express');
const billController = require('../controllers/bill-controller');

const router = express.Router();

router.post('/bills/pay', billController.payBill);
router.get('/users/:userId/bills', billController.getUserBills);
router.get('/users/:userId/bills/recent', billController.getRecentBills);

module.exports = router;