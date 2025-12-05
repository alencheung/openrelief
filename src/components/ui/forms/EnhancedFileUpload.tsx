import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Upload, X, File, Image, Film, Music, FileText, AlertCircle, CheckCircle } from 'lucide-react'

const enhancedFileUploadVariants = cva(
  'relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-all duration-normal',
  {
    variants: {
      variant: {
        default: 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25',
        error: 'border-destructive hover:border-destructive/50 hover:bg-destructive/5',
        success: 'border-success hover:border-success/50 hover:bg-success/5',
        warning: 'border-warning hover:border-warning/50 hover:bg-warning/5',
      },
      size: {
        sm: 'h-24 p-4',
        default: 'h-32 p-6',
        lg: 'h-40 p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface FilePreview {
  file: File
  id: string
  url: string
  type: 'image' | 'video' | 'audio' | 'document'
}

export interface EnhancedFileUploadProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>,
    VariantProps<typeof enhancedFileUploadVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  placeholder?: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number // in bytes
  showPreviews?: boolean
  floatingLabel?: boolean
  required?: boolean
  validateOnChange?: boolean
  validator?: (files: File[]) => string | null
  onValidationChange?: (isValid: boolean, message?: string) => void
  onFilesChange?: (files: File[], previews: FilePreview[]) => void
  onFileRemove?: (fileId: string, file: File) => void
  renderPreview?: (preview: FilePreview) => React.ReactNode
  renderUploadArea?: (isDragActive: boolean) => React.ReactNode
}

const EnhancedFileUpload = React.forwardRef<HTMLInputElement, EnhancedFileUploadProps>(
  ({ 
    className, 
    variant, 
    size,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    placeholder = 'Drop files here or click to browse',
    accept,
    multiple = false,
    maxFiles = 5,
    maxSize = 10 * 1024 * 1024, // 10MB default
    showPreviews = true,
    floatingLabel = false,
    required = false,
    validateOnChange = false,
    validator,
    onValidationChange,
    onFilesChange,
    onFileRemove,
    renderPreview,
    renderUploadArea,
    disabled,
    ...props 
  }, ref) => {
    const [isDragActive, setIsDragActive] = React.useState(false)
    const [files, setFiles] = React.useState<File[]>([])
    const [previews, setPreviews] = React.useState<FilePreview[]>([])
    const [validationState, setValidationState] = React.useState<{
      isValid: boolean | null
      message: string | null
    }>({ isValid: null, message: null })
    
    const inputRef = React.useRef<HTMLInputElement>(null)
    const inputId = `file-upload-${React.useId()}`
    
    // Determine final variant based on props and validation state
    const getVariant = () => {
      if (errorText || validationState.message && !validationState.isValid) return 'error'
      if (successText || validationState.isValid) return 'success'
      if (warningText) return 'warning'
      return variant
    }
    
    // Get file type category
    const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
      if (file.type.startsWith('image/')) return 'image'
      if (file.type.startsWith('video/')) return 'video'
      if (file.type.startsWith('audio/')) return 'audio'
      return 'document'
    }
    
    // Get file icon
    const getFileIcon = (type: 'image' | 'video' | 'audio' | 'document') => {
      switch (type) {
        case 'image': return <Image className="h-4 w-4" />
        case 'video': return <Film className="h-4 w-4" />
        case 'audio': return <Music className="h-4 w-4" />
        case 'document': return <FileText className="h-4 w-4" />
      }
    }
    
    // Create preview for file
    const createPreview = (file: File): FilePreview => {
      const id = Math.random().toString(36).substr(2, 9)
      const type = getFileType(file)
      const url = URL.createObjectURL(file)
      
      return { file, id, url, type }
    }
    
    // Handle validation
    const validateFiles = (fileList: File[]) => {
      if (!validator || !validateOnChange) return
      
      const validationResult = validator(fileList)
      const isValid = validationResult === null
      const message = validationResult || null
      
      setValidationState({ isValid, message })
      onValidationChange?.(isValid, message || undefined)
    }
    
    // Process files
    const processFiles = (fileList: File[]) => {
      // Filter by accept attribute
      if (accept) {
        const acceptedTypes = accept.split(',').map(type => type.trim())
        fileList = fileList.filter(file => {
          return acceptedTypes.some(acceptedType => {
            if (acceptedType.startsWith('.')) {
              return file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
            }
            return file.type.match(acceptedType.replace('*', '.*'))
          })
        })
      }
      
      // Filter by size
      fileList = fileList.filter(file => file.size <= maxSize)
      
      // Limit number of files
      if (!multiple) {
        fileList = [fileList[0]].filter(Boolean)
      } else if (fileList.length > maxFiles) {
        fileList = fileList.slice(0, maxFiles)
      }
      
      // Create previews
      const newPreviews = fileList.map(createPreview)
      
      // Update state
      setFiles(fileList)
      setPreviews(newPreviews)
      
      // Validate and notify
      validateFiles(fileList)
      onFilesChange?.(fileList, newPreviews)
    }
    
    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = Array.from(e.target.files || [])
      processFiles(fileList)
      
      // Reset input value to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
    
    // Handle drag events
    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(true)
    }
    
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
    }
    
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      
      const fileList = Array.from(e.dataTransfer.files)
      processFiles(fileList)
    }
    
    // Handle file removal
    const handleFileRemove = (fileId: string) => {
      const previewIndex = previews.findIndex(p => p.id === fileId)
      if (previewIndex === -1) return
      
      const preview = previews[previewIndex]
      const newPreviews = previews.filter(p => p.id !== fileId)
      const newFiles = files.filter((_, index) => index !== previewIndex)
      
      // Revoke object URL to free memory
      URL.revokeObjectURL(preview.url)
      
      setPreviews(newPreviews)
      setFiles(newFiles)
      
      validateFiles(newFiles)
      onFilesChange?.(newFiles, newPreviews)
      onFileRemove?.(fileId, preview.file)
    }
    
    // Clean up object URLs on unmount
    React.useEffect(() => {
      return () => {
        previews.forEach(preview => URL.revokeObjectURL(preview.url))
      }
    }, [previews])
    
    const currentVariant = getVariant()
    const hasFiles = files.length > 0
    
    return (
      <div className="space-y-4">
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-foreground',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        {/* Upload Area */}
        <div
          className={cn(
            enhancedFileUploadVariants({ variant: currentVariant, size }),
            isDragActive && 'border-primary bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {/* Hidden File Input */}
          <input
            ref={(node) => {
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
              inputRef.current = node
            }}
            type="file"
            id={inputId}
            accept={accept}
            multiple={multiple}
            onChange={handleFileInputChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          
          {/* Upload Area Content */}
          {renderUploadArea ? (
            renderUploadArea(isDragActive)
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <Upload className={cn(
                'h-8 w-8 text-muted-foreground',
                isDragActive && 'text-primary'
              )} />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? 'Drop files here' : placeholder}
              </p>
              {accept && (
                <p className="text-xs text-muted-foreground">
                  Accepted: {accept.split(',').join(', ')}
                </p>
              )}
              {maxSize && (
                <p className="text-xs text-muted-foreground">
                  Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* File Previews */}
        {showPreviews && hasFiles && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              Files ({files.length}{maxFiles && `/${maxFiles}`})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {previews.map((preview) => (
                <div key={preview.id} className="relative group">
                  {renderPreview ? (
                    renderPreview(preview)
                  ) : (
                    <div className="relative border rounded-lg overflow-hidden bg-muted/25">
                      {preview.type === 'image' ? (
                        <img
                          src={preview.url}
                          alt={preview.file.name}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-24 space-x-2">
                          {getFileIcon(preview.type)}
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {preview.file.name}
                          </div>
                        </div>
                      )}
                      
                      {/* File Info Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-xs text-center p-2">
                          <div className="truncate max-w-[120px]">{preview.file.name}</div>
                          <div>{(preview.file.size / 1024).toFixed(1)}KB</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleFileRemove(preview.id)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Helper Text */}
        {(helperText || errorText || successText || warningText || validationState.message) && (
          <div className={cn(
            'text-xs flex items-center gap-1',
            errorText || (validationState.message && !validationState.isValid) 
              ? 'text-destructive' 
              : successText || validationState.isValid 
                ? 'text-success' 
                : warningText 
                  ? 'text-warning' 
                  : 'text-muted-foreground'
          )}>
            {errorText || (validationState.message && !validationState.isValid) && <AlertCircle className="h-3 w-3" />}
            {successText || validationState.isValid && <CheckCircle className="h-3 w-3" />}
            {errorText || successText || warningText || validationState.message || helperText}
          </div>
        )}
      </div>
    )
  }
)
EnhancedFileUpload.displayName = 'EnhancedFileUpload'

export { EnhancedFileUpload, enhancedFileUploadVariants }