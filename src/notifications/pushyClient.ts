import axios from "axios";
import { doc, getDoc, Firestore } from "firebase/firestore";

export interface PushNotificationPayload {
  parentId: string;
  message: string;
  type?: "new_bill" | "announcement" | "report" | "chat" ;
  title?: string;
  entityId?: string;
  billCount?: number;
  totalAmount?: number;
  parentEmail?: string;
}

export interface SendOptions {
  deviceTokens?: string[];
  timeoutMs?: number;
}

async function fetchParentDeviceTokens(db: Firestore, parentId: string): Promise<string[]> {
  const parentRef = doc(db, "parents", parentId);
  const parentSnap = await getDoc(parentRef);
  const tokens = parentSnap.data()?.deviceTokens;
  return Array.isArray(tokens) ? (tokens as string[]) : [];
}

export async function sendPushNotification(
  db: Firestore,
  payload: PushNotificationPayload,
  options: SendOptions = {}
): Promise<boolean> {
  const { parentId } = payload;
  const timeout = options.timeoutMs ?? 5000;

  const deviceTokens = options.deviceTokens ?? (await fetchParentDeviceTokens(db, parentId));
  if (deviceTokens.length === 0) {
    console.warn(`No device tokens for parent ${parentId}`);
    return false;
  }

  const endpoint = (import.meta.env?.VITE_PUSHY_URL as string | undefined) || "http://localhost:5000/pushy";
  const body = { ...payload, deviceTokens };
  try {
    await axios.post(endpoint, body, { timeout });
    return true;
  } catch {
    return false;
  }
}


