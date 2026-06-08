import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import PasswordChangedScreen from '../screens/auth/PasswordChangedScreen';
import SignInOptionsScreen from '../screens/auth/SignInOptionsScreen';
import PostSignupPreferencesScreen from '../screens/auth/PostSignupPreferencesScreen';
import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import PhoneOTPScreen from '../screens/auth/PhoneOTPScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';
import { useTheme } from '../context/ThemeContext';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  PasswordChanged: undefined;
  SignInOptions: undefined;
  PostSignupPreferences: undefined;
  LanguageSelection: undefined;
  PhoneLogin: undefined;
  PhoneOTP: { phone: string };
  Terms: undefined;
  Privacy: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"                   component={LoginScreen} />
      <Stack.Screen name="Register"                component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword"          component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword"           component={ResetPasswordScreen} />
      <Stack.Screen name="PasswordChanged"         component={PasswordChangedScreen} />
      <Stack.Screen name="SignInOptions"           component={SignInOptionsScreen} />
      <Stack.Screen name="PostSignupPreferences"   component={PostSignupPreferencesScreen} />
      <Stack.Screen name="LanguageSelection"       component={LanguageSelectionScreen} />
      <Stack.Screen name="PhoneLogin"              component={PhoneLoginScreen} />
      <Stack.Screen name="PhoneOTP"                component={PhoneOTPScreen} />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '800' },
          title: 'Terms of Service',
        }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '800' },
          title: 'Privacy Policy',
        }}
      />
    </Stack.Navigator>
  );
}
