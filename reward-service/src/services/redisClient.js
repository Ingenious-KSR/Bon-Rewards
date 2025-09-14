const { createClient } = require("redis");

// Redis client setup
const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Function to connect to Redis
const connectRedis = async () => {
  await client.connect();
  console.log("✅ Redis connected");
};

// Function to cache user bills
const cacheUserBills = async (userId, bills) => {
  const key = `user:${userId}:recent_bills`;
  await client.setEx(key, 3600, JSON.stringify(bills));
};

// Function to get cached user bills
const getCachedUserBills = async (userId) => {
  const key = `user:${userId}:recent_bills`;
  const cached = await client.get(key);
  return cached ? JSON.parse(cached) : null;
};

// Function to update user bills cache
const updateUserBillsCache = async (userId, newBill) => {
  const cached = await getCachedUserBills(userId);
  let bills = cached || [];

  bills.unshift(newBill);
  bills = bills.slice(0, 3); // Keep only last 3 bills

  await cacheUserBills(userId, bills);
  return bills;
};

// Function to cache reward
const cacheReward = async (userId, reward) => {
  const key = `user:${userId}:reward:${reward.id}`;
  await client.setEx(key, 86400, JSON.stringify(reward));
};

// Function to get user rewards
const getUserRewards = async (userId) => {
  const pattern = `user:${userId}:reward:*`;
  const keys = await client.keys(pattern);

  if (keys.length === 0) return [];

  const rewards = await client.mGet(keys);
  return rewards.filter((r) => r).map((r) => JSON.parse(r));
};

// Function to check reward eligibility
const checkRewardEligibility = async (userId) => {
  const key = `user:${userId}:last_reward`;
  const lastReward = await client.get(key);

  if (!lastReward) return true;

  const lastRewardTime = new Date(lastReward);
  const now = new Date();
  const daysDiff = Math.floor((now - lastRewardTime) / (1000 * 60 * 60 * 24));

  return daysDiff > 7;
};

// Function to mark reward as given
const markRewardGiven = async (userId) => {
  const key = `user:${userId}:last_reward`;
  await client.setEx(key, 604800, new Date().toISOString());
};

// Function to disconnect Redis
const disconnectRedis = async () => {
  await client.disconnect();
  console.log("✅ Redis disconnected");
};

module.exports = {
  connectRedis,
  cacheUserBills,
  getCachedUserBills,
  updateUserBillsCache,
  cacheReward,
  getUserRewards,
  checkRewardEligibility,
  markRewardGiven,
  disconnectRedis,
};
