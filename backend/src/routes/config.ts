import { Router, Request, Response } from 'express';
import { getOrCreateConfig } from '../models/AppConfig';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const config = await getOrCreateConfig();
  res.json({
    maintenanceMode:    config.maintenanceMode,
    maintenanceMessage: config.maintenanceMessage,
    minVersion:         config.minVersion,
    storeUrls:          config.storeUrls,
    featureFlags:       Object.fromEntries(config.featureFlags ?? new Map()),
  });
});

export default router;
