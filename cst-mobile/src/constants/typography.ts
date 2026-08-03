import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

// Poppins carries body copy; Bebas Neue is reserved for short, bold,
// ALL-CAPS headline/display text (it has no real lowercase design, so it
// should never be used for sentences or mixed-case labels).
export const FONTS = {
  body:          'Poppins_400Regular',
  bodyMedium:    'Poppins_500Medium',
  bodySemiBold:  'Poppins_600SemiBold',
  bodyBold:      'Poppins_700Bold',
  bodyExtraBold: 'Poppins_800ExtraBold',
  bodyBlack:     'Poppins_900Black',
  display:       'BebasNeue_400Regular',
};

export const FONTS_TO_LOAD = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  BebasNeue_400Regular,
};
