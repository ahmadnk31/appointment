import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

// POST /api/uploads/presigned-url - Generate presigned URL for file upload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, contentType, folder = 'services' } = body

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      )
    }

    const s3Service = S3Service.getInstance()

    // Validate file type
    if (!s3Service.isValidImageType(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Generate unique key
    const key = s3Service.generateKey(session.user.tenantId, folder, fileName)

    // Generate presigned URL
    const uploadUrl = await s3Service.getUploadUrl(key, contentType)
    const publicUrl = s3Service.getPublicUrl(key)

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    })

  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
