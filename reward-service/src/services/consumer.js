const { Kafka, logLevel } = require('kafkajs');
const { updateUserBillsCache, checkRewardEligibility, markRewardGiven } = require('./redisClient');
const { generateReward } = require('../controllers/reward-controller');

// Kafka setup with proper Docker networking
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'reward-service',
  brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'], // Use kafka:9092 for Docker network
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 300,
    retries: 10
  },
  logLevel: logLevel.INFO
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'reward-service-group',
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  heartbeatInterval: 3000,
  allowAutoTopicCreation: true,
  retry: {
    retries: 5
  }
});

let isRunning = false;

// Function to handle incoming messages
const handleMessage = async (topic, partition, message) => {
  try {
    const billPayment = JSON.parse(message.value.toString());
    
    console.log(`📨 Processing bill payment message:`, {
      topic,
      partition,
      offset: message.offset,
      userId: billPayment.userId,
      billId: billPayment.billId,
      isPaidOnTime: billPayment.isPaidOnTime
    });

    // Update Redis cache with new bill
    const bill = {
      billId: billPayment.billId,
      amount: billPayment.amount,
      dueDate: billPayment.dueDate,
      paymentDate: billPayment.paymentDate,
      billType: billPayment.billType,
      isPaidOnTime: billPayment.isPaidOnTime
    };

    const bills = await updateUserBillsCache(billPayment.userId, bill);
    console.log(`💾 Updated cache for user ${billPayment.userId}: ${bills.length} bills`);

    // Check for reward eligibility
    if (bills.length >= 3) {
      const allPaidOnTime = bills.slice(0, 3).every(b => b.isPaidOnTime);
      
      if (allPaidOnTime) {
        console.log(`🎯 User ${billPayment.userId} has 3 on-time payments`);
        
        const eligible = await checkRewardEligibility(billPayment.userId);
        if (eligible) {
          console.log(`🎉 Generating reward for user ${billPayment.userId}`);
          
          const reward = await generateReward(billPayment.userId, bills.slice(0, 3));
          await markRewardGiven(billPayment.userId);
          
          console.log(`✅ Reward generated successfully:`, {
            userId: billPayment.userId,
            rewardId: reward.id,
            rewardType: reward.type,
            rewardAmount: reward.amount
          });
        } else {
          console.log(`⏳ User ${billPayment.userId} not eligible - recent reward exists`);
        }
      } else {
        console.log(`❌ User ${billPayment.userId} not eligible - not all bills paid on time`);
      }
    } else {
      console.log(`⏳ User ${billPayment.userId} needs ${3 - bills.length} more bills for reward eligibility`);
    }

  } catch (error) {
    console.error('❌ Error processing message:', {
      error: error.message,
      topic,
      partition,
      offset: message.offset
    });
  }
};

// Function to start Kafka consumer with retry logic
const startKafkaConsumer = async () => {
  const maxRetries = 10;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔌 Starting Kafka Consumer (attempt ${retryCount + 1}/${maxRetries})`);
      
      await consumer.connect();
      console.log('✅ Kafka Consumer connected');

      await consumer.subscribe({
        topic: 'bill-payments',
        fromBeginning: false
      });
      console.log('✅ Subscribed to bill-payments topic');

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await handleMessage(topic, partition, message);
        }
      });

      isRunning = true;
      console.log('✅ Kafka Consumer is running and listening for messages');
      return;

    } catch (error) {
      retryCount++;
      console.error(`❌ Kafka Consumer start attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error('❌ Failed to start Kafka Consumer after all retries');
        throw new Error(`Kafka Consumer failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Function to stop Kafka consumer
const stopKafkaConsumer = async () => {
  try {
    if (isRunning) {
      await consumer.disconnect();
      isRunning = false;
      console.log('✅ Kafka Consumer stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping Kafka Consumer:', error);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', stopKafkaConsumer);
process.on('SIGINT', stopKafkaConsumer);

module.exports = {
  startKafkaConsumer,
  stopKafkaConsumer,
  handleMessage
};