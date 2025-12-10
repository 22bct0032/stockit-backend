const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Sign Up
exports.signUp = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (user) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(
        'INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)',
        [fullName, email, hashedPassword],
        function(err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Error creating user'
            });
          }

          const userId = this.lastID;

          // Create wallet for user
          db.run(
            'INSERT INTO wallets (userId, balance) VALUES (?, ?)',
            [userId, parseFloat(process.env.STARTING_BALANCE || 100000)],
            (err) => {
              if (err) {
                console.error('Error creating wallet:', err);
              }
            }
          );

          // Generate JWT token
          const accessToken = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
          );

          const refreshToken = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET,
            { expiresIn: '90d' }
          );

          res.status(201).json({
            success: true,
            message: 'User created successfully',
            access_token: accessToken,
            refresh_token: refreshToken,
            user_id: userId.toString(),
            user_email: email,
            user_fullName: fullName,
            starting_balance: parseFloat(process.env.STARTING_BALANCE || 100000),
            timestamp: new Date().toISOString()
          });
        }
      );
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Sign In
exports.signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '90d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: user.id.toString(),
        user_email: user.email,
        user_fullName: user.fullName,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
