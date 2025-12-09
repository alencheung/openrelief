import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Mic, MicOff, Play, Pause, Square, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

const audioRecorderVariants = cva(
  'flex items-center justify-center w-16 h-16 rounded-full transition-all duration-normal',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90'
      },
      size: {
        sm: 'w-12 h-12',
        default: 'w-16 h-16',
        lg: 'w-20 h-20'
      },
      state: {
        idle: '',
        recording: 'animate-pulse',
        processing: 'animate-spin'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'idle'
    }
  }
)

export interface AudioLevel {
  level: number
  timestamp: number
}

export interface AudioRecording {
  id: string
  blob: Blob
  url: string
  duration: number
  timestamp: Date
  levels?: AudioLevel[]
}

export interface AudioRecorderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof audioRecorderVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  maxDuration?: number // in seconds
  showLevels?: boolean
  showDuration?: boolean
  showPlayback?: boolean
  autoStop?: boolean
  quality?: 'low' | 'medium' | 'high'
  format?: 'webm' | 'mp3' | 'wav'
  onRecordingStart?: () => void
  onRecordingStop?: (recording: AudioRecording) => void
  onRecordingPause?: () => void
  onRecordingResume?: () => void
  onError?: (error: Error) => void
  renderRecording?: (recording: AudioRecording) => React.ReactNode
  renderControls?: (controls: {
    isRecording: boolean
    isPaused: boolean
    startRecording: () => void
    stopRecording: () => void
    pauseRecording: () => void
    resumeRecording: () => void
    deleteRecording: (id: string) => void
  }) => React.ReactNode
}

const AudioRecorder = React.forwardRef<HTMLDivElement, AudioRecorderProps>(
  ({
    className,
    variant,
    size,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    maxDuration = 300, // 5 minutes default
    showLevels = true,
    showDuration = true,
    showPlayback = true,
    autoStop = true,
    quality = 'medium',
    format = 'webm',
    onRecordingStart,
    onRecordingStop,
    onRecordingPause,
    onRecordingResume,
    onError,
    renderRecording,
    renderControls,
    ...props
  }, ref) => {
    const [isRecording, setIsRecording] = React.useState(false)
    const [isPaused, setIsPaused] = React.useState(false)
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [currentRecording, setCurrentRecording] = React.useState<AudioRecording | null>(null)
    const [recordings, setRecordings] = React.useState<AudioRecording[]>([])
    const [duration, setDuration] = React.useState(0)
    const [audioLevels, setAudioLevels] = React.useState<number[]>(new Array(20).fill(0))
    const [permission, setPermission] = React.useState<'granted' | 'denied' | 'prompt' | null>(null)

    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
    const audioChunksRef = React.useRef<Blob[]>([])
    const streamRef = React.useRef<MediaStream | null>(null)
    const analyserRef = React.useRef<AnalyserNode | null>(null)
    const animationFrameRef = React.useRef<number | null>(null)
    const timerRef = React.useRef<NodeJS.Timeout | null>(null)

    // Get recording settings based on quality
    const getRecordingSettings = () => {
      switch (quality) {
        case 'low':
          return { sampleRate: 22050, bitRate: 32000 }
        case 'high':
          return { sampleRate: 48000, bitRate: 128000 }
        default:
          return { sampleRate: 44100, bitRate: 64000 }
      }
    }

    // Get MIME type based on format
    const getMimeType = () => {
      switch (format) {
        case 'mp3':
          return 'audio/mpeg'
        case 'wav':
          return 'audio/wav'
        default:
          return 'audio/webm;codecs=opus'
      }
    }

    // Check microphone permission
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setPermission(result.state as 'granted' | 'denied' | 'prompt')

        result.addEventListener('change', () => {
          setPermission(result.state as 'granted' | 'denied' | 'prompt')
        })
      } catch (error) {
        // Permissions API not supported
        setPermission(null)
      }
    }

    // Initialize audio analyzer
    const initializeAnalyzer = (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()

        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)

        analyserRef.current = analyser
      } catch (error) {
        console.warn('Failed to initialize audio analyzer:', error)
      }
    }

    // Update audio levels visualization
    const updateAudioLevels = () => {
      if (!analyserRef.current) {
        return
      }

      const analyser = analyserRef.current
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)

      // Calculate average level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalizedLevel = average / 255

      setAudioLevels(prev => {
        const newLevels = [...prev.slice(1), normalizedLevel]
        return newLevels
      })

      animationFrameRef.current = requestAnimationFrame(updateAudioLevels)
    }

    // Start recording
    const startRecording = async () => {
      try {
        // Check if already recording
        if (isRecording && !isPaused) {
          return
        }

        // Resume if paused
        if (isRecording && isPaused) {
          resumeRecording()
          return
        }

        setIsProcessing(true)

        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: getRecordingSettings().sampleRate
          }
        })

        streamRef.current = stream

        // Initialize analyzer
        if (showLevels) {
          initializeAnalyzer(stream)
        }

        // Create media recorder
        const mimeType = getMimeType()
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: getRecordingSettings().bitRate
        })

        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const url = URL.createObjectURL(blob)
          const recording: AudioRecording = {
            id: Math.random().toString(36).substr(2, 9),
            blob,
            url,
            duration,
            timestamp: new Date(),
            levels: showLevels ? audioLevels.map((level, index) => ({
              level,
              timestamp: Date.now() - (audioLevels.length - index) * 100
            })) : undefined
          }

          setCurrentRecording(recording)
          setRecordings(prev => [...prev, recording])
          setIsRecording(false)
          setIsPaused(false)
          setIsProcessing(false)

          onRecordingStop?.(recording)

          // Stop audio visualization
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
          }
          setAudioLevels(new Array(20).fill(0))
        }

        mediaRecorder.start()
        mediaRecorderRef.current = mediaRecorder

        setIsRecording(true)
        setIsPaused(false)
        setIsProcessing(false)

        // Start duration timer
        timerRef.current = setInterval(() => {
          setDuration(prev => {
            const newDuration = prev + 0.1
            if (autoStop && newDuration >= maxDuration) {
              stopRecording()
            }
            return newDuration
          })
        }, 100)

        // Start audio visualization
        if (showLevels) {
          updateAudioLevels()
        }

        onRecordingStart?.()
      } catch (error) {
        setIsProcessing(false)
        const err = error instanceof Error ? error : new Error('Failed to start recording')
        onError?.(err)
      }
    }

    // Stop recording
    const stopRecording = () => {
      if (!isRecording || !mediaRecorderRef.current) {
        return
      }

      mediaRecorderRef.current.stop()

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      setDuration(0)
    }

    // Pause recording
    const pauseRecording = () => {
      if (!isRecording || isPaused || !mediaRecorderRef.current) {
        return
      }

      mediaRecorderRef.current.pause()
      setIsPaused(true)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      onRecordingPause?.()
    }

    // Resume recording
    const resumeRecording = () => {
      if (!isRecording || !isPaused || !mediaRecorderRef.current) {
        return
      }

      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // Resume duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 0.1
          if (autoStop && newDuration >= maxDuration) {
            stopRecording()
          }
          return newDuration
        })
      }, 100)

      // Resume audio visualization
      if (showLevels) {
        updateAudioLevels()
      }

      onRecordingResume?.()
    }

    // Delete recording
    const deleteRecording = (id: string) => {
      setRecordings(prev => {
        const recording = prev.find(r => r.id === id)
        if (recording) {
          URL.revokeObjectURL(recording.url)
        }
        return prev.filter(r => r.id !== id)
      })

      if (currentRecording?.id === id) {
        setCurrentRecording(null)
      }
    }

    // Format duration
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Check permission on mount
    React.useEffect(() => {
      checkPermission()
    }, [])

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
        recordings.forEach(recording => URL.revokeObjectURL(recording.url))
      }
    }, [recordings])

    const getState = () => {
      if (isProcessing) {
        return 'processing'
      }
      if (isRecording) {
        return 'recording'
      }
      return 'idle'
    }

    const state = getState()

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}

        {/* Recording Controls */}
        {renderControls ? (
          renderControls({
            isRecording,
            isPaused,
            startRecording,
            stopRecording,
            pauseRecording,
            resumeRecording,
            deleteRecording
          })
        ) : (
          <div className="flex items-center gap-4">
            {/* Record Button */}
            <button
              onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : startRecording}
              disabled={isProcessing || permission === 'denied'}
              className={cn(
                audioRecorderVariants({ variant, size, state }),
                'relative overflow-hidden'
              )}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
              ) : isRecording ? (
                isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </button>

            {/* Stop Button */}
            {isRecording && (
              <button
                onClick={stopRecording}
                className={cn(
                  audioRecorderVariants({ variant: 'destructive', size: 'sm' }),
                  'flex items-center justify-center'
                )}
              >
                <Square className="h-4 w-4" />
              </button>
            )}

            {/* Duration Display */}
            {showDuration && (isRecording || currentRecording) && (
              <div className="text-sm font-medium text-foreground">
                {formatDuration(duration)}
                {maxDuration && ` / ${formatDuration(maxDuration)}`}
              </div>
            )}
          </div>
        )}

        {/* Audio Levels Visualization */}
        {showLevels && isRecording && (
          <div className="flex items-center gap-1 h-8">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="flex-1 bg-muted rounded-full overflow-hidden"
                style={{ height: '4px' }}
              >
                <div
                  className={cn(
                    'h-full transition-all duration-100',
                    level > 0.7 ? 'bg-destructive'
                      : level > 0.4 ? 'bg-warning' : 'bg-success'
                  )}
                  style={{ width: `${level * 100}%` }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Current Recording */}
        {currentRecording && (
          <div className="space-y-2">
            {renderRecording ? (
              renderRecording(currentRecording)
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    Recording {formatDuration(currentRecording.duration)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentRecording.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {/* Playback Controls */}
                {showPlayback && (
                  <audio
                    src={currentRecording.url}
                    controls
                    className="h-8"
                  />
                )}

                {/* Delete Button */}
                <button
                  onClick={() => deleteRecording(currentRecording.id)}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Permission Status */}
        {permission === 'denied' && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive">
              <p className="font-medium">Microphone access denied</p>
              <p>Please enable microphone access in your browser settings to record audio.</p>
            </div>
          </div>
        )}

        {/* Helper Text */}
        {(helperText || errorText || successText || warningText) && (
          <div className={cn(
            'text-xs flex items-center gap-1',
            errorText
              ? 'text-destructive'
              : successText
                ? 'text-success'
                : warningText
                  ? 'text-warning'
                  : 'text-muted-foreground'
          )}>
            {errorText && <AlertCircle className="h-3 w-3" />}
            {successText && <CheckCircle className="h-3 w-3" />}
            {errorText || successText || warningText || helperText}
          </div>
        )}
      </div>
    )
  }
)
AudioRecorder.displayName = 'AudioRecorder'

export { AudioRecorder, audioRecorderVariants }