const { google } = require('googleapis')

class YouTubeAnalyticsService {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    })

    this.youtubeAnalytics = google.youtubeAnalytics({
      version: 'v2',
      auth: process.env.YOUTUBE_API_KEY,
    })
  }

  async getPublicStats(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: ['statistics', 'contentDetails'],
        id: videoId,
      })

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found')
      }

      const stats = response.data.items[0].statistics
      return {
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
        duration: response.data.items[0].contentDetails.duration,
      }
    } catch (error) {
      console.error('Error fetching public stats:', error)
      throw error
    }
  }

  async getVideoAnalytics(videoId) {
    try {
      // Get basic video statistics
      const videoStats = await this.getBasicStats(videoId)

      // Get audience retention data
      const retentionData = await this.getAudienceRetention(videoId)

      // Get demographic data
      const demographics = await this.getDemographics(videoId)

      return {
        basicStats: videoStats,
        retention: retentionData,
        demographics: demographics,
      }
    } catch (error) {
      console.error('Error fetching video analytics:', error)
      throw error
    }
  }

  async getBasicStats(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: ['statistics', 'contentDetails'],
        id: videoId,
      })

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found')
      }

      const stats = response.data.items[0].statistics
      return {
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
        duration: response.data.items[0].contentDetails.duration,
      }
    } catch (error) {
      console.error('Error fetching basic stats:', error)
      throw error
    }
  }

  async getAudienceRetention(videoId) {
    try {
      const response = await this.youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        metrics:
          'estimatedMinutesWatched,averageViewDuration,averageViewPercentage',
        filters: `video==${videoId}`,
        dimensions: 'elapsedVideoTimeRatio',
      })

      return {
        estimatedMinutesWatched: response.data.rows[0][0],
        averageViewDuration: response.data.rows[0][1],
        averageViewPercentage: response.data.rows[0][2],
      }
    } catch (error) {
      console.error('Error fetching audience retention:', error)
      throw error
    }
  }

  async getDemographics(videoId) {
    try {
      const response = await this.youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        metrics: 'viewerPercentage',
        dimensions: 'ageGroup,gender',
        filters: `video==${videoId}`,
      })

      const demographics = {
        ageGroups: {},
        genders: {},
      }

      response.data.rows.forEach((row) => {
        const [ageGroup, gender, percentage] = row
        if (!demographics.ageGroups[ageGroup]) {
          demographics.ageGroups[ageGroup] = percentage
        }
        if (!demographics.genders[gender]) {
          demographics.genders[gender] = percentage
        }
      })

      return demographics
    } catch (error) {
      console.error('Error fetching demographics:', error)
      throw error
    }
  }
}

module.exports = new YouTubeAnalyticsService()
