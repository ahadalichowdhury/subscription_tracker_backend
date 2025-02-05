const mongoose = require('mongoose')

// Define the schema for the trending video
const trendingVideoSchema = new mongoose.Schema(
  {
    region: {
      type: String,
      required: true,
    },
    videoId: {
      type: String,
      required: true,
      unique: true, // Ensure unique video IDs
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    viewCount: {
      type: Number,
      required: true,
    },
    likeCount: {
      type: Number,
      required: true,
    },
    publishedAt: {
      type: Date,
      required: true,
    },
    lastFetched: {
      type: Date,
      default: Date.now, // Timestamp when the data was last fetched
    },
    tags: [String], // Array of tags
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
)

// Create a model from the schema
const TrendingVideo = mongoose.model('TrendingVideo', trendingVideoSchema)

module.exports = TrendingVideo
