const express = require('express')
const router = express.Router()
const YouTubeAnalyticsService = require('../services/youtubeAnalyticsService')

// Get public analytics for a specific video
router.get('/video', async (req, res) => {
  try {
    const { videoUrl } = req.query

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'YouTube video URL is required',
      })
    }

    // Extract video ID from YouTube URL
    let videoId
    try {
      const url = new URL(videoUrl)
      if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v')
      } else if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.slice(1)
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL format',
      })
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract video ID from URL',
      })
    }

    const analytics = await YouTubeAnalyticsService.getPublicStats(videoId)

    res.json({
      success: true,
      data: analytics,
    })
  } catch (error) {
    console.error('Error fetching video analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video analytics',
    })
  }
})

module.exports = router
