'use client';

/* Whether a saved shoot is showing its summary or being edited: lets parts of the form
   (e.g. the "Shoot saved" card) offer a way back to the summary. Provided by FormChrome.jsx. */
import { createContext } from 'react';

export const ShootMode = createContext(null);
