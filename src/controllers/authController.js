const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const apiResponse = require('../utils/apiResponse');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const registerUser = async (req, res) => {
    const { name, email, password, phone, company } = req.body;

    try {
        const userExists = await User.findOne({ where: { email } });

        if (userExists) {
            return apiResponse(res, 400, false, 'User already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            company,
        });

        if (user) {
            return apiResponse(res, 201, true, 'User registered successfully', {
                id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            return apiResponse(res, 400, false, 'Invalid user data');
        }
    } catch (error) {
        console.error(error);
        return apiResponse(res, 500, false, 'Server Error', error.message);
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (user && (await bcrypt.compare(password, user.password))) {
            return apiResponse(res, 200, true, 'Login successful', {
                id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            return apiResponse(res, 401, false, 'Invalid email or password');
        }
    } catch (error) {
        console.error(error);
        return apiResponse(res, 500, false, 'Server Error', error.message);
    }
};

const getMe = async (req, res) => {
    const user = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        company: req.user.company,
    };
    return apiResponse(res, 200, true, 'User profile', user);
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
