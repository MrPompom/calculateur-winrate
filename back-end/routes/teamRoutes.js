import express from 'express';
import { balanceTeams, balanceTeamsWithLanes } from '../controllers/teamController.js';

const router = express.Router();

router.post('/balance', balanceTeams);
router.post('/balancelanes', balanceTeamsWithLanes);

export default router;
