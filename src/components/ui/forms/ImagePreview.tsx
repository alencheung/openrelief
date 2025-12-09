import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X, ZoomIn, Download, AlertCircle, CheckCircle } from 'lucide-react'

const imagePreviewVariants = cva(
  'relative group overflow-hidden rounded-lg border',
  {
    variants: {
      variant: {
        default: 'border-border bg-background',
        card: 'border-border bg-card shadow-sm',
        outlined: 'border-2 border-border bg-background',
        ghost: 'border-transparent bg-background'
      },
      size: {
        sm: 'w-16 h-16',
        default: 'w-24 h-24',
        lg: 'w-32 h-32',
        xl: 'w-48 h-48'
      },
      shape: {
        square: 'aspect-square',
        rectangle: 'aspect-video',
        circle: 'rounded-full'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'square'
    }
  }
)

export interface ImagePreviewItem {
  id: string
  url: string
  file: File
  name: string
  size: number
  type: string
  width?: number
  height?: number
  caption?: string
  status?: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
}

export interface ImagePreviewProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof imagePreviewVariants> {
  images: ImagePreviewItem[]
  onRemove?: (id: string, image: ImagePreviewItem) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  onImageClick?: (image: ImagePreviewItem, index: number) => void
  showRemove?: boolean
  showReorder?: boolean
  showCaption?: boolean
  showProgress?: boolean
  showStatus?: boolean
  maxImages?: number
  editable?: boolean
  renderImage?: (image: ImagePreviewItem, index: number) => React.ReactNode
  renderOverlay?: (image: ImagePreviewItem, index: number) => React.ReactNode
  renderActions?: (image: ImagePreviewItem, index: number) => React.ReactNode
}

const ImagePreview = React.forwardRef<HTMLDivElement, ImagePreviewProps>(
  ({
    className,
    variant,
    size,
    shape,
    images,
    onRemove,
    onReorder,
    onImageClick,
    showRemove = true,
    showReorder = false,
    showCaption = false,
    showProgress = true,
    showStatus = true,
    maxImages,
    editable = false,
    renderImage,
    renderOverlay,
    renderActions,
    ...props
  }, ref) => {
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
    const [selectedImage, setSelectedImage] = React.useState<ImagePreviewItem | null>(null)
    const [isLightboxOpen, setIsLightboxOpen] = React.useState(false)

    // Handle drag start
    const handleDragStart = (index: number) => {
      setDraggedIndex(index)
    }

    // Handle drag over
    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault()
      setDragOverIndex(index)
    }

    // Handle drag leave
    const handleDragLeave = () => {
      setDragOverIndex(null)
    }

    // Handle drop
    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      setDragOverIndex(null)

      if (draggedIndex !== null && draggedIndex !== dropIndex && onReorder) {
        onReorder(draggedIndex, dropIndex)
      }

      setDraggedIndex(null)
    }

    // Handle image click
    const handleImageClick = (image: ImagePreviewItem, index: number) => {
      setSelectedImage(image)
      setIsLightboxOpen(true)
      onImageClick?.(image, index)
    }

    // Handle image removal
    const handleRemove = (image: ImagePreviewItem) => {
      onRemove?.(image.id, image)
    }

    // Format file size
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) {
        return '0 Bytes'
      }
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // Get status color
    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'success': return 'text-success'
        case 'error': return 'text-destructive'
        case 'uploading': return 'text-warning'
        default: return 'text-muted-foreground'
      }
    }

    // Get status icon
    const getStatusIcon = (status?: string) => {
      switch (status) {
        case 'success': return <CheckCircle className="h-3 w-3" />
        case 'error': return <AlertCircle className="h-3 w-3" />
        default: return null
      }
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {/* Images Grid */}
        <div className={cn(
          'grid gap-3',
          size === 'sm' ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
            : size === 'default' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'
              : size === 'lg' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                : size === 'xl' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                  : 'grid-cols-3'
        )}>
          {images.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                imagePreviewVariants({ variant, size, shape }),
                showReorder && 'cursor-move',
                draggedIndex === index && 'opacity-50',
                dragOverIndex === index && 'ring-2 ring-primary'
              )}
              draggable={showReorder}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Image */}
              {renderImage ? (
                renderImage(image, index)
              ) : (
                <img
                  src={image.url}
                  alt={image.name}
                  className={cn(
                    'w-full h-full object-cover transition-transform duration-normal',
                    editable && 'cursor-pointer hover:scale-105'
                  )}
                  onClick={() => editable && handleImageClick(image, index)}
                />
              )}

              {/* Overlay */}
              {renderOverlay ? (
                renderOverlay(image, index)
              ) : (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-normal flex items-center justify-center">
                  <button
                    onClick={() => handleImageClick(image, index)}
                    className="text-white hover:text-white/80 transition-colors p-1"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {showProgress && image.status === 'uploading' && image.progress !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                  <div
                    className="h-full bg-primary transition-all duration-normal"
                    style={{ width: `${image.progress}%` }}
                  />
                </div>
              )}

              {/* Actions */}
              {renderActions ? (
                renderActions(image, index)
              ) : (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-normal flex gap-1">
                  {/* Remove Button */}
                  {showRemove && (
                    <button
                      onClick={() => handleRemove(image)}
                      className="bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add More Indicator */}
          {maxImages && images.length < maxImages && (
            <div className={cn(
              imagePreviewVariants({ variant: 'ghost', size, shape }),
              'flex items-center justify-center border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-muted/25'
            )}>
              <div className="text-center">
                <div className="text-2xl text-muted-foreground mb-1">+</div>
                <div className="text-xs text-muted-foreground">
                  Add ({maxImages - images.length} left)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Image Details */}
        {showCaption && (
          <div className="space-y-2">
            {images.map((image, index) => (
              <div key={image.id} className="flex items-start gap-2 text-xs">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-8 h-8 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {image.name}
                  </div>
                  <div className="text-muted-foreground">
                    {formatFileSize(image.size)}
                  </div>
                  {image.caption && (
                    <div className="text-muted-foreground italic">
                      {image.caption}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(image.status)}
                  <span className={cn(getStatusColor(image.status))}>
                    {image.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {isLightboxOpen && selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="relative max-w-4xl max-h-full">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-full object-contain"
              />

              {/* Close Button */}
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Image Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <div className="text-lg font-medium">{selectedImage.name}</div>
                <div className="text-sm opacity-80">
                  {formatFileSize(selectedImage.size)}
                  {selectedImage.width && selectedImage.height && (
                    <span> • {selectedImage.width} × {selectedImage.height}px</span>
                  )}
                </div>
                {selectedImage.caption && (
                  <div className="text-sm mt-2 italic">{selectedImage.caption}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)
ImagePreview.displayName = 'ImagePreview'

// Single image preview component
export interface SingleImagePreviewProps
  extends Omit<ImagePreviewProps, 'images'> {
  image: ImagePreviewItem
}

export const SingleImagePreview = React.forwardRef<HTMLDivElement, SingleImagePreviewProps>(
  ({ image, ...props }, ref) => {
    return <ImagePreview ref={ref} images={[image]} {...props} />
  }
)
SingleImagePreview.displayName = 'SingleImagePreview'

export { ImagePreview, SingleImagePreview, imagePreviewVariants }