const mongoose = require('mongoose')

const googleTrendsSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['news', 'entertainment', 'sports', 'all'],
    },
    region: {
      type: String,
      required: true,
      default: 'US',
    },
    searchVolume: {
      type: Number,
      required: true,
    },
    relatedQueries: [
      {
        type: String,
      },
    ],
    lastFetched: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Create compound index for efficient querying
googleTrendsSchema.index({ category: 1, region: 1, lastFetched: -1 })

const GoogleTrends = mongoose.model('GoogleTrends', googleTrendsSchema)

module.exports = GoogleTrends
