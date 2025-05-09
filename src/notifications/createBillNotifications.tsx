// async function createBillNotifications(parentBills: { [parentId: string]: any[] }) {
//     const batch = writeBatch(db);
  
//     for (const [parentId, bills] of Object.entries(parentBills)) {
//       const notificationRef = doc(collection(db, "notifications"));
//       batch.set(notificationRef, {
//         createdAt: serverTimestamp(),
//         type: NotificationType.NEW_BILL,
//         recipientId: parentId,
//         isRead: false,
//         title: "New Bill Available",
//         message: `You have ${bills.length} new bill${bills.length > 1 ? "s" : ""}.`,
//         relatedData: {
//           billCount: bills.length,
//           totalAmount: bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
//           bills: bills.map((bill) => ({
//             billNumber: bill.billNumber,
//             amount: bill.totalAmount,
//             studentName: bill.studentName,
//             dueDate: bill.dueDate,
//           })),
//         },
//       });
//     }
  
//     await batch.commit();
//   }
  