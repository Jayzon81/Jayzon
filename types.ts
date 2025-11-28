
export enum AppMode {
  GENERATE_IMAGE = 'GENERATE_IMAGE',
  GENERATE_VIDEO = 'GENERATE_VIDEO',
  STORYBOARD = 'STORYBOARD',
  EDIT_IMAGE = 'EDIT_IMAGE',
  ANALYZE = 'ANALYZE',
  TRAIN_MODEL = 'TRAIN_MODEL',
}

export enum ImageAspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
}

export enum VideoResolution {
  HD = '720p',
  FHD = '1080p',
}

export interface GeneratedMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
}

export interface StoryboardPanel {
  id: string;
  description: string;
  imageUrl?: string;
  isLoading: boolean;
}

export interface TrainingExample {
  id: string;
  input: string;
  output: string;
}

export interface CustomModel {
  id: string;
  name: string;
  avatar: string;
  type: 'chat' | 'image_generator';
  systemInstruction: string;
  consistencyContext?: string;
  examples: TrainingExample[];
  referenceImages?: string[];
  lastModified: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachmentUrl?: string;
}