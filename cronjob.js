const cron = require('node-cron')
const TrendingVideo = require('./models/trandingVideo') // Assuming this is your model for the TrendingVideo collection

// Run every 3 hours (adjust the schedule if needed)
cron.schedule('0 */3 * * *', async () => {
  console.log('Cleaning up old trending video data...')

  try {
    // Delete videos older than 3 hours
    const result = await TrendingVideo.deleteMany({
      lastFetched: { $lt: new Date(Date.now() - 3 * 60 * 60 * 1000) }, // 3 hours ago
    })

    console.log(`Deleted ${result.deletedCount} old videos.`)
  } catch (error) {
    console.error('Error cleaning up old trending video data:', error)
  }

  console.log('Trending videos cleanup complete.')
})
