import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  // Navigation & Action Icons
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Home, Search, Filter, Settings, Menu, X, Plus, Minus,

  // Emergency Type Icons
  Flame, HeartPulse, Shield, CloudRain, Wrench, AlertTriangle,

  // Status & State Icons
  CheckCircle, XCircle, AlertCircle, Clock, PauseCircle,
  Loader2, RefreshCw, Download, Upload,

  // Trust & Security Icons
  ShieldCheck, ShieldAlert, ShieldX, Lock, Unlock, Key,
  Eye, EyeOff, Fingerprint, UserCheck,

  // Communication Icons
  Bell, BellRing, MessageSquare, Phone, Mail,
  Send, Share2, Link, Unlink,

  // Location & Map Icons
  MapPin, Navigation, Compass, Route, Map,
  Globe, Satellite, Radar,

  // Medical & Health Icons
  Heart, Activity, Pill, Stethoscope, Ambulance,
  Hospital, FirstAid, MedicalCross,

  // Safety & Security Icons
  Camera, CameraOff, Video, VideoOff,
  Siren, Flashlight, Radio,

  // Infrastructure Icons
  Building, Zap, Wifi, WifiOff, Battery, BatteryLow,
  Lightbulb, LightbulbOff, Droplet, Wind,

  // Weather & Nature Icons
  Sun, Cloud, CloudSnow, CloudLightning,
  Waves, Mountain, Trees,

  // Social & Community Icons
  Users, UserPlus, UserMinus, Crown,
  HandHeart, HelpingHand, People,

  // Data & Analytics Icons
  BarChart, LineChart, PieChart, TrendingUp, TrendingDown,
  Database, Server, HardDrive, Cloud,

  // Time Icons
  Calendar, Clock, Timer, Hourglass,

  // File & Document Icons
  File, FileText, Image, Video,
  Download, Upload, Folder,

  // Utility Icons
  Info, HelpCircle, ExternalLink, Copy, Trash,
  Edit, Save, Print, ZoomIn, ZoomOut
} from 'lucide-react'

const iconVariants = cva(
  'inline-flex items-center justify-center transition-all duration-normal',
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-8 h-8',
        '2xl': 'w-10 h-10',
        '3xl': 'w-12 h-12'
      },
      variant: {
        default: '',
        solid: 'text-current',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
        secondary: 'text-secondary',
        success: 'text-success',
        warning: 'text-warning',
        error: 'text-destructive',
        info: 'text-info'
      },
      weight: {
        regular: '',
        thin: 'stroke-1',
        light: 'stroke-[1.5]',
        bold: 'stroke-[2.5]'
      },
      animated: {
        true: '',
        false: ''
      },
      interactive: {
        true: 'cursor-pointer hover:scale-110 transition-transform',
        false: ''
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      weight: 'regular',
      animated: false,
      interactive: false
    }
  }
)

export interface IconProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, 'ref'>,
    VariantProps<typeof iconVariants> {
  name: keyof typeof iconMap
  label?: string
  onClick?: () => void
}

// Semantic icon mapping for emergency types
const emergencyIcons = {
  fire: Flame,
  medical: HeartPulse,
  security: Shield,
  natural: CloudRain,
  infrastructure: Wrench,
  default: AlertTriangle
} as const

// Semantic icon mapping for trust levels
const trustIcons = {
  excellent: ShieldCheck,
  good: ShieldCheck,
  moderate: ShieldAlert,
  low: ShieldX,
  critical: ShieldX,
  default: Shield
} as const

// Semantic icon mapping for status types
const statusIcons = {
  active: CheckCircle,
  inactive: PauseCircle,
  pending: Clock,
  resolved: CheckCircle,
  critical: XCircle,
  loading: Loader2,
  default: AlertCircle
} as const

// Comprehensive icon map
const iconMap = {
  // Navigation & Action Icons
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  home: Home,
  search: Search,
  filter: Filter,
  settings: Settings,
  menu: Menu,
  close: X,
  add: Plus,
  remove: Minus,

  // Emergency Type Icons
  ...emergencyIcons,

  // Status & State Icons
  ...statusIcons,
  refresh: RefreshCw,
  download: Download,
  upload: Upload,

  // Trust & Security Icons
  ...trustIcons,
  lock: Lock,
  unlock: Unlock,
  key: Key,
  eye: Eye,
  eyeOff: EyeOff,
  fingerprint: Fingerprint,
  userCheck: UserCheck,

  // Communication Icons
  bell: Bell,
  bellRing: BellRing,
  message: MessageSquare,
  phone: Phone,
  mail: Mail,
  send: Send,
  share: Share2,
  link: Link,
  unlink: Unlink,

  // Location & Map Icons
  mapPin: MapPin,
  navigation: Navigation,
  compass: Compass,
  route: Route,
  map: Map,
  globe: Globe,
  satellite: Satellite,
  radar: Radar,

  // Medical & Health Icons
  heart: Heart,
  activity: Activity,
  pill: Pill,
  stethoscope: Stethoscope,
  ambulance: Ambulance,
  hospital: Hospital,
  firstAid: FirstAid,
  medicalCross: MedicalCross,

  // Safety & Security Icons
  camera: Camera,
  cameraOff: CameraOff,
  video: Video,
  videoOff: VideoOff,
  siren: Siren,
  flashlight: Flashlight,
  radio: Radio,

  // Infrastructure Icons
  building: Building,
  zap: Zap,
  wifi: Wifi,
  wifiOff: WifiOff,
  battery: Battery,
  batteryLow: BatteryLow,
  lightbulb: Lightbulb,
  lightbulbOff: LightbulbOff,
  droplet: Droplet,
  wind: Wind,

  // Weather & Nature Icons
  sun: Sun,
  cloud: Cloud,
  cloudSnow: CloudSnow,
  cloudLightning: CloudLightning,
  waves: Waves,
  mountain: Mountain,
  trees: Trees,

  // Social & Community Icons
  users: Users,
  userPlus: UserPlus,
  userMinus: UserMinus,
  crown: Crown,
  handHeart: HandHeart,
  helpingHand: HelpingHand,
  people: People,

  // Data & Analytics Icons
  barChart: BarChart,
  lineChart: LineChart,
  pieChart: PieChart,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  database: Database,
  server: Server,
  hardDrive: HardDrive,
  cloudStorage: Cloud,

  // Time Icons
  calendar: Calendar,
  clock: Clock,
  timer: Timer,
  hourglass: Hourglass,

  // File & Document Icons
  file: File,
  fileText: FileText,
  image: Image,
  videoFile: Video,
  folder: Folder,

  // Utility Icons
  info: Info,
  help: HelpCircle,
  externalLink: ExternalLink,
  copy: Copy,
  trash: Trash,
  edit: Edit,
  save: Save,
  print: Print,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut
} as const

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({
    name,
    size,
    variant,
    weight,
    animated = false,
    interactive = false,
    label,
    onClick,
    className,
    ...props
  }, ref) => {
    const IconComponent = iconMap[name as keyof typeof iconMap]

    if (!IconComponent) {
      console.warn(`Icon "${name}" not found in icon map`)
      return null
    }

    return (
      <IconComponent
        ref={ref}
        className={cn(
          iconVariants({ size, variant, weight, animated, interactive }),
          {
            'animate-spin': animated && name === 'loading',
            'animate-pulse': animated && (name === 'active' || name === 'critical'),
            'animate-bounce': animated && name === 'notification'
          },
          className
        )}
        onClick={onClick}
        aria-label={label || name}
        {...props}
      />
    )
  }
)
Icon.displayName = 'Icon'

// Semantic icon components for common use cases
export const EmergencyIcon = ({ type, ...props }: Omit<IconProps, 'name'> & { type: keyof typeof emergencyIcons }) => (
  <Icon name={emergencyIcons[type] ? type : 'default'} {...props} />
)

export const TrustIcon = ({ level, ...props }: Omit<IconProps, 'name'> & { level: keyof typeof trustIcons }) => (
  <Icon name={trustIcons[level] || 'default'} {...props} />
)

export const StatusIcon = ({ status, ...props }: Omit<IconProps, 'name'> & { status: keyof typeof statusIcons }) => (
  <Icon name={statusIcons[status] || 'default'} {...props} />
)

export { Icon, iconVariants, iconMap, emergencyIcons, trustIcons, statusIcons }