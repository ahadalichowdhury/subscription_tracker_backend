const OpenAI = require('openai')
const dotenv = require('dotenv')

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const generatePrompt = (trendingData) => {
  const { googleTrends, youtubeTrends } = trendingData

  // Format trending topics and videos into a structured prompt
  const trendingTopics = googleTrends
    .map((trend) => `${trend.keyword} (Search Volume: ${trend.searchVolume})`)
    .join('\n')

  const trendingVideos = youtubeTrends
    .map(
      (video) =>
        `"${video.title}" (Views: ${video.viewCount}, Tags: ${video.tags.join(
          ', '
        )})`
    )
    .join('\n')

  return `Generate 3 unique and engaging YouTube video ideas based on the following trending data:

Current Trending Topics:
${trendingTopics}

Popular YouTube Videos:
${trendingVideos}

For each video idea, provide:
1. An attention-grabbing title
2. A compelling description
3. Target keywords
4. Estimated target audience
5. Potential engagement metrics

Ensure the ideas are original, engaging, and have viral potential while incorporating current trends.`
}

const parseResponse = (response) => {
  try {
    const ideas = []
    const sections = response.split(/Video Idea \d+:/i).filter(Boolean)

    for (const section of sections) {
      const idea = {
        title: 'Untitled Video', // Default title
        description: 'No description provided', // Default description
        targetKeywords: [],
        engagement: {
          estimatedViews: 0,
          targetAudience: '',
        },
      }

      // Extract title
      const titleMatch = section.match(/Title:\s*([^\n]+)/)
      if (titleMatch) idea.title = titleMatch[1].trim()

      // Extract description
      const descMatch = section.match(/Description:\s*([^\n]+)/)
      if (descMatch) idea.description = descMatch[1].trim()

      // Extract keywords
      const keywordsMatch = section.match(/Keywords?:\s*([^\n]+)/)
      if (keywordsMatch) {
        idea.targetKeywords = keywordsMatch[1]
          .split(/[,|]/) // Split by comma or pipe
          .map((k) => k.trim())
          .filter(Boolean)
      }

      // Extract target audience
      const audienceMatch = section.match(/Target Audience:\s*([^\n]+)/)
      if (audienceMatch) {
        idea.engagement.targetAudience = audienceMatch[1].trim()
      }

      // Extract estimated views (if available)
      const viewsMatch = section.match(/(\d+)[Kk]?\+?\s*views/)
      if (viewsMatch) {
        const viewCount = parseInt(viewsMatch[1])
        idea.engagement.estimatedViews = viewCount * 1000 // Convert K to actual number
      }

      ideas.push(idea)
    }

    return ideas
  } catch (error) {
    console.error('Error parsing OpenAI response:', error)
    return []
  }
}

const generateVideoIdeas = async (trendingData) => {
  try {
    const prompt = generatePrompt(trendingData)

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a creative YouTube content strategist who specializes in identifying viral video opportunities based on current trends.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    })

    const response = completion.choices[0].message.content
    return parseResponse(response)
  } catch (error) {
    console.error('Error generating video ideas:', error)
    throw new Error('Failed to generate video ideas')
  }
}

module.exports = {
  generateVideoIdeas,
}
