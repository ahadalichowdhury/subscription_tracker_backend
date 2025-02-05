const express = require('express')
const TrendingVideo = require('../models/trandingVideo')
const auth = require('../middleware/auth')
const { google } = require('googleapis')
const router = express.Router()

// YouTube API setup
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY, // Make sure to store your API key securely
})

const fetchTrendingVideosForRegion = async (regionCode) => {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      chart: 'mostPopular',
      regionCode: regionCode,
      maxResults: 10, // You can adjust the number of results
    })

    // Map the response to the required format
    const trendingVideos = []

    for (const video of response.data.items) {
      const videoDetails = await youtube.videos.list({
        part: 'snippet',
        id: video.id, // Fetch individual video details to get tags
      })

      const videoTags = videoDetails.data.items[0]?.snippet?.tags || []

      trendingVideos.push({
        region: regionCode,
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high.url,
        viewCount: video.statistics.viewCount,
        likeCount: video.statistics.likeCount || 0,
        publishedAt: new Date(video.snippet.publishedAt),
        lastFetched: new Date(),
        tags: videoTags, // Include tags
      })
    }

    return trendingVideos
  } catch (error) {
    console.error('Error fetching trending videos from YouTube:', error)
    throw new Error('Failed to fetch trending videos')
  }
}

// Get stored trending videos from DB
// Get stored trending videos from DB
router.get('/trending', auth, async (req, res) => {
  let { region = 'US' } = req.query // Default to 'US' if no region is provided

  console.log(region)
  console.log(req.user.isPaidUser)

  try {
    // Check user's subscription status and enforce region restrictions
    if (!req.user.isPaidUser && region !== 'US') {
      region = 'US' // Force region to US for free users
      console.log(
        'Free user attempted to access non-US region, defaulting to US'
      )
    }

    // Check if data for the region already exists in the database
    let videos = await TrendingVideo.find({ region })
      .sort({ lastFetched: -1 })
      .limit(req.user.isPaidUser ? 10 : 2) // Limit to 2 videos for free users, 10 for paid users

    // If no videos are found or if data is stale, fetch it from YouTube API
    if (
      !videos ||
      videos.length === 0 ||
      new Date() - videos[0].lastFetched > 3600000
    ) {
      console.log(
        `No data or data is stale for region: ${region}. Fetching from YouTube...`
      )

      // Fetch trending videos from YouTube API
      const trendingVideos = await fetchTrendingVideosForRegion(region)

      // Store the fetched data in the database
      await TrendingVideo.bulkWrite(
        trendingVideos.map((video) => ({
          updateOne: {
            filter: { videoId: video.videoId },
            update: { $set: video },
            upsert: true, // If the video doesn't exist, create it
          },
        }))
      )

      // Fetch the data from the database again after storing it
      videos = await TrendingVideo.find({ region })
        .sort({ lastFetched: -1 })
        .limit(req.user.isPaidUser ? 10 : 2) // Limit to 2 videos for free users, 10 for paid users
    }

    res.json({ success: true, data: videos })
  } catch (error) {
    console.error('Error fetching trending videos:', error)
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch trending videos' })
  }
})


module.exports = router
