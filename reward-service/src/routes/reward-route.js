const express = require('express');
const rewardController = require('../controllers/reward-controller');

const router = express.Router();

router.get('/users/:userId/rewards', rewardController.getUserRewards);
router.get('/users/:userId/eligibility', rewardController.checkEligibility);
router.post('/users/:userId/rewards/generate', rewardController.manualGenerateReward);

module.exports = router;