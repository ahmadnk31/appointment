import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

// POST /api/uploads/direct - Handle direct file upload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'services'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const s3Service = S3Service.getInstance()

    // Validate file type
    if (!s3Service.isValidImageType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    if (!s3Service.isValidFileSize(file.size)) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique key
    const key = s3Service.generateKey(session.user.tenantId, folder, file.name)

    // Upload file
    const publicUrl = await s3Service.uploadFile(key, buffer, file.type)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// DELETE /api/uploads/direct - Delete uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key } = body

    if (!key) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      )
    }

    const s3Service = S3Service.getInstance()
    await s3Service.deleteFile(key)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
