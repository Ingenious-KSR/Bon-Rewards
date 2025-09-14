const Bill = require('../models/bill-modal');
const User = require('../models/user-modal');
const { sendMessage } = require('../kafka/producer');

const payBill = async (req, res) => {
  try {
    const { userId, billId, amount, dueDate, paymentDate, billType } = req.body;

    // Basic validation
    if (!userId || !billId || !amount || !dueDate || !paymentDate) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'billId', 'amount', 'dueDate', 'paymentDate']
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Check if user exists, create if not
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, name: `User ${userId}` });
      await user.save();
      console.log(`✅ Created new user: ${userId}`);
    }

    // Check if bill already exists
    const existingBill = await Bill.findOne({ userId, billId });
    if (existingBill) {
      return res.status(409).json({ 
        error: 'Bill already paid',
        message: 'This bill has already been processed'
      });
    }

    // Create bill payment record
    const isPaidOnTime = new Date(paymentDate) <= new Date(dueDate);
    
    const newBill = new Bill({
      userId,
      billId,
      amount,
      dueDate: new Date(dueDate),
      paymentDate: new Date(paymentDate),
      billType: billType || 'credit-card',
      isPaidOnTime
    });

    // Save to database
    await newBill.save();
    console.log(`✅ Bill payment saved to MongoDB:`, {
      userId,
      billId,
      amount,
      isPaidOnTime
    });

    // Publish to Kafka
    const kafkaMessage = {
      userId,
      billId,
      amount,
      dueDate: newBill.dueDate.toISOString(),
      paymentDate: newBill.paymentDate.toISOString(),
      billType: newBill.billType,
      isPaidOnTime,
      timestamp: new Date().toISOString()
    };

    try {
      await sendMessage('bill-payments', kafkaMessage);
      console.log(`✅ Bill payment event published to Kafka`);
    } catch (kafkaError) {
      // Log Kafka error but don't fail the request
      console.error('❌ Failed to publish to Kafka:', kafkaError.message);
      // In production, you might want to queue this for retry
    }

    res.status(201).json({
      message: 'Bill payment processed successfully',
      bill: {
        id: newBill._id,
        userId: newBill.userId,
        billId: newBill.billId,
        amount: newBill.amount,
        dueDate: newBill.dueDate,
        paymentDate: newBill.paymentDate,
        billType: newBill.billType,
        isPaidOnTime: newBill.isPaidOnTime
      }
    });

  } catch (error) {
    console.error('❌ Error processing bill payment:', error);
    res.status(500).json({
      error: 'Failed to process bill payment',
      message: error.message
    });
  }
};

const getUserBills = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const bills = await Bill.find({ userId })
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Bill.countDocuments({ userId });

    res.json({
      bills,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user bills:', error);
    res.status(500).json({
      error: 'Failed to fetch bills',
      message: error.message
    });
  }
};

const getRecentBills = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = 3;

    const recentBills = await Bill.find({ userId })
      .sort({ paymentDate: -1 })
      .limit(limit);

    const allPaidOnTime = recentBills.length === 3 && 
      recentBills.every(bill => bill.isPaidOnTime);

    res.json({
      userId,
      recentBills,
      count: recentBills.length,
      allPaidOnTime,
      eligibleForReward: allPaidOnTime
    });

  } catch (error) {
    console.error('❌ Error fetching recent bills:', error);
    res.status(500).json({
      error: 'Failed to fetch recent bills',
      message: error.message
    });
  }
};

module.exports = {
  payBill,
  getUserBills,
  getRecentBills
};