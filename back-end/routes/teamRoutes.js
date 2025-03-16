import express from 'express';
import { balanceTeams, balanceTeamsWithLanes, balanceTeamsWithRiotRanks } from '../controllers/teamController.js';

const router = express.Router();

router.post('/balance', balanceTeams);
router.post('/balancelanes', balanceTeamsWithLanes);
router.post('/riot-ranks', balanceTeamsWithRiotRanks);

export default router;
