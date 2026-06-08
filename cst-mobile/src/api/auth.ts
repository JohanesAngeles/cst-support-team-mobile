import client from './client';

export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    client.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),

  getMe: () => client.get('/auth/me'),

  verifyEmail: (code: string) => client.post('/auth/verify-email', { code }),

  resendVerification: () => client.post('/auth/resend-verification', {}),

  forgotPassword: (email: string) => client.post('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    client.post('/auth/reset-password', data),

  updateProfile: (data: { name?: string; phone?: string }) =>
    client.put('/auth/update-profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    client.put('/auth/change-password', data),

  uploadAvatar: (uri: string, mimeType = 'image/jpeg') => {
    const form = new FormData();
    form.append('avatar', { uri, name: 'avatar.jpg', type: mimeType } as any);
    return client.put('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAccount: (password: string) =>
    client.delete('/auth/me', { data: { password } }),

  sendPhoneOTP: (phone: string) =>
    client.post('/auth/send-phone-otp', { phone }),

  verifyPhoneOTP: (phone: string, otp: string) =>
    client.post('/auth/verify-phone-otp', { phone, otp }),
};
