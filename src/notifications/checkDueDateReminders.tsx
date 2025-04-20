// export const checkDueDateReminders = functions.pubsub
//   .schedule("0 9 * * *") // Daily at 9:00 AM
//   .timeZone("Asia/Kuala_Lumpur")
//   .onRun(async () => {
//     const today = new Date();
//     const reminderDate = new Date();
//     reminderDate.setDate(today.getDate() + 3);

//     const reminderDateString = reminderDate.toISOString().split("T")[0];

//     const billsQuery = query(
//       collection(db, "bills"),
//       where("dueDate", "==", reminderDateString),
//       where("paymentStatus", "==", "unpaid")
//     );

//     const billsSnapshot = await getDocs(billsQuery);
//     const parentBills: { [parentId: string]: any[] } = {};

//     billsSnapshot.forEach((doc) => {
//       const bill = doc.data();
//       if (!parentBills[bill.parentId]) {
//         parentBills[bill.parentId] = [];
//       }
//       parentBills[bill.parentId].push({
//         billId: doc.id,
//         billNumber: bill.billNumber,
//         amount: bill.totalAmount,
//         studentName: bill.studentName,
//         dueDate: bill.dueDate
//       });
//     });

//     const batch = writeBatch(db);

//     for (const [parentId, bills] of Object.entries(parentBills)) {
//       const notificationRef = doc(collection(db, "notifications"));

//       batch.set(notificationRef, {
//         createdAt: serverTimestamp(),
//         type: NotificationType.BILL_REMINDER,
//         recipientId: parentId,
//         isRead: false,
//         title: "Payment Reminder",
//         message: `You have ${bills.length} ${bills.length > 1 ? "bills" : "bill"} due in 3 days.`,
//         relatedData: {
//           bills,
//           daysRemaining: 3,
//         },
//       });
//     }

//     await batch.commit();
//   });
