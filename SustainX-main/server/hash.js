const bcrypt = require('bcryptjs');

// This script hashes a password for use in your database or seeds.
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('------------------------------');
    console.log('Original Password:', password);
    console.log('Hashed Password:', hash);
    console.log('------------------------------');
    return hash;
  } catch (err) {
    console.error('Error hashing password:', err);
  }
};

// Replace '123456' with whatever password you want to hash
hashPassword('123456');