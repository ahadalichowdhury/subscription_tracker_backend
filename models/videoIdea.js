const mongoose = require('mongoose')

const videoIdeaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    targetKeywords: [
      {
        type: String,
      },
    ],
    relatedTrends: [
      {
        type: String,
      },
    ],
    category: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    engagement: {
      estimatedViews: Number,
      targetAudience: String,
    },
    sourceData: {
      trendingTopics: [String],
      youtubeVideos: [
        {
          videoId: String,
          title: String,
          viewCount: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
)

const VideoIdea = mongoose.model('VideoIdea', videoIdeaSchema)

module.exports = VideoIdea
