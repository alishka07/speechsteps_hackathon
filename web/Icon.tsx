import React from 'react';
import {
  Award, ArrowLeft, BookOpen, BookOpenText, Building2, CalendarCheck2, CalendarDays,
  Camera, ChartNoAxesColumnIncreasing, ChartNoAxesCombined, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, Circle, CircleAlert, CircleCheck, CircleHelp,
  CirclePlay, CirclePlus, CircleX, Clock3, Cloud, Copy, CreditCard, Ear, Eye, FileText,
  Flag, FolderOpen, Gamepad2, GitBranch, GraduationCap, Hand, Heart, HeartPulse, House,
  Images, Image, Languages, LayoutGrid, Lightbulb, ListChecks, LockKeyhole, LogOut,
  MessageCircleMore, MessagesSquare, Mic, Music2, Pencil, Play, Puzzle, Repeat2, ScanLine,
  Search, Send, Settings2, Smile, Sparkles, Star, Trash2, TrendingUp, Trophy, UserRound,
  UserRoundPlus, UsersRound, Video, Volume2, X,
} from 'lucide-react';

const icons: Record<string, React.ComponentType<any>> = {
  add: CirclePlus, 'add-circle': CirclePlus, 'add-circle-outline': CirclePlus, 'arrow-back': ArrowLeft,
  'bar-chart-outline': ChartNoAxesColumnIncreasing, book: BookOpen, business: Building2,
  'business-outline': Building2, calendar: CalendarDays, 'calendar-outline': CalendarDays,
  'calendar-clear-outline': CalendarDays, 'today-outline': CalendarCheck2, 'card-outline': CreditCard,
  'chatbubble-ellipses-outline': MessageCircleMore, 'chatbubbles-outline': MessagesSquare,
  checkmark: Check, 'checkmark-circle': CircleCheck, 'checkmark-circle-outline': CircleCheck,
  'checkmark-done': ListChecks, 'checkmark-done-circle': ListChecks, 'chevron-down': ChevronDown,
  'chevron-forward': ChevronRight, 'chevron-up': ChevronUp, 'chevron-back': ChevronLeft,
  close: X, 'close-circle': CircleX, 'close-circle-outline': CircleX, 'copy-outline': Copy,
  'document-text': FileText, 'document-text-outline': FileText, 'reader-outline': BookOpenText,
  'folder-open': FolderOpen, 'game-controller': Gamepad2, 'game-controller-outline': Gamepad2,
  grid: LayoutGrid, 'grid-outline': LayoutGrid, 'happy-outline': Smile, 'heart-outline': Heart,
  'language-outline': Languages, 'lock-closed': LockKeyhole, 'lock-closed-outline': LockKeyhole,
  'medkit-outline': HeartPulse, mic: Mic, 'mic-outline': Mic, 'paper-plane-outline': Send,
  people: UsersRound, person: UserRound, 'person-outline': UserRound, 'person-add': UserRoundPlus,
  play: Play, 'play-circle': CirclePlay, 'ribbon-outline': Award, search: Search, send: Send,
  sparkles: Sparkles, 'sparkles-outline': Sparkles, star: Star, 'time-outline': Clock3,
  'trending-up': TrendingUp, trophy: Trophy, videocam: Video, 'videocam-outline': Video,
  flag: Flag, 'image-outline': Image, 'images-outline': Images, 'trash-outline': Trash2,
  'git-branch-outline': GitBranch, 'settings-outline': Settings2, settings: Settings2,
  home: House, 'home-outline': House, 'alert-circle-outline': CircleAlert,
  'bulb-outline': Lightbulb, 'log-out-outline': LogOut, 'stats-chart': ChartNoAxesCombined,
  folder: FolderOpen, document: FileText, 'create-outline': Pencil, 'eye-outline': Eye,
  'information-circle-outline': CircleHelp, 'scan-outline': ScanLine, 'camera-outline': Camera,
  'musical-notes-outline': Music2, 'musical-notes': Music2, 'volume-high-outline': Volume2,
  'ear-outline': Ear, 'repeat-outline': Repeat2, 'cloud-outline': Cloud,
  'hand-left-outline': Hand, 'school-outline': GraduationCap, 'extension-puzzle-outline': Puzzle,
};
type Props = { name: string; size?: number; color?: string; style?: React.CSSProperties; onPress?: () => void };
function Icon({ name, size = 24, color = 'currentColor', style, onPress }: Props) {
  const Component = icons[name] ?? Circle;
  return <Component size={size} color={color} strokeWidth={2} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} onClick={onPress} />;
}
export const Ionicons: any = Icon;
Ionicons.glyphMap = Object.fromEntries(Object.keys(icons).map((name) => [name, 1]));
export default Icon;
