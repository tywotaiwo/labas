import { Platform } from 'react-native';

export const colors = {
  ivory: '#f3f1ea',
  paper: '#f8f7f3',
  forest: '#1c332c',
  muted: '#6d766f',
  sage: '#8ea396',
  mist: '#e7f0e6',
  track: '#d5e3d4',
  line: '#e4e7e1',
  chip: '#f7f8f5',
  ease: '#5f7d6c',
  clay: '#8d6458',
  quiet: '#b7c0b8',
  inkOnSage: '#f7f6f2',
};

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
