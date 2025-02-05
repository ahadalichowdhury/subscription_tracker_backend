const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const GoogleTrends = require('../models/googleTrends')
const TrendingVideo = require('../models/trandingVideo')
const googleTrends = require('google-trends-api')

// Utility function to parse Google Trends response
// Validate region code using ISO 3166-1 alpha-2 format
const isValidRegion = (region) => {
  // Check if the region code is a 2-letter string
  return /^[A-Z]{2}$/.test(region.toUpperCase())
}

const parseGoogleTrendsResponse = (jsonResponse, category) => {
  try {
    // Check if response is HTML (error page)
    if (jsonResponse.trim().startsWith('<')) {
      console.error('Received HTML response instead of JSON')
      console.log('Raw HTML response:', jsonResponse.substring(0, 200)) // Log first 200 chars of HTML
      return []
    }

    const data = JSON.parse(jsonResponse)
    // console.log(
    //   'Google Trends API Response Structure:',
    //   JSON.stringify(data, null, 2)
    // )

    // Check for different possible response structures
    if (!data) {
      console.error('Empty response from Google Trends API')
      return []
    }

    let rankedKeywords = []

    // Try to find trends data in different possible locations
    if (data.default?.rankedList) {
      // Original structure
      const rankedList = data.default.rankedList.find(
        (list) => list?.rankedKeyword && Array.isArray(list.rankedKeyword)
      )
      if (rankedList) {
        rankedKeywords = rankedList.rankedKeyword
      }
    } else if (data.default?.trendingSearchesDays) {
      // Alternative structure: daily trends
      const trendingDay = data.default.trendingSearchesDays[0]
      if (trendingDay?.trendingSearches) {
        rankedKeywords = trendingDay.trendingSearches.map((search) => ({
          query: search.title?.query || search.title,
          value: search.formattedTraffic || 100,
        }))
      }
    } else if (Array.isArray(data)) {
      // Handle array response
      rankedKeywords = data.map((item) => ({
        query: item.title || item.term,
        value: item.value || 100,
      }))
    }

    if (rankedKeywords.length === 0) {
      console.error(
        'No valid trends data found in response. Response structure:',
        Object.keys(data).join(', ')
      )
      return []
    }

    return rankedKeywords.map((item) => {
      // Ensure search volume is a valid number
      let searchVolume = 0
      if (item.value) {
        const parsedValue = Number(
          item.value.toString().replace(/[^0-9.]/g, '')
        )
        searchVolume = !isNaN(parsedValue) ? Math.round(parsedValue) : 0
      }

      return {
        keyword: item.query || item.title || 'Unknown',
        searchVolume,
        category,
        lastFetched: new Date(),
      }
    })
  } catch (error) {
    console.error('Error parsing Google Trends response:', error)
    console.error('Raw response:', jsonResponse)
    return []
  }
}

// Fetch trending topics for a specific category and region
const fetchTrendingTopics = async (category, region = 'US') => {
  try {
    const date = new Date()
    date.setDate(date.getDate() - 1) // Get trends from the last 24 hours

    const response = await googleTrends.dailyTrends({
      trendDate: date,
      geo: region,
    })

    const trends = parseGoogleTrendsResponse(response, category)

    // Store trends in database
    await GoogleTrends.bulkWrite(
      trends.map((trend) => ({
        updateOne: {
          filter: { keyword: trend.keyword, category, region },
          update: { $set: trend },
          upsert: true,
        },
      }))
    )

    return trends
  } catch (error) {
    console.error('Error fetching Google Trends:', error)
    throw new Error('Failed to fetch trending topics')
  }
}

// GET /api/trends?category=all&region=US
router.get('/trends', auth, async (req, res) => {
  try {
    let { category = 'all', region = 'US' } = req.query
    region = region.toUpperCase()

    // Validate region code format
    if (!isValidRegion(region)) {
      console.log(`Invalid region code format: ${region}, defaulting to US`)
      region = 'US'
    }

    // Enforce region restriction for free users
    if (!req.user.isPaidUser && region !== 'US') {
      region = 'US'
      console.log(
        'Free user attempted to access non-US region, defaulting to US'
      )
    }

    // Check if we have recent data (less than 3 hours old)
    let trends = await GoogleTrends.find({
      category,
      region,
      lastFetched: { $gt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    }).sort({ searchVolume: -1 })

    // If no recent data, fetch new trends
    if (!trends || trends.length === 0) {
      console.log(`Fetching new trends for ${category} in ${region}`)
      try {
        trends = await fetchTrendingTopics(category, region)
      } catch (error) {
        if (error.message.includes('Unsupported region')) {
          console.log(`Unsupported region: ${region}, defaulting to US`)
          region = 'US'
          trends = await fetchTrendingTopics(category, region)
        } else {
          throw error
        }
      }
    }

    // Limit results based on user subscription
    const limitedTrends = req.user.isPaidUser ? trends : trends.slice(0, 5)

    res.json({
      success: true,
      data: limitedTrends,
    })
  } catch (error) {
    console.error('Error in trends route:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics',
    })
  }
})

// GET /api/trends/combined?region=US
router.get('/trends/combined', auth, async (req, res) => {
  try {
    let { region = 'US' } = req.query

    // Enforce region restriction for free users
    if (!req.user.isPaidUser && region !== 'US') {
      region = 'US'
    }

    // Fetch both Google Trends and YouTube trends
    const [googleTrends, youtubeTrends] = await Promise.all([
      GoogleTrends.find({ region }).sort({ searchVolume: -1 }),
      TrendingVideo.find({ region }).sort({ viewCount: -1 }),
    ])

    // Combine and analyze trends
    const combinedTrends = googleTrends.map((gTrend) => {
      const relatedYoutubeVideos = youtubeTrends.filter(
        (yTrend) =>
          yTrend.title.toLowerCase().includes(gTrend.keyword.toLowerCase()) ||
          yTrend.tags.some((tag) =>
            tag.toLowerCase().includes(gTrend.keyword.toLowerCase())
          )
      )

      return {
        keyword: gTrend.keyword,
        searchVolume: gTrend.searchVolume,
        category: gTrend.category,
        relatedVideos: relatedYoutubeVideos.slice(0, 3), // Top 3 related videos
      }
    })

    // Limit results based on user subscription
    const limitedResults = req.user.isPaidUser
      ? combinedTrends
      : combinedTrends.slice(0, 5)

    res.json({
      success: true,
      data: limitedResults,
    })
  } catch (error) {
    console.error('Error in combined trends route:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch combined trends',
    })
  }
})

module.exports = router
