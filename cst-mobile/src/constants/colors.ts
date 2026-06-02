export const Colors = {
  primary:      '#021B3A',
  secondary:    '#2C6EBD',
  danger:       '#CC0000',
  success:      '#27AE60',
  background:   '#FFFFFF',
  surface:      '#F5F7FA',
  surfaceLight: '#EBEEF2',
  text:         '#021B3A',
  textMuted:    '#757575',
  textDark:     '#021B3A',
  border:       '#D9DCE0',
  white:        '#FFFFFF',
  black:        '#000000',
};

// Dynamic hook — returns colors that respond to the current theme.
// Use this instead of the static Colors object in screen components.
export { useColors } from '../context/ThemeContext';
