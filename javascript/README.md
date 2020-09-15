# TendoPay SDK for Node

TendoPay Client SDK to integrate the TendoPay payment solution with your own Ecommerce.

---

- [Requirements](#requirements)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [FAQ](#faq)


## Requirements
- [Nodejs](https://nodejs.org/) ^8.0.0
- [dotenv](https://www.npmjs.com/package/dotenv) ^8.0.0



## Features

- Make a purchase and securely and redirect the payment to the TendoPay platform.
- Get purchase information as a callback.


## Installation

```javascript
npm install tendopay --save
````

Or

```javascript
yarn add tendopay
```

Identify your E-Commerce by adding the following to your .env

```text
## Merchant and client Credentials
## For sandbox API credentials login to: https://sandbox.tendopay.ph/merchants/login
## For Production API Credentials login to: https://app.tendopay.ph/merchants/login
MERCHANT_ID=
MERCHANT_SECRET=
CLIENT_ID=
CLIENT_SECRET=

## Redirect URI when the transaction succeeds
REDIRECT_URL=

## Redirect URI when the transaction fails
ERROR_REDIRECT_URL=

## To enable sandbox mode uncomment SANDBOX_HOST_URL
#SANDBOX_HOST_URL=https://sandbox.tendopay.ph


#API
## to generate token for sandbox login to: https://sandbox.tendopay.ph/merchants/login
## to generate token for production to: https://app.tendopay.ph/merchants/login
MERCHANT_PERSONAL_ACCESS_TOKEN=
```

## Usage

*Make sure to properly handle Promise rejections in the following implementations*

### Setup
Start by creating the TendoPayClient that you will later use to communicte with the TendoPay platform.
```javascript
const tendopay = require('tendopay');

const TendoPayClient = tendopay.Client;
const tendoPayClient = new TendoPayClient();
```

### 1. Make a purchase

To redirect the user to the TendoPay platform with the proper credentials and purchase information, you need to generate the unique TendoPayURL hash.

`Payment(...)` is a method from the root module, and returns an instance of a TendoPay Payment that will be used below to generate the URL.
`getTendoPayURL(...)` is an async method from the TendoPayClient, and returns the generated URL from the latter's payment property.

- Example Implementation

```javascript
const orderId = '#123123123123';
const orderPrice = 999;
const orderAmount = +orderPrice;
const orderTitle = 'Test Order #1';

const tendoPayPayment = new tendopay.Payment({
  orderId,
  requestAmount: orderAmount,
  description: orderTitle
});

tendoPayClient.payment = tendoPayPayment;

redirect(await tendoPayClient.getTendoPayURL());
```

### 2. Handle the TendoPay callback

Once the TendoPay platform has handled the payment request, it will redirect to your website with a callback.
You should add a handler for that callback in the `REDIRECT_URL` GET route specified in your .env.

`isCallbackRequest(...)` is a method from the TendoPayClient, and will assert if the received GET request is legitimate.
`verifyTransaction(...)` is an async method from the TendoPayClient, and will make sure the request you POSTed to the TendoPay platform, and the response you received are aligned.
`VerifyTransactionRequest(...)` is a method from the root module, and creates a request instance readable by the TendoPay API.

- Example Implementation

```javascript
if (TendoPayClient.isCallbackRequest({request: req})) {
  const transaction = await tendoPayClient.verifyTransaction({
    merchantOrderId,
    verificationRequest: new tendopay.VerifyTransactionRequest({
      requestParams: req.query
    })
  });

  res.json({
    success: transaction.isVerified(),
    query: req.query
  });
} else {
  res.json({
    error: 'Not a callback request'
  });
}
```

### 3. Notify the TendoPay platform about the purchase

When you have received and processed the TendoPay response, you need to let the platform know the status of the purchase.

`NotifyRequest(...)` is a method from the root module, and will create a TendoPay ready request instance.
`getTransactionDetail(...)` is an async method from the TendoPayClient and will return the information you need about the payment.

- Example Implementation

```javascript
const {transactionNumber} = new tendopay.NotifyRequest(req.body);
const {merchantId, merchantOrderId, amount, status} =
await tendoPayClient.getTransactionDetail(transactionNumber);

console.log({merchantId, merchantOrderId, amount, status});
// Search Merchant side transaction by merchantOrderId
// Check if the transaction is already processed
// The process should stop here if this transaction is already done.
// return 200 if this is a duplicated notification

switch (status) {
case tendopay.Constants.values.PURCHASE_TRANSACTION_SUCCESS:
  // The transaction is successfully completed
  // Do merchant job here
  break;
  case tendopay.Constants.values.PURCHASE_TRANSACTION_FAILURE:
  // The transaction is unsuccessfully completed.
  // Do merchant job here
  break;
  case tendopay.Constants.values.CANCEL_TRANSACTION_SUCCESS:
  // the previous transaction is successfully cancelled
  // Do merchant job here
  break;
}

res.status(200).json();
```

### 4. Request a cancellation of the purchase

If a purchase is eligible (see terms & conditions), you can use the Javascript SDK to request its cancellation.

`cancelTransaction(...)` is an async method from the TendoPayClient, and will  request the cancellation from the TendoPay platform provided a transaction ID.

- Example Implementation

```javascript
const transactionNumber = 'TEST-OID-123324567890';
const {status, message} = await tendoPayClient.cancelTransaction({ transactionNumber });

console.log({status, message});

switch (status) {
  case 200:
  // The transaction has been successfully cancelled
  // Do merchant job here
  break;
  default:
  // There was an issue cancelling the transaction
  // Do merchant job here
  break;
}
```

## FAQ

I'm having issues using the SDK, where can I get support ?
- Contact us at [support@tendopay.ph](mailto:support@tendopay.ph).

Help! I can't find the credentials for the .env file ?
- Make an account on the [production portal](https://app.tendopay.ph/merchants/api-settings), or in the [sandbox portal](https://sandbox.tendopay.ph/merchants/api-settings) if you're in development phase.

Can I use this SDK on the client side ?
- The TendoPay SDK should ONLY be used on the server side. Revealing your merchant credentials to the public might endanger your merchant account by allowing people to hack and create fake purchases.

I'm a bit lost, can I get an example ?
- Head to our [Example repository](https://github.com/TendoPayPlugins/tendopay-sdk-examples) and download the server sample we created using [Expressjs](https://expressjs.com/).
