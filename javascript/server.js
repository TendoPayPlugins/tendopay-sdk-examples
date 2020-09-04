require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const tendopay = require('tendopay');
const { statusSuccess } = require('../lib/constants/values');

const TendoPayClient = tendopay.Client;
const tendoPayClient = new TendoPayClient(true);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.redirect('/cart');
});

app.use('/cart', express.static('cart.html'));
app.use('/transaction/:id', express.static('cancel.html'));

const merchantOrderId = 'TEST-OID-123324567890';

app.get('/purchase', async (req, res) => {
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
});

app.post('/purchase', async (req, res, next) => {
  try {
    const orderAmount = +req.body.price || 0;
    const orderTitle = 'Test Order #1';

    const tendoPayPayment = new tendopay.Payment({
      merchantOrderId,
      requestAmount: orderAmount,
      description: orderTitle
    });

    tendoPayClient.payment = tendoPayPayment;

    res.redirect(await tendoPayClient.getTendoPayURL());
  } catch (err) {
    console.error(err)
    res.status(err.statusCode)
    res.json({ error: err.data })
  }
});

app.post('/cancel', async (req, res, next) => {
  try {
    const transactionNumber = req.body.transaction
    const response = await tendoPayClient.cancelTransaction({ transactionNumber });

    res.json({
      ...response,
      status: statusSuccess
    });
  } catch (err) {
    console.error(err)
    res.status(err.statusCode)
    res.json({ error: err.data })
  }
});

app.post('/notify', async (req, res) => {
  try {
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
  } catch (e) {
    console.error({e})
    const {statusCode, data} = e
    res.status(statusCode || 500).json(data || 'Unknown error');
  }
});

app.listen(8000, () => {
  console.log('App listening http://localhost:8000');
});
