const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['student', 'collector', 'admin'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // email is NOT unique — multiple collectors can share the same email.
    // Login uses userId (which IS unique), not email.
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: false, // explicitly no index — prevents accidental unique constraint
    },
    dept: {
      type: String,
      default: '',
    },
    // block is required for collectors, optional for others
    block: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
      default: null,
      validate: {
        validator: function (v) {
          // If role is collector, block must be set
          if (this.role === 'collector') return !!v;
          return true;
        },
        message: 'Block is required for collectors',
      },
    },
    avatar: {
      type: String,
      default: null,
    },
    rewardPoints: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
