const Subscription = require('../models/Subscription')
const { OpenAI } = require('openai')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const path = require('path')
const fs = require('fs')
const csv = require('csv-parser')
const Tesseract = require('tesseract.js')

// Function to handle CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const transactions = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        transactions.push(row) // Push each row to transactions
      })
      .on('end', () => {
        resolve(transactions)
      })
      .on('error', (err) => reject(err))
  })
}

// Function to handle PDF file using Tesseract OCR
const parsePDF = (filePath) => {
  return new Promise((resolve, reject) => {
    Tesseract.recognize(filePath, 'eng', {
      logger: (m) => console.log(m),
    })
      .then(({ data: { text } }) => {
        resolve(text) // Extracted text from the PDF
      })
      .catch((err) => reject(err))
  })
}

// Helper function to process both CSV and PDF formats
const extractSubscriptionsFromFile = async (file) => {
  const fileType = path.extname(file.originalname).toLowerCase()

  if (fileType === '.csv') {
    const transactions = await parseCSV(file.path)
    return transactions // Return CSV data
  } else if (fileType === '.pdf') {
    const extractedText = await parsePDF(file.path)
    return extractedText // Return extracted text from PDF
  }

  throw new Error('Unsupported file type')
}

// Function to analyze recurring payments in CSV data
const analyzeRecurringPayments = (transactions) => {
  const recurringPayments = []
  const seenTransactions = {} // To track recurring payments by name and amount

  transactions.forEach((transaction) => {
    const { name, amount, renewalDate, billingCycle } = transaction
    const key = `${name}-${amount}`

    if (seenTransactions[key]) {
      // If a transaction with the same name and amount already exists, it's recurring
      recurringPayments.push({ name, amount, renewalDate, billingCycle })
    } else {
      // Otherwise, mark it as seen
      seenTransactions[key] = true
    }
  })

  return recurringPayments
}

// Function to analyze recurring payments in OCR text
const analyzeOCRTextForRecurringPayments = (extractedText) => {
  const recurringPayments = []
  const lines = extractedText.split('\n')

  lines.forEach((line) => {
    // Detect recurring keywords (e.g., monthly, subscription)
    if (
      line.includes('monthly') ||
      line.includes('subscription') ||
      line.includes('recurring')
    ) {
      const paymentDetails = extractPaymentDetailsFromText(line) // Function to extract details from the line
      if (paymentDetails) {
        recurringPayments.push(paymentDetails)
      }
    }
  })

  return recurringPayments
}

// Extract payment details from OCR text
const extractPaymentDetailsFromText = (line) => {
  // Implement logic to parse the line for name, amount, renewal date, and billing cycle
  const name = extractNameFromText(line) // Define this function based on your text format
  const amount = extractAmountFromText(line) // Define this function based on your text format
  const renewalDate = extractRenewalDateFromText(line) // Define this function based on your text format
  const billingCycle = 'monthly' // Default, you can improve this

  if (name && amount) {
    return { name, amount, renewalDate, billingCycle }
  }
  return null
}

// Process the file and save subscriptions
exports.processBankStatement = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const transactions = await extractSubscriptionsFromFile(req.file)

    let recurringPayments = []

    if (Array.isArray(transactions)) {
      // If it's a CSV, analyze for recurring payments
      recurringPayments = analyzeRecurringPayments(transactions)
    } else if (typeof transactions === 'string') {
      // If it's a PDF (OCR text), analyze for recurring payments
      recurringPayments = analyzeOCRTextForRecurringPayments(transactions)
    }

    // Save recurring payments as subscriptions
    const subscriptionPromises = recurringPayments.map(async (payment) => {
      const { name, amount, renewalDate, billingCycle } = payment

      const subscription = new Subscription({
        userId: req.user.userId,
        name,
        amount,
        currency: 'USD', // Assuming default USD currency for now
        renewalDate,
        billingCycle,
      })

      await subscription.save()
    })

    await Promise.all(subscriptionPromises)

    res.status(200).json({
      message: 'Bank statement processed and subscriptions saved successfully',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: 'Error processing the bank statement',
      error: error.message,
    })
  }
}

exports.createSubscription = async (req, res) => {
  try {
    const { name, amount, currency, renewalDate, billingCycle } = req.body

    // AI-powered category suggestion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Categorize this subscription into one of these categories: Entertainment, Productivity, Business, Other. Only respond with the category name.`,
        },
        { role: 'user', content: `Service name: ${name}` },
      ],
    })

    const suggestedCategory = completion.choices[0].message.content.trim()

    const subscription = new Subscription({
      userId: req.user.userId,
      name,
      amount,
      currency,
      renewalDate,
      billingCycle,
      category: suggestedCategory,
      notificationSettings: { reminderDays: 7, methods: ['email'] },
    })

    await subscription.save()

    res
      .status(201)
      .json({ message: 'Subscription created successfully', subscription })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error creating subscription', error: error.message })
  }
}

exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user.userId })
    res.json({ subscriptions })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching subscriptions', error: error.message })
  }
}

exports.getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' })
    }

    res.json({ subscription })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching subscription', error: error.message })
  }
}

exports.updateSubscription = async (req, res) => {
  try {
    const updates = req.body
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updates,
      { new: true }
    )

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' })
    }

    res.json({ message: 'Subscription updated successfully', subscription })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating subscription', error: error.message })
  }
}

exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' })
    }

    res.json({ message: 'Subscription deleted successfully', subscription })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting subscription', error: error.message })
  }
}
