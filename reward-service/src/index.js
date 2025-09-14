require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectRedis } = require("./services/redisClient");
const { startKafkaConsumer } = require("./services/consumer");
const routes = require("./routes/reward-route");

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const initializeServices = async () => {
  try {
    await connectRedis();
    await startKafkaConsumer();
    console.log("✅ All services initialized");
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
  }
};

// Routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "reward-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Reward Service running on port ${PORT}`);
  await initializeServices();
});
