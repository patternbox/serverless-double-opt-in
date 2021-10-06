'use strict';

const aws = require('aws-sdk');
const crypto = require('crypto');

const s3  = new aws.S3();
const ssm = new aws.SSM();
const ses = new aws.SES();
const doc = new aws.DynamoDB.DocumentClient();

const INACTIVE_REC_TTL_DAYS = 14;
const ACTIVE_REC_TTL_DAYS = 99 * 365;

/**
 * Create response object
 */
function response(statusCode, message) {
   return {
      statusCode: statusCode,
      body: JSON.stringify({ message: message }),
   };
}

function docParams(data) {
   return {
      TableName : process.env.ddbTable,
      Key : {
         userId: data.userId,
      },
   };
}

/**
 * Create SHA256 hash
 */
async function sha256(message) {

   const params = {
      Name: process.env.ssmSecret, 
      WithDecryption: true,
   };

   const ssmParam = await ssm.getParameter(params).promise();

   return crypto.createHmac('sha256', ssmParam.Parameter.Value).update(message).digest('hex');
}

/**
 * Write audit trail to S3 bucket
 */
async function writeAuditTrail(data, action) {

   const iso = new Date().toISOString();
   const timestamp = iso.slice(0, 19).replace(/-/g, '').replace(/:/g, '');

   const params = {
      Bucket: process.env.s3bucket,
      Key: process.env.s3prefix + data.userId + '/' + timestamp + '-' + action + '.json',
      Body: JSON.stringify(data),
      ContentType: 'application/json',
   };

   return s3.putObject(params).promise();
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(data) {

   const templateData = {
      confirmationURL: 'https://' + process.env.hostName + '/confirmDoubleOptIn/' + data.userId + '/' + data.confirmToken,
   };

   const params = {
      Source: process.env.emailSource,
      Template: 'double-opt-in',
      Destination: {
         ToAddresses: [ data.email ],
      },
      TemplateData: JSON.stringify(templateData),
   };

   return ses.sendTemplatedEmail(params).promise();
}

/**
 * Put opt-in record into DynamoDB
 */
async function putOptInRecord(data) {

   const rec = {
      userId: data.userId,
      doubleOptInActive: false,
      expirationTimeTTL: Math.floor(Date.now() / 1000) + (INACTIVE_REC_TTL_DAYS * 24 * 60 * 60),
      email: data.email,
      confirmToken: data.confirmToken,
   };

   const params = {
      TableName : process.env.ddbTable,
      Item : rec,
      ConditionExpression: 'attribute_not_exists(userId)',
   };

   try {
      await doc.put(params).promise();
      return response(201, 'Record created.');
   } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
         return response(409, 'DoubleOptIn record already exists.');
      } else {
         throw err;
      }
   }
}

/**
 * Update opt-in record in DynamoDB
 */
async function updateOptInRecord(data) {

   const rec = await doc.get(docParams(data)).promise();
   if (!Object.keys(rec).length) {
      return response(404, 'UserId not found.');
   }

   const params = docParams(data);
   params.ConditionExpression = 'confirmToken = :confirmToken';
   params.UpdateExpression = 'SET doubleOptInActive = :active, expirationTimeTTL = :ttl, revokeToken = :revokeToken';
   params.ExpressionAttributeValues = {
      ':active': true,
      ':ttl': Math.floor(Date.now() / 1000) + (ACTIVE_REC_TTL_DAYS * 24 * 60 * 60),
      ':confirmToken': data.confirmToken,
      ':revokeToken': crypto.randomBytes(16).toString('hex')
   };

   //console.log(JSON.stringify(params));
   try {
      await doc.update(params).promise();
      return response(202, 'Record updated.');
   } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
         return response(403, 'Invalid confirmation token.');
      } else {
         throw err;
      }
   }
}

/**
 * Remove opt-in record in DynamoDB
 */
async function removeOptInRecord(data) {

   const rec = await doc.get(docParams(data)).promise();
   if (!Object.keys(rec).length) {
      return response(404, 'UserId not found.');
   }

   const params = docParams(data);
   params.ConditionExpression = 'revokeToken = :token';
   params.ExpressionAttributeValues = {
      ':token': data.revokeToken
   };

   try {
      await doc.delete(params).promise();
      return response(202, 'Record removed.');
   } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
         return response(403, 'Invalid confirmation token.');
      } else {
         throw err;
      }
   }
}

/**
 * Lambda function entrance: double-opt-in-initiate
 */
exports.initiate = async (event, context, callback) => {

   // console.log(JSON.stringify(event));
   const email = JSON.parse(event.body).email;

   const data = {
      userId: await sha256(email),
      confirmToken: crypto.randomBytes(16).toString('hex'),
   };

   await writeAuditTrail(data, 'initiateDoubleOptIn');

   data.email = email;

   const response = await putOptInRecord(data);
   if (response.statusCode >= 200 && response.statusCode < 300) {
      await sendConfirmationEmail(data);
   }

   callback(null, response);
};

/**
 * Lambda function entrance: double-opt-in-confirm
 */
exports.confirm = async (event, context, callback) => {

   //console.log(JSON.stringify(event));
   const data = {
      userId: event.pathParameters.userId,
      confirmToken: event.pathParameters.confirmToken,
      sourceIp: event.requestContext.http.sourceIp,
   };

   await writeAuditTrail(data, 'confirmDoubleOptIn');

   const response = await updateOptInRecord(data);
   callback(null, response);
};

/**
 * Lambda function entrance: double-opt-in-revoke
 */
exports.revoke = async (event, context, callback) => {

   const data = {
      userId: event.pathParameters.userId,
      revokeToken: event.pathParameters.revokeToken,
   };

   await writeAuditTrail(data, 'revokeDoubleOptIn');
   const response = await removeOptInRecord(data);
   callback(null, response);
};

