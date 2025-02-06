const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { google } = require('googleapis')

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

// Get keyword statistics and related terms
router.get('/analyze', auth, async (req, res) => {
  try {
    const { keyword } = req.query

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'Keyword is required',
      })
    }

    // Get search statistics using YouTube API
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: keyword,
      type: 'video',
      maxResults: 25, // Fetch enough results to analyze patterns
    })

    // Calculate approximate search volume based on view counts
    let totalViews = 0
    const videoIds = searchResponse.data.items.map((item) => item.id.videoId)

    const videosResponse = await youtube.videos.list({
      part: ['statistics', 'snippet'],
      id: videoIds.join(','),
    })

    // Extract and process related keywords with their total occurrences
    const keywordOccurrences = {}
    let totalKeywordOccurrences = 0

    // Common words to filter out
    const commonWords = new Set([
      'the',
      'and',
      'that',
      'this',
      'with',
      'for',
      'you',
      'was',
      'are',
      'will',
    ])

    videosResponse.data.items.forEach((video) => {
      // Process title
      const title = video.snippet.title.toLowerCase()
      const description = video.snippet.description.toLowerCase()
      const tags = (video.snippet.tags || []).map((tag) => tag.toLowerCase())

      // Combine all text sources
      const allText = `${title} ${description} ${tags.join(' ')}`
      const words = allText.split(/\s+/)

      // Process each word
      words.forEach((word) => {
        // Clean the word
        word = word.replace(/[^\w#]/g, '')

        // Skip if word is too short, common, or part of the search keyword
        if (
          word.length <= 3 ||
          commonWords.has(word) ||
          keyword.toLowerCase().includes(word) ||
          word === ''
        ) {
          return
        }

        // Count occurrences
        keywordOccurrences[word] = (keywordOccurrences[word] || 0) + 1
        totalKeywordOccurrences++
      })

      totalViews += parseInt(video.statistics.viewCount) || 0
    })

    // Calculate average views per video
    const averageViews = Math.round(
      totalViews / videosResponse.data.items.length
    )

    // Prepare response data
    const analysisData = {
      keyword,
      searchVolume: {
        total: totalViews,
        average: averageViews,
        sampleSize: videosResponse.data.items.length,
      },
      relatedKeywords: Object.entries(keywordOccurrences)
        .map(([keyword, total]) => ({
          keyword,
          total,
          percentage: Math.round((total / totalKeywordOccurrences) * 100),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10), // Top 10 related keywords
      topVideos: videosResponse.data.items
        .map((video) => ({
          title: video.snippet.title,
          videoId: video.id,
          publishedAt: video.snippet.publishedAt,
          channelTitle: video.snippet.channelTitle,
          viewCount: video.statistics.viewCount,
        }))
        .slice(0, 5), // Top 5 videos
    }

    // Limit data for free users
    if (!req.user.isPaidUser) {
      analysisData.relatedKeywords = analysisData.relatedKeywords.slice(0, 3)
      analysisData.topVideos = analysisData.topVideos.slice(0, 2)
    }

    res.json({
      success: true,
      data: analysisData,
    })
  } catch (error) {
    console.error('Error analyzing keyword:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze keyword',
    })
  }
})

module.exports = router
