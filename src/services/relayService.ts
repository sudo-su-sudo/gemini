import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

/**
 * Relay Service for AVH-01
 * Uses Firebase Firestore as a public/private relay.
 */

export interface RelayState {
  logs: any[];
  stats: any;
  fs: any;
  terminalOutput: string;
  timestamp: string;
  ownerId?: string | null;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let currentRelayId: string | null = localStorage.getItem('avh_relay_id');

export const getRelayUrl = () => {
  return currentRelayId;
};

export const syncToRelay = async (state: RelayState): Promise<string | null> => {
  try {
    if (!currentRelayId) {
      currentRelayId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('avh_relay_id', currentRelayId);
    }

    const path = `relays/${currentRelayId}`;
    const payload = {
      ...state,
      ownerId: auth.currentUser?.uid || null,
      timestamp: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'relays', currentRelayId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    
    return currentRelayId;
  } catch (error) {
    console.error("Relay Sync Failed:", error);
    return null;
  }
};

export const resetRelay = () => {
  currentRelayId = null;
  localStorage.removeItem('avh_relay_id');
};
