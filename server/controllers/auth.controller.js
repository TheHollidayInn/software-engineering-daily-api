import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import APIError from '../helpers/APIError';
import config from '../../config/config';
import User from '../models/user.model';

/**
 * Returns jwt token if valid username and password is provided
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function login(req, res, next) {
  // Ideally you'll fetch this from the db
  // Idea here was to show how jwt works with simplicity
  if (req.body.username === user.username && req.body.password === user.password) {
    const token = jwt.sign({
      username: user.username
    }, config.jwtSecret);
    return res.json({
      token,
      username: user.username
    });
  }

  const err = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
  return next(err);
}

/**
 * Returns jwt token if valid username and password is provided
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function register(req, res, next) {
  let username = req.body.username;
  let password = req.body.password;

  User
    .findOne({'username': username}).exec()
    .then(function (user) {
      if (user) {
        let err = new APIError('User already exists.', httpStatus.UNAUTHORIZED, true);
        return next(err);
      }

      var newUser = new User();
      newUser.username = username;
      newUser.password = newUser.generateHash(password);

      return newUser.save()
    })
    .then(function (userSaved) {
      let token =  jwt.sign(userSaved.toJSON(), config.jwtSecret, { expiresIn: '40000h' });

      return res.status(201).json({
        user: userSaved,
        token: token,
      });
    })
    .catch(function (err) {
      console.log(err)
      if (err.message === 'User already exists.') {
        return res.status(401).json({
          message: err.message,
        });
      }
      // return res.status(400).json({err: err});
      let error = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
      return next(error);
    });
}

/**
 * This is a protected route. Will return random number only if jwt token is provided in header.
 * @param req
 * @param res
 * @returns {*}
 */
function getRandomNumber(req, res) {
  // req.user is assigned by jwt middleware if valid token is provided
  return res.json({
    user: req.user,
    num: Math.random() * 100
  });
}

export default { login, getRandomNumber, register };
