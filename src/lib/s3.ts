import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'appointment-system-uploads'

export class S3Service {
  private static instance: S3Service

  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service()
    }
    return S3Service.instance
  }

  // Generate a pre-signed URL for uploading files
  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
      return signedUrl
    } catch (error) {
      console.error('Error generating upload URL:', error)
      throw new Error('Failed to generate upload URL')
    }
  }

  // Upload file directly (for server-side uploads)
  async uploadFile(key: string, file: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    try {
      await s3Client.send(command)
      return this.getPublicUrl(key)
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error('Failed to upload file')
    }
  }

  // Delete a file from S3
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    try {
      await s3Client.send(command)
    } catch (error) {
      console.error('Error deleting file:', error)
      throw new Error('Failed to delete file')
    }
  }

  // Get public URL for a file
  getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
  }

  // Generate a pre-signed URL for downloading/viewing files
  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
      return signedUrl
    } catch (error) {
      console.error('Error generating download URL:', error)
      throw new Error('Failed to generate download URL')
    }
  }

  // Generate a unique key for uploads
  generateKey(tenantId: string, folder: string, fileName: string): string {
    const timestamp = Date.now()
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${tenantId}/${folder}/${timestamp}_${cleanFileName}`
  }

  // Validate file type for images
  isValidImageType(contentType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
    return allowedTypes.includes(contentType)
  }

  // Validate file size (default 5MB limit)
  isValidFileSize(size: number, maxSizeInMB: number = 5): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    return size <= maxSizeInBytes
  }
}
