require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ userId: 'TESTSTUD' });
        if (user) {
            console.log('✅ Found User:', user.userId);
            console.log('Hashed Password in DB:', user.password);
            
            // Test if '112233' matches
            const isMatch = await user.matchPassword('112233');
            console.log('Does "112233" match?', isMatch);
        } else {
            console.log('❌ User TESTSTUD not found!');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUser();
