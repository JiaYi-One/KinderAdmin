import axios from "axios";
import { doc, getDoc, Firestore, getDocs, collection, query, where } from "firebase/firestore";

export interface PushNotificationPayload {
  parentId: string;
  message: string;
  type?: "new_bill" | "announcement" | "report" | "chat" | "reminder";
  title?: string;
  entityId?: string;
  announcementId?: string; // Add announcement ID field
  billCount?: number;
  totalAmount?: number;
  parentEmail?: string;
  billNumbers?: string[];
  // Chat-specific optional fields
  teacherName?: string;
  studentName?: string;
  parentName?: string;
  content?: string;
  // Reminder-specific optional fields
  daysRemaining?: number;
  isOverdue?: boolean;
  // Bill-specific optional fields
  studentId?: string;
  classId?: string;
  billDate?: string;
  dueDate?: string;
}

export interface SendOptions {
  deviceTokens?: string[];
  timeoutMs?: number;
}

async function fetchParentDeviceTokens(
  db: Firestore,
  parentId: string,
  parentEmail?: string
): Promise<string[]> {
  console.log(`🔍 Searching for device tokens for parent: ${parentId}${parentEmail ? ` (email: ${parentEmail})` : ''}`);

  // 1) Try direct doc by id
  try {
    console.log(`📋 Trying direct lookup: parents/${parentId}`);
    const parentRef = doc(db, "parents", parentId);
    const parentSnap = await getDoc(parentRef);

    if (parentSnap.exists()) {
      console.log(`✅ Found parent document by ID`);
      const data = parentSnap.data();
      console.log(`📱 Parent data:`, {
        email: data?.email,
        name: data?.name,
        hasDeviceTokens: Array.isArray(data?.deviceTokens),
        tokenCount: Array.isArray(data?.deviceTokens) ? data.deviceTokens.length : 0
      });

      const tokensById = data?.deviceTokens;
      if (Array.isArray(tokensById) && tokensById.length > 0) {
        console.log(`✅ Found ${tokensById.length} device tokens via direct lookup`);
        return tokensById as string[];
      } else {
        console.log(`❌ No device tokens in parent document (direct lookup)`);
      }
    } else {
      console.log(`❌ Parent document not found by ID: ${parentId}`);
    }
  } catch (error) {
    console.error(`❌ Error in direct lookup:`, error);
  }

  // 2) Try lookup by email if provided
  if (parentEmail && parentEmail.trim().length > 0) {
    try {
      console.log(`📧 Trying email lookup: ${parentEmail.trim()}`);
      const q = query(
        collection(db, "parents"),
        where("email", "==", parentEmail.trim())
      );
      const snap = await getDocs(q);
      console.log(`📋 Email query returned ${snap.docs.length} documents`);

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        console.log(`📄 Email match found - doc ID: ${docSnap.id}, tokens: ${Array.isArray(data?.deviceTokens) ? data.deviceTokens.length : 0}`);
        const tokens = data?.deviceTokens;
        if (Array.isArray(tokens) && tokens.length > 0) {
          console.log(`✅ Found ${tokens.length} device tokens via email lookup`);
          return tokens as string[];
        }
      }
      console.log(`❌ No device tokens found via email lookup`);
    } catch (error) {
      console.error(`❌ Error in email lookup:`, error);
    }
  }

  // 3) Fallback: some apps store parent doc with authUid as the doc id
  try {
    console.log(`🔐 Trying authUid lookup: ${parentId}`);
    const q = query(
      collection(db, "parents"),
      where("authUid", "==", parentId)
    );
    const snap = await getDocs(q);
    console.log(`📋 AuthUid query returned ${snap.docs.length} documents`);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      console.log(`📄 AuthUid match found - doc ID: ${docSnap.id}, tokens: ${Array.isArray(data?.deviceTokens) ? data.deviceTokens.length : 0}`);
      const tokens = data?.deviceTokens;
      if (Array.isArray(tokens) && tokens.length > 0) {
        console.log(`✅ Found ${tokens.length} device tokens via authUid lookup`);
        return tokens as string[];
      }
    }
    console.log(`❌ No device tokens found via authUid lookup`);
  } catch (error) {
    console.error(`❌ Error in authUid lookup:`, error);
  }

  console.log(`❌ No device tokens found for parent ${parentId} using any method`);
  return [];
}

export async function sendPushNotification(
  db: Firestore,
  payload: PushNotificationPayload,
  options: SendOptions = {}
): Promise<boolean> {
  const { parentId } = payload;
  const timeout = options.timeoutMs ?? 5000;

  console.log(`🔔 Attempting to send notification to parent ${parentId}`);
  console.log(`📝 Message: ${payload.message?.substring(0, 50)}...`);

  const deviceTokens =
    options.deviceTokens ?? (await fetchParentDeviceTokens(db, parentId, payload.parentEmail));

  if (deviceTokens.length === 0) {
    console.warn(`❌ No device tokens found for parent ${parentId}${payload.parentEmail ? ` (email: ${payload.parentEmail})` : ''}`);
    return false;
  }

  console.log(`📱 Found ${deviceTokens.length} device token(s) for parent ${parentId}`);

  const endpoint = (import.meta.env?.VITE_PUSHY_URL as string | undefined) || "http://localhost:5000/pushy";
  const body = { ...payload, deviceTokens };

  try {
    console.log(`🌐 Sending to endpoint: ${endpoint}`);
    const response = await axios.post(endpoint, body, { timeout });
    console.log(`✅ Notification sent successfully:`, response.data);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification:`, error);
    if (axios.isAxiosError(error)) {
      console.error(`Response status: ${error.response?.status}`);
      console.error(`Response data:`, error.response?.data);
    }
    return false;
  }
}


