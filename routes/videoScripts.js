const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const VideoScript = require('../models/videoScript')
const VideoIdea = require('../models/videoIdea')
const OpenAI = require('openai')

// Initialize OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
// Generate script prompt based on video idea
const generateScriptPrompt = (videoIdea) => {
  return `Write a detailed YouTube video script for the following idea:

Title: ${videoIdea.title}
Description: ${videoIdea.description}
Target Audience: ${videoIdea.engagement.targetAudience}

Please structure the script with:
1. An engaging hook/introduction (30 seconds)
2. Main content that covers these key points (2 minutes):
   ${videoIdea.targetKeywords.map((kw) => `- ${kw}`).join('\n   ')}
3. A compelling call to action (30 seconds)

Ensure the script is conversational, engaging, and optimized for YouTube.
`
}

// POST /api/video-scripts/generate
router.post('/video-scripts/generate', auth, async (req, res) => {
  try {
    //this id from videoIdeas model
    const { videoIdeaId } = req.body

    // Check if user is paid user
    if (!req.user.isPaidUser) {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for paid users',
      })
    }

    // Fetch video idea
    const videoIdea = await VideoIdea.findOne({
      _id: videoIdeaId,
      createdBy: req.user.userId,
    })

    if (!videoIdea) {
      return res.status(404).json({
        success: false,
        error: 'Video idea not found',
      })
    }

    // Generate script using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: generateScriptPrompt(videoIdea),
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    })

    const scriptContent = completion.choices[0].message.content.trim()

    // Parse script sections
    const sections = scriptContent.split('\n\n')
    const hook = sections[0]
    const mainContent = sections.slice(1, -1).join('\n\n')
    const callToAction = sections[sections.length - 1]

    // Format the response without saving to database
    const scriptResponse = {
      title: videoIdea.title,
      content: {
        hook,
        mainContent,
        callToAction,
      },
      estimatedDuration: 180, // 3 minutes in seconds
      metadata: {
        targetAudience: videoIdea.engagement.targetAudience,
        keyPoints: videoIdea.targetKeywords,
      },
    }

    res.json({
      success: true,
      data: scriptResponse,
    })
  } catch (error) {
    console.error('Error generating video script:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate video script',
    })
  }
})

// GET /api/video-scripts
// router.get('/video-scripts', auth, async (req, res) => {
//   try {
//     const {
//       videoIdeaId,
//       status,
//       format,
//       limit = 10,
//       page = 1,
//       startDate,
//       endDate,
//     } = req.query

//     const query = { createdBy: req.user.userId }

//     // Add filters
//     if (videoIdeaId) query.videoIdeaId = videoIdeaId
//     if (status) query.status = status
//     if (format) query.format = format

//     // Add date range filter
//     if (startDate || endDate) {
//       query.createdAt = {}
//       if (startDate) query.createdAt.$gte = new Date(startDate)
//       if (endDate) query.createdAt.$lte = new Date(endDate)
//     }

//     const scripts = await VideoScript.find(query)
//       .populate('videoIdeaId', 'title description')
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit))

//     const total = await VideoScript.countDocuments(query)

//     res.json({
//       success: true,
//       data: scripts,
//       pagination: {
//         total,
//         page: Number(page),
//         pages: Math.ceil(total / limit),
//       },
//     })
//   } catch (error) {
//     console.error('Error fetching video scripts:', error)
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch video scripts',
//     })
//   }
// })

// GET /api/video-scripts/:id
// router.get('/video-scripts/:id', auth, async (req, res) => {
//   try {
//     const script = await VideoScript.findOne({
//       _id: req.params.id,
//       createdBy: req.user.userId,
//     }).populate('videoIdeaId', 'title description')

//     if (!script) {
//       return res.status(404).json({
//         success: false,
//         error: 'Script not found',
//       })
//     }

//     res.json({
//       success: true,
//       data: script,
//     })
//   } catch (error) {
//     console.error('Error fetching video script:', error)
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch video script',
//     })
//   }
// })

module.exports = router
