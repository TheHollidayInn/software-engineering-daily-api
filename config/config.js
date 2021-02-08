import Joi from 'joi';

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .allow(['development', 'production', 'test', 'provision'])
    .default('development'),
  BASE_URL: Joi.string()
    .default('https://www.softwaredaily.com'),
  SEND_GRID_KEY: Joi.string().required(),
  PORT: Joi.number()
    .default(4040),
  MONGOOSE_DEBUG: Joi.boolean()
    .when('NODE_ENV', {
      is: Joi.string().equal('development'),
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false)
    }),
  JWT_SECRET: Joi.string().required()
    .description('JWT Secret required to sign'),
  MONGO_HOST: Joi.string().required()
    .description('Mongo DB host url'),
  MONGO_HOST_TEST: Joi.string()
    .description('Mongo DB test host url'),
  MONGO_PORT: Joi.number()
    .default(27017),
  MONGO_COLLECTION_PREFIX: Joi.string().default('')
    .description('Prefix used in all collection names'),
  MAILCHIMP_KEY: Joi.string().required()
    .description('Mailchimp API key'),
  MAILCHIMP_LIST_ID: Joi.string().required()
    .description('Mailchimp list id'),
  RECAPTCHA_SITE_KEY: Joi.string().required()
    .description('Recaptcha site key'),
  RECAPTCHA_SECRET_KEY: Joi.string().required()
    .description('Recaptcha secret key'),
  AWS_PROFILE_PIC_BUCKET_NAME: Joi.string().required()
    .description('S3 bucket for storing profile pictures'),
  EMAIL_FROM_ADDRESS: Joi.string().required()
    .description('Email address listed in FROM section of emails')
}).unknown()
  .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  baseUrl: envVars.BASE_URL,
  sendGridKey: envVars.SEND_GRID_KEY,
  mongooseDebug: envVars.MONGOOSE_DEBUG,
  jwtSecret: envVars.JWT_SECRET,
  mongo: {
    host: envVars.MONGO_HOST,
    test: envVars.MONGO_HOST_TEST,
    port: envVars.MONGO_PORT,
    collectionPrefix: envVars.MONGO_COLLECTION_PREFIX ? `${envVars.MONGO_COLLECTION_PREFIX}-` : ''
  },
  mailchimp: {
    mailchimpKey: envVars.MAILCHIMP_KEY,
    mailchimpList: envVars.MAILCHIMP_LIST_ID
  },
  recaptcha: {
    siteKey: envVars.RECAPTCHA_SITE_KEY,
    secretKey: envVars.RECAPTCHA_SECRET_KEY
  },
  aws: {
    profilePicBucketName: envVars.AWS_PROFILE_PIC_BUCKET_NAME,
    topicBucketName: envVars.AWS_TOPIC_BUCKET_NAME,
  },
  email: {
    fromAddress: envVars.EMAIL_FROM_ADDRESS
  },
  cron: {
    RSS: {
      time: '30 2 * * *',
      timeZone: 'America/Los_Angeles'
    }
  }
};

export default config;
