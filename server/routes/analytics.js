import { Router } from 'express';
import { getAnalytics } from '../services/analyticsService.js';

export const analyticsRouter = Router();
analyticsRouter.get('/', async (req, res) => {
  try {
    res.json({ status: 'success', data: await getAnalytics() });
  } catch (error) {
    console.error('[AnalyticsRoute] Failed to load analytics:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve analytics' });
  }
});
