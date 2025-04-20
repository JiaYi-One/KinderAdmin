// import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
// import { db } from "../firebase";

// async function sendGeneralNotification(
//     recipientIds: string[],
//     title: string,
//     message: string,
//     eventDate?: Date
//   ) {
//     const batch = writeBatch(db);
    
//     for (const recipientId of recipientIds) {
//       const notificationRef = doc(collection(db, "notifications"));
//       batch.set(notificationRef, {
//         createdAt: serverTimestamp(),
//         type: NotificationType.GENERAL,
//         recipientId,
//         isRead: false,
//         title,
//         message,
//         relatedData: eventDate ? { eventDate } : undefined,
//       });
//     }
    
//     await batch.commit();
//   }
  