module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    extra: {
      ...config.expo.extra,
      apiHost: process.env.API_HOST ?? '',
    },
  },
});
