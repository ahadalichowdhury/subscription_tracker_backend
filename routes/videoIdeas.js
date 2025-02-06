const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const VideoIdea = require('../models/videoIdea')
const GoogleTrends = require('../models/googleTrends')
const TrendingVideo = require('../models/trandingVideo')
const { generateVideoIdeas } = require('../services/openaiService')

// POST /api/video-ideas/generate
router.post('/video-ideas/generate', auth, async (req, res) => {
  try {
    // Check if user is paid user
    if (!req.user.isPaidUser) {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for paid users',
      })
    }

    let { region = 'US' } = req.body

    // Fetch current trends data
    const [googleTrends, youtubeTrends] = await Promise.all([
      GoogleTrends.find({ region }).sort({ searchVolume: -1 }).limit(10),
      TrendingVideo.find({ region }).sort({ viewCount: -1 }).limit(10),
    ])

    // Generate video ideas using OpenAI
    const videoIdeas = await generateVideoIdeas({
      googleTrends,
      youtubeTrends,
    })

    // Validate and store generated ideas in database
    const savedIdeas = await Promise.all(
      videoIdeas
        .filter((idea) => idea.title && idea.description)
        .map(async (idea) => {
          const videoIdea = new VideoIdea({
            ...idea,
            createdBy: req.user.userId,
            category: 'AI_GENERATED',
            sourceData: {
              trendingTopics: googleTrends.map((t) => t.keyword),
              youtubeVideos: youtubeTrends.map((v) => ({
                videoId: v.videoId,
                title: v.title,
                viewCount: v.viewCount,
              })),
            },
          })
          return videoIdea.save()
        })
    )

    res.json({
      success: true,
      data: savedIdeas,
    })
  } catch (error) {
    console.error('Error generating video ideas:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate video ideas',
    })
  }
})

// GET /api/video-ideas
router.get('/video-ideas', auth, async (req, res) => {
  try {
    const {
      status,
      limit = 10,
      page = 1,
      category,
      topic,
      startDate,
      endDate,
    } = req.query

    const query = { createdBy: req.user.userId }

    // Add filters based on query parameters
    if (status) {
      query.status = status
    }

    if (category) {
      query.category = category
    }

    if (topic) {
      query.$or = [
        { 'sourceData.trendingTopics': { $regex: topic, $options: 'i' } },
        { targetKeywords: { $regex: topic, $options: 'i' } },
      ]
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate)
      }
    }

    const ideas = await VideoIdea.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    const total = await VideoIdea.countDocuments(query)

    res.json({
      success: true,
      data: ideas,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching video ideas:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video ideas',
    })
  }
})

module.exports = router
