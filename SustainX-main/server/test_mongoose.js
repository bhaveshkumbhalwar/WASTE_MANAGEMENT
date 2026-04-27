require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testSave = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const timestamp = Date.now();
        const userData = {
            userId: 'NEWSTUDENT' + timestamp.toString().slice(-4),
            password: 'password123',
            role: 'student',
            name: 'New Student',
            email: 'newstudent' + timestamp + '@campus.edu',
            block: 'A'
        };

        console.log('Attempting to create user:', userData);
        const user = await User.create(userData);
        console.log('✅ Successfully created user:', user.userId);

        await User.deleteOne({ _id: user._id });
        console.log('🗑️ Cleaned up test user');
        process.exit(0);
    } catch (err) {
        console.error('❌ Mongoose Error:', err.message);
        if (err.errors) {
            console.error('Validation details:', Object.keys(err.errors).map(key => `${key}: ${err.errors[key].message}`));
        }
        process.exit(1);
    }
};

testSave();

//yiyi