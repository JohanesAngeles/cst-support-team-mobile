import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minVersion: { ios: string; android: string };
  storeUrls: { ios?: string; android?: string };
  featureFlags: Map<string, boolean>;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    maintenanceMode:    { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "We're making some improvements. Please check back shortly." },
    minVersion: {
      ios:     { type: String, default: '0.0.0' },
      android: { type: String, default: '0.0.0' },
    },
    storeUrls: {
      ios:     { type: String },
      android: { type: String },
    },
    featureFlags: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true }
);

const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);

export const getOrCreateConfig = async (): Promise<IAppConfig> => {
  let config = await AppConfig.findOne();
  if (!config) config = await AppConfig.create({});
  return config;
};

export default AppConfig;
