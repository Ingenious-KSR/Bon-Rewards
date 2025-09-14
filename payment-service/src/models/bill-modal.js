const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  billId: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paymentDate: { type: Date, required: true },
  billType: { type: String, default: 'credit-card' },
  isPaidOnTime: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now }
});

billSchema.index({ userId: 1, billId: 1 }, { unique: true });

module.exports = mongoose.model('Bill', billSchema);