const createReward = (data) => {
  return {
    id: data.id,
    userId: data.userId,
    type: data.type,
    amount: data.amount,
    status: data.status || "active",
    created_at: data.created_at || new Date().toISOString(),
  };
};

// Function to validate reward data
const validateReward = (data) => {
  if (!data.userId || !data.type || !data.amount) {
    throw new Error("Missing required fields: userId, type, amount");
  }

  if (typeof data.amount !== "number" || data.amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  return true;
};

module.exports = {
  createReward,
  validateReward,
};
