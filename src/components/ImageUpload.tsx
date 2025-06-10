'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImageUploadProps {
  value?: string // Current image URL
  onChange: (url: string | null, key: string | null) => void
  maxSize?: number // Max size in MB
  className?: string
}

interface UploadResponse {
  error: string
  success: boolean
  url: string
  key: string
  fileName: string
  fileSize: number
  contentType: string
}

export function ImageUpload({ value, onChange, maxSize = 5, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'services')

      const response = await fetch('/api/uploads/direct', {
        method: 'POST',
        body: formData,
      })

      const data: UploadResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      onChange(data.url, data.key)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const handleRemove = async () => {
    if (!value) return

    try {
      // Extract key from URL or use stored key
      const urlParts = value.split('/')
      const key = urlParts.slice(-3).join('/') // Get tenant/folder/filename part

      await fetch('/api/uploads/direct', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      })

      onChange(null, null)
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete image')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    multiple: false,
    disabled: uploading
  })

  if (value) {
    return (
      <Card className={`relative w-full max-w-md ${className}`}>
        <CardContent className="p-4">
          <div className="relative group">
            <img
              src={value}
              alt="Service"
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card
        {...getRootProps()}
        className={`cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-dashed border-gray-300 hover:border-gray-400'
        } ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 text-gray-400 mb-4 animate-spin" />
                <p className="text-lg font-medium text-gray-700">Uploading...</p>
                <p className="text-sm text-gray-500">Please wait while we upload your image</p>
              </>
            ) : (
              <>
                {isDragActive ? (
                  <Upload className="h-12 w-12 text-primary mb-4" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                )}
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragActive ? 'Drop image here' : 'Upload service image'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Drag and drop an image, or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  Supports: JPG, PNG, WebP, GIF (Max {maxSize}MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
