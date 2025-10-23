import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, updateDoc, doc, where, getDocs, getDoc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { sendPushNotification as sendPushy } from '../notifications/pushyClient';
import { getAuth } from 'firebase/auth';

export type Message = {
    id: string;
    content: string;
    sender: string;
    timestamp: Timestamp;
    studentName?: string;
    parentName?: string;
    webUser?: string;
    type?: string; // Add type field to distinguish between 'text', 'image', 'pdf', 'word' messages
    fileName?: string; // Add fileName for file messages
    fileSize?: number; // Add fileSize for file messages
    fileType?: string; // Add fileType for file messages
};

export type Chat = {
    id: string;
    parentId: string;
    studentName: string;
    parentName: string;
    teacherId?: string; // Add teacher ID
    createdAt?: Date;
    lastMessage: string;
    lastMessageTime?: Date;
    lastMessageSender: string;
    lastMessageType?: string; // Add field to track message type (text/image)
    unread?: number; // Legacy field for backward compatibility
    unreadWeb?: number; // Unread count for web users
    unreadMobile?: number; // Unread count for mobile users
    image?: string;
    webUser: string;
    teacherName: string;
    childNames?: string[]; // Array of all children names for this parent
};

export class ChatService {
    // Get current user's teacher ID
    private static async getCurrentTeacherId(): Promise<string> {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('No user logged in');
        }

        // Query staff collection to find the staff document with matching email
        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where('teacherEmail', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('Staff document not found');
        }

        const staffData = querySnapshot.docs[0].data();
        return staffData.teacherID;
    }

    // Get current user's teacher name
    private static async getCurrentTeacherName(): Promise<string> {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('No user logged in');
        }

        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where('teacherEmail', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('Staff document not found');
        }

        const staffData = querySnapshot.docs[0].data();
        return staffData.teacherName || 'Teacher';
    }

    // Get all children names for a specific parent
    private static async getChildrenForParent(parentId: string): Promise<string[]> {
        try {
            const childrenNames: string[] = [];

            // Query all classes to find students with matching parentId
            const classesRef = collection(db, 'classes');
            const classesSnapshot = await getDocs(classesRef);

            for (const classDoc of classesSnapshot.docs) {
                const studentsRef = collection(db, 'classes', classDoc.id, 'students');
                const studentsQuery = query(studentsRef, where('parentId', '==', parentId));
                const studentsSnapshot = await getDocs(studentsQuery);

                studentsSnapshot.forEach(studentDoc => {
                    const studentData = studentDoc.data();
                    if (studentData.name) {
                        childrenNames.push(studentData.name);
                    }
                });
            }

            // Remove duplicates and sort
            return Array.from(new Set(childrenNames)).sort();
        } catch (error) {
            console.error('Error getting children for parent:', error);
            return [];
        }
    }

    // Create a new chat message
    static async sendMessage(
        chatId: string,
        message: {
            content: string;
            sender: string;
            studentName: string;
            parentName: string;
            webUser: string;
            teacherName: string;
            type?: string; // Add optional type field for message type
        }
    ) {
        try {
            const teacherId = await ChatService.getCurrentTeacherId();
            const chatRef = collection(db, 'chats', chatId, 'messages');
            const messageDoc = await addDoc(chatRef, {
                ...message,
                sender: message.teacherName, // Use the teacher name passed in the message
                webUser: teacherId,
                timestamp: serverTimestamp(),
                isRead: false,
            });

            // Get current chat data to properly handle unread counts
            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            const chatData = chatDoc.exists() ? chatDoc.data() : {};

            // Increment unread count for mobile user (parent) when web user sends message
            const currentMobileUnread = chatData.unreadMobile || 0;
            const newMobileUnread = currentMobileUnread + 1;

            // Update the chat document with the latest message info and unread count
            await updateDoc(chatDocRef, {
                lastMessage: message.content,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: message.teacherName, // Use the teacher name from message
                lastMessageType: message.type || 'text', // Add message type
                webUser: teacherId,
                unreadMobile: newMobileUnread, // Increment unread for mobile user
                unreadWeb: 0, // Reset web unread since web user sent the message
                teacherName: message.teacherName, // Use the teacher name from message
            });

            // Send push notification to parent via Pushy helper
            if (chatData.parentId) {
                await sendPushy(db, {
                    parentId: chatData.parentId,
                    type: 'chat',
                    title: `New Message From ${message.teacherName}`, // Use teacher name from message
                    message: message.content,
                    entityId: chatId,
                    // Provide structured fields so mobile can render proper names
                    teacherName: message.teacherName,
                    studentName: message.studentName,
                    parentName: message.parentName,
                    content: message.content,
                });
            }

            return messageDoc.id;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Create or get a unified chat per parentId + teacherId (following mobile app naming conventions)
    static async createOrGetUnifiedChat(parentId: string, teacherId: string, parentName: string, teacherName: string, childName?: string): Promise<string> {
        try {
            // Find existing unified chat for this parent-teacher pair (same logic as mobile app)
            const chatsRef = collection(db, 'chats');
            const q = query(chatsRef, where('parentId', '==', parentId), where('webUser', '==', teacherId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const chatDocRef = doc(db, 'chats', snap.docs[0].id);
                // Ensure childNames array contains current childName (similar to mobile app logic)
                if (childName && childName.trim()) {
                    const existing = snap.docs[0].data().childNames as string[] | undefined;
                    const updated = Array.from(new Set([...(existing || []), childName.trim()]));
                    await updateDoc(chatDocRef, {
                        childNames: updated,
                        studentName: updated.join(', ') // Update main studentName field
                    });
                }
                return snap.docs[0].id;
            }

            // Get all children for this parent to populate childNames (same as mobile app)
            const allChildren = await ChatService.getChildrenForParent(parentId);

            // Create new unified chat (following mobile app field structure)
            const chatRef = collection(db, 'chats');
            const chatDoc = await addDoc(chatRef, {
                parentId: parentId,
                parentName: parentName,
                studentName: allChildren.join(', '), // Store all children names (same as mobile)
                teacherName: teacherName, // Match mobile app field name
                webUser: teacherId, // Add webUser field to match mobile app
                childNames: allChildren, // Store as array for easier manipulation (same as mobile)
                createdAt: serverTimestamp(),
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp(),
                lastMessageSender: teacherName, // Use teacherName instead of parentName (fix inconsistency)
                lastMessageType: 'text', // Add message type field (same as mobile)
                unread: 0, // Legacy field for backward compatibility
                unreadWeb: 0, // Unread count for web users
                unreadMobile: 0, // Unread count for mobile users
            });
            return chatDoc.id;
        } catch (error) {
            console.error('Error create/get unified chat:', error);
            throw error;
        }
    }

    // Send a file message
    static async sendFileMessage(
        chatId: string,
        fileMessage: {
            content: string; // File URL
            fileName: string;
            fileSize: number;
            fileType: string;
            sender: string;
            studentName: string;
            parentName: string;
            webUser: string;
            teacherName: string;
            type: string; // 'image', 'pdf', 'word'
        }
    ) {
        try {
            const teacherId = await ChatService.getCurrentTeacherId();
            const chatRef = collection(db, 'chats', chatId, 'messages');
            const messageDoc = await addDoc(chatRef, {
                ...fileMessage,
                sender: fileMessage.teacherName,
                webUser: teacherId,
                timestamp: serverTimestamp(),
                isRead: false,
            });

            // Get current chat data to properly handle unread counts
            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            const chatData = chatDoc.exists() ? chatDoc.data() : {};

            // Increment unread count for mobile user (parent) when web user sends message
            const currentMobileUnread = chatData.unreadMobile || 0;
            const newMobileUnread = currentMobileUnread + 1;

            // Update the chat document with the latest message info and unread count
            await updateDoc(chatDocRef, {
                lastMessage: `📎 ${fileMessage.fileName}`,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: fileMessage.teacherName,
                lastMessageType: fileMessage.type,
                webUser: teacherId,
                unreadMobile: newMobileUnread,
                unreadWeb: 0,
                teacherName: fileMessage.teacherName,
            });

            // Send push notification to parent via Pushy helper
            if (chatData.parentId) {
                await sendPushy(db, {
                    parentId: chatData.parentId,
                    type: 'chat',
                    title: `New Message From ${fileMessage.teacherName}`,
                    message: `📎 ${fileMessage.fileName}`,
                    entityId: chatId,
                    teacherName: fileMessage.teacherName,
                    studentName: fileMessage.studentName,
                    parentName: fileMessage.parentName,
                    content: `📎 ${fileMessage.fileName}`,
                });
            }

            return messageDoc.id;
        } catch (error) {
            console.error('Error sending file message:', error);
            throw error;
        }
    }

    // Subscribe to chat messages (filtered by current teacher)
    static subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
        // Get current teacher ID to filter messages
        ChatService.getCurrentTeacherId().then(currentTeacherId => {
            const chatRef = collection(db, 'chats', chatId, 'messages');

            // Query messages where webUser matches current teacher OR messages from mobile (parent)
            // We want to show: 1) Messages sent by current teacher, 2) Messages from parent to current teacher
            const q = query(chatRef, orderBy('timestamp', 'asc'));

            return onSnapshot(q, (snapshot) => {
                const messages: Message[] = [];

                snapshot.forEach((doc) => {
                    const messageData = doc.data() as Message;

                    // Include message if:
                    // 1. It was sent by current teacher (webUser matches)
                    // 2. It was sent by parent (no webUser field or webUser is empty) to this chat
                    const isFromCurrentTeacher = messageData.webUser === currentTeacherId;
                    const isFromParent = !messageData.webUser || messageData.webUser === '';

                    if (isFromCurrentTeacher || isFromParent) {
                        messages.push({
                            ...messageData,
                            id: doc.id,
                        });
                    }
                });
                callback(messages);
            });
        }).catch(error => {
            console.error('Error getting current teacher ID:', error);
            callback([]); // Return empty array on error
        });

        // Return dummy unsubscribe function - in real implementation you'd handle this properly
        return () => { };
    }


    // Create or get existing chat for teacher-parent pair (following mobile app naming conventions)
    static async createChat(parentId: string, studentName: string, parentName: string) {
        try {
            const teacherId = await ChatService.getCurrentTeacherId();
            const teacherName = await ChatService.getCurrentTeacherName();

            // Check if a chat already exists for this parent-teacher pair (same logic as mobile app)
            const chatsRef = collection(db, 'chats');
            const q = query(chatsRef, where('parentId', '==', parentId), where('webUser', '==', teacherId));
            const existingChats = await getDocs(q);

            if (!existingChats.empty) {
                // Chat already exists, return the existing chat ID and update childNames if needed
                const existingChatDoc = existingChats.docs[0];
                const existingData = existingChatDoc.data();

                // Update childNames if needed (similar to mobile app logic)
                const existingChildNames = existingData.childNames as string[] || [];
                if (studentName && studentName.trim() && !existingChildNames.includes(studentName.trim())) {
                    const updatedChildNames = [...existingChildNames, studentName.trim()];
                    await updateDoc(doc(db, 'chats', existingChatDoc.id), {
                        childNames: updatedChildNames,
                        studentName: updatedChildNames.join(', ') // Update main studentName field
                    });
                }

                return existingChatDoc.id;
            }

            // Get all children for this parent to populate childNames (same as mobile app)
            const allChildren = await ChatService.getChildrenForParent(parentId);

            // Create new chat if none exists (following mobile app field structure)
            const chatRef = collection(db, 'chats');
            const chatDoc = await addDoc(chatRef, {
                parentId: parentId,
                studentName: allChildren.join(', '), // Store all children names (same as mobile)
                parentName: parentName,
                teacherName: teacherName, // Match mobile app field name
                webUser: teacherId, // Add webUser field to match mobile app
                childNames: allChildren, // Store as array for easier manipulation (same as mobile)
                createdAt: serverTimestamp(),
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp(),
                lastMessageSender: teacherName, // Use teacherName instead of parentName (fix inconsistency)
                lastMessageType: 'text', // Add message type field (same as mobile)
                unread: 0, // Legacy field for backward compatibility
                unreadWeb: 0, // Unread count for web users
                unreadMobile: 0, // Unread count for mobile users
            });
            return chatDoc.id;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    }

    // Subscribe to chat list updates (filtered by current teacher)
    static subscribeToChats(callback: (chats: Chat[]) => void) {
        // Get current teacher ID and filter chats at the database level
        ChatService.getCurrentTeacherId().then(currentTeacherId => {
            const chatsRef = collection(db, 'chats');
            const q = query(
                chatsRef,
                where('webUser', '==', currentTeacherId),
                orderBy('lastMessageTime', 'desc')
            );

            return onSnapshot(q, (snapshot) => {
                const chats: Chat[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    chats.push({
                        id: doc.id,
                        parentId: data.parentId,
                        studentName: data.studentName,
                        parentName: data.parentName,
                        teacherId: data.teacherId,
                        createdAt: data.createdAt?.toDate(),
                        lastMessage: data.lastMessage,
                        lastMessageTime: data.lastMessageTime?.toDate(),
                        lastMessageSender: data.lastMessageSender,
                        lastMessageType: data.lastMessageType,
                        unread: data.unread || 0,
                        unreadWeb: data.unreadWeb || 0,
                        unreadMobile: data.unreadMobile || 0,
                        image: data.image,
                        webUser: data.webUser,
                        teacherName: data.teacherName,
                        childNames: data.childNames || [], // Include childNames array
                    });
                });
                callback(chats);
            });
        }).catch(error => {
            console.error('Error getting current teacher ID for chats:', error);
            callback([]); // Return empty array on error
        });

        // Return dummy unsubscribe function
        return () => { };
    }

    // Get chats by parent ID (for mobile app compatibility)
    static subscribeToParentChats(parentId: string, callback: (chats: Chat[]) => void) {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('parentId', '==', parentId),
            orderBy('lastMessageTime', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const chats: Chat[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                chats.push({
                    id: doc.id,
                    parentId: data.parentId,
                    studentName: data.studentName,
                    parentName: data.parentName,
                    teacherId: data.teacherId,
                    createdAt: data.createdAt?.toDate(),
                    lastMessage: data.lastMessage,
                    lastMessageTime: data.lastMessageTime?.toDate(),
                    lastMessageSender: data.lastMessageSender,
                    lastMessageType: data.lastMessageType,
                    unread: data.unread || 0,
                    unreadWeb: data.unreadWeb || 0,
                    unreadMobile: data.unreadMobile || 0,
                    image: data.image,
                    webUser: data.webUser,
                    teacherName: data.teacherName,
                });
            });
            callback(chats);
        });
    }

    // Update unread count
    static async updateUnreadCount(chatId: string, increment: boolean = true) {
        try {
            const chatDocRef = doc(db, 'chats', chatId);
            await updateDoc(chatDocRef, {
                unread: increment ? increment : 0
            });
        } catch (error) {
            console.error('Error updating unread count:', error);
            throw error;
        }
    }

    // Mark chat as read for web user (teacher/admin)
    static async markChatAsRead(chatId: string) {
        try {
            const chatDocRef = doc(db, 'chats', chatId);
            await updateDoc(chatDocRef, {
                unreadWeb: 0, // Reset web unread count
            });
        } catch (error) {
            console.error('Error marking chat as read:', error);
            throw error;
        }
    }

    // Delete a message
    static async deleteMessage(chatId: string, messageId: string) {
        try {
            const currentTeacherId = await ChatService.getCurrentTeacherId();

            // Get the message to verify ownership
            const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
            const messageDoc = await getDoc(messageRef);

            if (!messageDoc.exists()) {
                throw new Error('Message not found');
            }

            const messageData = messageDoc.data();
            if (messageData.webUser !== currentTeacherId) {
                throw new Error('You can only delete your own messages');
            }

            // Delete the message
            await deleteDoc(messageRef);

            // Check if this was the last message and update chat document accordingly
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const lastMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
            const lastMessageSnapshot = await getDocs(lastMessageQuery);

            const chatDocRef = doc(db, 'chats', chatId);

            if (!lastMessageSnapshot.empty) {
                // Update with the new last message
                const lastMessage = lastMessageSnapshot.docs[0].data();
                await updateDoc(chatDocRef, {
                    lastMessage: lastMessage.content,
                    lastMessageTime: lastMessage.timestamp,
                    lastMessageSender: lastMessage.sender,
                    lastMessageType: lastMessage.type || 'text',
                });
            } else {
                // No messages left, reset to default
                const teacherName = await ChatService.getCurrentTeacherName();
                await updateDoc(chatDocRef, {
                    lastMessage: 'Chat started',
                    lastMessageTime: serverTimestamp(),
                    lastMessageSender: teacherName,
                    lastMessageType: 'text',
                });
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    // Send a video message
    static async sendVideoMessage(
        chatId: string,
        videoMessage: {
            content: string; // Video URL
            fileName: string;
            fileSize: number;
            fileType: string;
            sender: string;
            studentName: string;
            parentName: string;
            webUser: string;
            teacherName: string;
            type: string; // 'video'
        }
    ) {
        try {
            const teacherId = await ChatService.getCurrentTeacherId();
            const chatRef = collection(db, 'chats', chatId, 'messages');
            const messageDoc = await addDoc(chatRef, {
                ...videoMessage,
                sender: videoMessage.teacherName,
                webUser: teacherId,
                timestamp: serverTimestamp(),
                isRead: false,
            });

            // Get current chat data to properly handle unread counts
            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            const chatData = chatDoc.exists() ? chatDoc.data() : {};

            // Increment unread count for mobile user (parent) when web user sends message
            const currentMobileUnread = chatData.unreadMobile || 0;
            const newMobileUnread = currentMobileUnread + 1;

            // Update the chat document with the latest message info and unread count
            await updateDoc(chatDocRef, {
                lastMessage: `🎥 ${videoMessage.fileName}`,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: videoMessage.teacherName,
                lastMessageType: videoMessage.type,
                webUser: teacherId,
                unreadMobile: newMobileUnread,
                unreadWeb: 0,
                teacherName: videoMessage.teacherName,
            });

            // Send push notification to parent via Pushy helper
            if (chatData.parentId) {
                await sendPushy(db, {
                    parentId: chatData.parentId,
                    type: 'chat',
                    title: `New Message From ${videoMessage.teacherName}`,
                    message: `🎥 ${videoMessage.fileName}`,
                    entityId: chatId,
                    teacherName: videoMessage.teacherName,
                    studentName: videoMessage.studentName,
                    parentName: videoMessage.parentName,
                    content: `🎥 ${videoMessage.fileName}`,
                });
            }

            return messageDoc.id;
        } catch (error) {
            console.error('Error sending video message:', error);
            throw error;
        }
    }

    // (Push notifications now use pushyClient.ts via sendPushNotification)
}