const { Kafka, logLevel } = require('kafkajs');

// Kafka client setup with proper Docker networking
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
  brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'], // Use kafka:9092 for Docker network
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 300,
    retries: 10
  },
  logLevel: logLevel.INFO
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
  retry: {
    retries: 5
  }
});

let isConnected = false;

// Function to connect with enhanced retry logic
const connectProducer = async () => {
  if (isConnected) return;

  const maxRetries = 10;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔌 Connecting to Kafka at ${process.env.KAFKA_BROKERS} (attempt ${retryCount + 1}/${maxRetries})`);
      
      await producer.connect();
      isConnected = true;
      console.log('✅ Kafka Producer connected successfully');
      return;
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Kafka connection attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error('❌ Failed to connect to Kafka after all retries');
        throw new Error(`Kafka connection failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`⏳ Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Function to send message with proper error handling
const sendMessage = async (topic, message) => {
  try {
    // Ensure connection
    await connectProducer();

    const result = await producer.send({
      topic,
      messages: [{
        key: message.userId,
        value: JSON.stringify(message),
        timestamp: Date.now()
      }]
    });

    console.log(`✅ Message sent successfully to topic '${topic}':`, {
      userId: message.userId,
      billId: message.billId,
      partition: result.partition,
      offset: result.baseOffset
    });

    return result;

  } catch (error) {
    console.error(`❌ Failed to send message to Kafka topic '${topic}':`, {
      error: error.message,
      userId: message.userId,
      billId: message.billId
    });
    throw error;
  }
};

// Function to disconnect producer
const disconnectProducer = async () => {
  try {
    if (isConnected) {
      await producer.disconnect();
      isConnected = false;
      console.log('✅ Kafka Producer disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting Kafka Producer:', error);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', disconnectProducer);
process.on('SIGINT', disconnectProducer);

module.exports = {
  sendMessage,
  connectProducer,
  disconnectProducer
};