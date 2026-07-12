import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await getAuthPayload()
  if (error) return error

  try {
    const [totalPosts, totalMessages, postStats] = await Promise.all([
      prisma.socialPost.count(),
      prisma.socialMessage.count(),
      prisma.socialPost.aggregate({
        _sum: {
          mockLikes: true,
          mockReach: true
        }
      })
    ])

    return NextResponse.json({
      totalPosts,
      totalMessages,
      totalLikes: postStats._sum.mockLikes || 0,
      totalReach: postStats._sum.mockReach || 0
    })
  } catch (err) {
    console.error('[Social Stats]', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
