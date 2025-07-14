// =============================================================================
// STUDYBOT BACKEND - MIDDLEWARE REQUEST ID
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Interface pour étendre Request avec requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Middleware pour ajouter un ID unique à chaque requête
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Génerer un UUID v4 pour cette requête
  const id = uuidv4();
  
  // Ajouter l'ID à la requête
  req.requestId = id;
  
  // Ajouter l'ID aux headers de réponse pour le debugging
  res.set('X-Request-ID', id);
  
  next();
};

export default requestId; 