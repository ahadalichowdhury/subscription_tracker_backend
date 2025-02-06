const mongoose = require('mongoose')

const videoScriptSchema = new mongoose.Schema(
  {
    videoIdeaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoIdea',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      hook: {
        type: String,
        required: true,
      },
      mainContent: {
        type: String,
        required: true,
      },
      callToAction: {
        type: String,
        required: true,
      },
    },
    estimatedDuration: {
      type: Number, // Duration in seconds
      required: true,
    },
    format: {
      type: String,
      enum: ['standard', 'interview', 'tutorial'],
      default: 'standard',
    },
    status: {
      type: String,
      enum: ['draft', 'final', 'archived'],
      default: 'draft',
    },
    version: {
      type: Number,
      default: 1,
    },
    metadata: {
      targetAudience: String,
      keyPoints: [String],
      resources: [String],
    },
  },
  {
    timestamps: true,
  }
)

// Create indexes for efficient querying
videoScriptSchema.index({ videoIdeaId: 1, createdBy: 1 })
videoScriptSchema.index({ createdAt: -1 })

const VideoScript = mongoose.model('VideoScript', videoScriptSchema)

module.exports = VideoScript
