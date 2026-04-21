require('dotenv').config();
const axios = require('axios');

const testRegistration = async () => {
    try {
        const payload = {
            name: "Test User",
            email: "test_new_" + Date.now() + "@campus.edu",
            dept: "IT",
            password: "password123"
        };
        console.log('Sending request to http://localhost:5000/api/auth/register with payload:', payload);
        const res = await axios.post('http://localhost:5000/api/auth/register', payload);
        console.log('✅ Registration SUCCESS:', res.data.user.userId);
    } catch (err) {
        console.error('❌ Registration FAILED:', err.response?.data || err.message);
    }
};

testRegistration();
