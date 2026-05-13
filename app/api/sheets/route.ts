import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getGoogleAuth } from '@/lib/google'
import { google } from 'googleapis'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  try {
    const sheets = await prisma.googleSheet.findMany({
      where: { isDeleted: false },
      include: {
        creator: { select: { name: true } },
        updater: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(sheets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const token = (await cookies()).get('auth_token')?.value
    const decoded = token ? await verifyToken(token) : null
    const userId = decoded?.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // DISABLING REAL GOOGLE API FOR NOW
    /*
    const auth = await getGoogleAuth('sheets')
    const service = google.sheets({ version: 'v4', auth })

    const response = await service.spreadsheets.create({
      requestBody: {
        properties: { title: name }
      }
    })
    const spreadsheetId = response.data.spreadsheetId
    */
    
    const spreadsheetId = `mock-id-${Date.now()}` // Temporary mock ID
    
    // Save to DB
    const newSheet = await prisma.googleSheet.create({
      data: {
        name,
        spreadsheetId: spreadsheetId!,
        creator: { connect: { id: userId } }
      }
    })

    return NextResponse.json(newSheet)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Failed to create sheet on Google' }, { status: 500 })
  }
}
