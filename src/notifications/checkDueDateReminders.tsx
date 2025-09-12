import { Firestore, collection, getDocs, query, where, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendPushNotification } from "./pushyClient";


function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const ms = due.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Invoke this from an admin UI or a scheduled job runner to send reminders
export async function runDueDateReminders(db: Firestore): Promise<{ sent: number; candidates: number; }> {
  console.log("🔔 Starting due date reminders check...");
  
  const billsQuery = query(
    collection(db, "bills"),
    where("paymentStatus", "==", "unpaid")
  );

  const snap = await getDocs(billsQuery);
  console.log(`📋 Found ${snap.docs.length} unpaid bills to check`);

  type Candidate = {
    parentId: string;
    parentEmail?: string;
    billNumber: string;
    totalAmount: number;
    studentName: string;
    dueDate: string;
    daysRemaining: number;
  };

  const candidates: Candidate[] = [];

  type BillDoc = {
    parentId: string;
    parentEmail?: string;
    billNumber: string;
    totalAmount: number;
    studentName: string;
    dueDate?: string;
    paymentStatus: string;
  };

  snap.forEach((docSnap) => {
    const bill = docSnap.data() as BillDoc;
    const dueDate: string | undefined = bill.dueDate;
    if (!dueDate) {
      console.log(`⚠️ Bill ${bill.billNumber} has no due date, skipping`);
      return;
    }
    const remaining = daysUntil(dueDate);
    
    console.log(`📊 Bill ${bill.billNumber}: ${remaining} days remaining (Parent: ${bill.parentId}, Email: ${bill.parentEmail || 'none'})`);
    
    // Include ALL unpaid bills for comprehensive reminders
    // - Overdue bills (negative days) - URGENT
    // - Due soon (0-3 days) - REMINDER  
    // - Future bills (>3 days) - INFORMATIONAL (optional)
    
    if (remaining < 0) {
      // Overdue bills - always include
      console.log(`🚨 Adding OVERDUE bill ${bill.billNumber} (${Math.abs(remaining)} days overdue)`);
      candidates.push({
        parentId: bill.parentId,
        parentEmail: bill.parentEmail,
        billNumber: bill.billNumber,
        totalAmount: bill.totalAmount,
        studentName: bill.studentName,
        dueDate: dueDate,
        daysRemaining: remaining,
      });
    } else if (remaining <= 3) {
      // Due within 3 days - always include
      console.log(`⏰ Adding DUE SOON bill ${bill.billNumber} (${remaining} days remaining)`);
      candidates.push({
        parentId: bill.parentId,
        parentEmail: bill.parentEmail,
        billNumber: bill.billNumber,
        totalAmount: bill.totalAmount,
        studentName: bill.studentName,
        dueDate: dueDate,
        daysRemaining: remaining,
      });
    } else {
      console.log(`📅 Skipping bill ${bill.billNumber} (${remaining} days remaining - too far in future)`);
    }
  });

  console.log(`🎯 Found ${candidates.length} bills requiring reminders`);
  console.log(`📧 Sending individual reminders for each bill...`);

  let sent = 0;
  for (const bill of candidates) {
    // Create individual message for each bill
    let title = "Payment Reminder";
    let message = "";
    
    if (bill.daysRemaining < 0) {
      // Overdue bill
      const daysOverdue = Math.abs(bill.daysRemaining);
      title = "⚠️ Overdue Payment Alert";
      message = `URGENT: ${bill.studentName}'s bill (${bill.billNumber}) is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue! Amount: RM${bill.totalAmount.toFixed(2)}. Please pay immediately to avoid additional charges.`;
    } else if (bill.daysRemaining === 0) {
      // Due today
      title = "⏰ Payment Due Today";
      message = `${bill.studentName}'s bill (${bill.billNumber}) is due TODAY! Amount: RM${bill.totalAmount.toFixed(2)}. Please pay now to avoid late fees.`;
    } else if (bill.daysRemaining === 1) {
      // Due tomorrow
      title = "⏰ Payment Due Tomorrow";
      message = `${bill.studentName}'s bill (${bill.billNumber}) is due TOMORROW! Amount: RM${bill.totalAmount.toFixed(2)}. Please pay on time to avoid late fees.`;
    } else {
      // Due in 2-3 days
      title = "📅 Payment Reminder";
      message = `${bill.studentName}'s bill (${bill.billNumber}) is due in ${bill.daysRemaining} days. Amount: RM${bill.totalAmount.toFixed(2)}. Please pay on time to avoid late fees.`;
    }

    console.log(`📤 Sending individual reminder for bill ${bill.billNumber} to parent ${bill.parentId}`);

    // Save individual Firestore notification record for each bill
    try {
      const notificationDocRef = doc(collection(db, "notifications"));
      const notificationRecord = {
        type: "reminder",
        parentId: bill.parentId,
        isRead: false,
        createdAt: serverTimestamp(),
        message,
        billCount: 1,
        totalAmount: bill.totalAmount,
        billNumber: bill.billNumber, // Add individual bill number for easy reference
        dueDate: bill.dueDate,
        studentName: bill.studentName,
        daysRemaining: bill.daysRemaining,
        isOverdue: bill.daysRemaining < 0,
        bills: [{
          amount: bill.totalAmount,
          billDate: bill.dueDate, // Use dueDate instead of undefined
          billNumber: bill.billNumber,
          dueDate: bill.dueDate,
          studentName: bill.studentName,
        }],
      };
      await setDoc(notificationDocRef, notificationRecord);
    } catch (err) {
      // Best-effort: continue even if notification record write fails
      console.warn(`Failed to write reminder notification record for bill ${bill.billNumber}`, err);
    }

    // Send individual push notification for each bill
    const ok = await sendPushNotification(db, {
      parentId: bill.parentId,
      type: "reminder", // Use reminder type to distinguish from new bill notifications
      title,
      message,
      billCount: 1,
      totalAmount: bill.totalAmount,
      billNumbers: [bill.billNumber],
      entityId: bill.billNumber, // Always include bill number for direct navigation
      daysRemaining: bill.daysRemaining,
      isOverdue: bill.daysRemaining < 0,
      ...(bill.parentEmail ? { parentEmail: bill.parentEmail } : {}),
    });
    
    if (ok) {
      sent++;
      console.log(`✅ Individual reminder sent successfully for bill ${bill.billNumber}`);
    } else {
      console.log(`❌ Failed to send individual reminder for bill ${bill.billNumber}`);
    }
  }

  console.log(`🎉 Reminder process completed: ${sent}/${candidates.length} individual bill reminders sent`);
  return { sent, candidates: candidates.length };
}