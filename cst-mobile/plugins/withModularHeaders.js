const { withPodfile } = require('@expo/config-plugins');

// @react-native-google-signin/google-signin pulls in Google's iOS SDK, whose
// Swift pods (AppCheckCore -> GoogleUtilities, RecaptchaInterop) fail to build
// as static libraries without modular headers enabled — CocoaPods itself
// suggests this exact fix in the build error.
module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    if (!config.modResults.contents.includes('use_modular_headers!')) {
      config.modResults.contents = config.modResults.contents.replace(
        /^(platform :ios.*)$/m,
        `$1\nuse_modular_headers!`
      );
    }
    return config;
  });
};
