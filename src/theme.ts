export const colors = {
  primary: '#1F6F5C',
  primaryDark: '#0F4A3C',
  primaryLight: '#E3F1EC',
  accent: '#F2A93B',
  accentLight: '#FDF1DC',
  bg: '#F3F6F4',
  card: '#FFFFFF',
  text: '#0F1F1A',
  muted: '#6B7C75',
  border: '#E4EAE7',
  danger: '#D14343',
  dangerLight: '#FCEBEA',
  success: '#1B9A68',
  successLight: '#E1F5EC',
  white: '#FFFFFF',
};

export const radius = { sm: 12, md: 16, lg: 22, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#0B1F1A',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  fab: {
    shadowColor: '#0F4A3C',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const avatarPalette: { bg: string; fg: string }[] = [
  { bg: '#DDF0E8', fg: '#1F6F5C' },
  { bg: '#FDEBD0', fg: '#B9770E' },
  { bg: '#E3E8FA', fg: '#3F51B5' },
  { bg: '#F8E1EA', fg: '#B03A68' },
  { bg: '#E0F2F6', fg: '#16798C' },
  { bg: '#ECE3F8', fg: '#6B3FA0' },
];
