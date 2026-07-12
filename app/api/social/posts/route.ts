import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  try {
    const { content, platforms, imageUrl } = await req.json()

    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Content and at least one platform required' }, { status: 400 })
    }

    // Simulate network delay for API call
    await new Promise(resolve => setTimeout(resolve, 800))

    // Create DB records for the mock posts
    const createdPosts = await Promise.all(
      platforms.map(async (platform: string) => {
        // Generate random mock stats
        const mockLikes = Math.floor(Math.random() * 50) + 5
        const mockReach = Math.floor(Math.random() * 1000) + 100

        return prisma.socialPost.create({
          data: {
            platform,
            content,
            imageUrl,
            status: 'PUBLISHED',
            mockLikes,
            mockReach
          }
        })
      })
    )

    return NextResponse.json({ success: true, posts: createdPosts }, { status: 201 })
  } catch (err) {
    console.error('[Social Post]', err)
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  try {
    const posts = await prisma.socialPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return NextResponse.json({ posts })
  } catch (err) {
    console.error('[Social Get]', err)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
