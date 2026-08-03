export const Colors = {
  primary:      '#021B3A',
  secondary:    '#C8D2DC',
  danger:       '#FF453A',
  success:      '#2ECC71',
  background:   '#050B18',
  surface:      '#0A1B33',
  surfaceLight: '#102A4C',
  text:         '#FFFFFF',
  textMuted:    '#8FA0B3',
  textDark:     '#021B3A',
  border:       '#1E3A5C',
  white:        '#FFFFFF',
  black:        '#000000',
};

// Dynamic hook — returns colors that respond to the current theme.
// Use this instead of the static Colors object in screen components.
export { useColors } from '../context/ThemeContext';
