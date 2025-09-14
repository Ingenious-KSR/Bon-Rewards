const {
  getUserRewards: getRewardsFromRedis,
  getCachedUserBills,
  checkRewardEligibility,
  cacheReward,
} = require("../services/redisClient");
const { createReward } = require("../models/reward-modal");

// Function to get user rewards
const getUserRewards = async (req, res) => {
  try {
    const { userId } = req.params;
    const rewards = await getRewardsFromRedis(userId);
    res.json({ userId, rewards });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
};

// Function to check eligibility
const checkEligibility = async (req, res) => {
  try {
    const { userId } = req.params;
    const bills = await getCachedUserBills(userId);

    if (!bills || bills.length < 3) {
      return res.json({
        userId,
        eligible: false,
        reason: `Need ${3 - (bills?.length || 0)} more bills`,
      });
    }

    const allPaidOnTime = bills.every((bill) => bill.isPaidOnTime);
    const recentRewardEligible = await checkRewardEligibility(userId);

    res.json({
      userId,
      eligible: allPaidOnTime && recentRewardEligible,
      reason: allPaidOnTime
        ? "Eligible for reward"
        : "Not all bills paid on time",
      bills,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check eligibility" });
  }
};

// Function to manually generate reward (for testing)
const manualGenerateReward = async (req, res) => {
  try {
    const { userId } = req.params;
    const bills = await getCachedUserBills(userId);

    if (!bills || bills.length < 3) {
      return res.status(400).json({ error: "Need 3 bills to generate reward" });
    }

    const reward = await generateReward(userId, bills);
    res.json({ message: "Reward generated successfully", reward });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate reward" });
  }
};

// Function to generate reward
const generateReward = async (userId, bills) => {
  const rewardTypes = [
    "10$ Amazon Gift Card",
    "10$ Starbucks Gift Card",
    "10$ Target Gift Card",
  ];

  const reward = createReward({
    id: `reward_${Date.now()}_${userId}`,
    userId,
    type: rewardTypes[Math.floor(Math.random() * rewardTypes.length)],
    amount: 10,
    status: "active",
    created_at: new Date().toISOString(),
  });

  await cacheReward(userId, reward);
  return reward;
};

module.exports = {
  getUserRewards,
  checkEligibility,
  manualGenerateReward,
  generateReward,
};
