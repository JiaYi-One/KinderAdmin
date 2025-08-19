import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, updateDoc, doc, where, getDocs, getDoc } from 'firebase/firestore';
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
};

export type Chat = {
    id: string;
    parentId: string;
    studentName: string;
    parentName: string;
    createdAt?: Date;
    lastMessage: string;
    lastMessageTime?: Date;
    lastMessageSender: string;
    unread?: number; // Legacy field for backward compatibility
    unreadWeb?: number; // Unread count for web users
    unreadMobile?: number; // Unread count for mobile users
    image?: string;
    webUser: string;
    teacherName: string;
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
        }
    ) {
        try {
            const teacherId = await this.getCurrentTeacherId();
            const teacherName = await this.getCurrentTeacherName();
            const chatRef = collection(db, 'chats', chatId, 'messages');
            const messageDoc = await addDoc(chatRef, {
                ...message,
                sender: teacherName, // override with actual teacher name
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
                lastMessageSender: teacherName,
                webUser: teacherId,
                unreadMobile: newMobileUnread, // Increment unread for mobile user
                unreadWeb: 0, // Reset web unread since web user sent the message
                teacherName: teacherName,
            });

            // Send push notification to parent via Pushy helper
            if (chatData.parentId) {
                await sendPushy(db, {
                    parentId: chatData.parentId,
                    type: 'chat',
                    title: `New message from ${teacherName}`,
                    message: message.content,
                    entityId: chatId,
                });
            }

            return messageDoc.id;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Subscribe to chat messages
    static subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
        const chatRef = collection(db, 'chats', chatId, 'messages');
        const q = query(chatRef, orderBy('timestamp', 'asc'));

        return onSnapshot(q, (snapshot) => {
            const messages: Message[] = [];
            snapshot.forEach((doc) => {
                messages.push({
                    id: doc.id,
                    ...doc.data(),
                } as Message);
            });
            callback(messages);
        });
    }

    // Create a new chat
    static async createChat(parentId: string, studentName: string, parentName: string) {
        try {
            const teacherId = await this.getCurrentTeacherId();
            const teacherName = await this.getCurrentTeacherName();
            const chatRef = collection(db, 'chats');
            const chatDoc = await addDoc(chatRef, {
                parentId,
                studentName,
                parentName,
                webUser: teacherId,
                teacherName: teacherName,
                createdAt: serverTimestamp(),
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp(),
                lastMessageSender: parentName,
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

    // Subscribe to chat list updates
    static subscribeToChats(callback: (chats: Chat[]) => void) {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, orderBy('lastMessageTime', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const chats: Chat[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                chats.push({
                    id: doc.id,
                    parentId: data.parentId,
                    studentName: data.studentName,
                    parentName: data.parentName,
                    createdAt: data.createdAt?.toDate(),
                    lastMessage: data.lastMessage,
                    lastMessageTime: data.lastMessageTime?.toDate(),
                    lastMessageSender: data.lastMessageSender,
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
                    createdAt: data.createdAt?.toDate(),
                    lastMessage: data.lastMessage,
                    lastMessageTime: data.lastMessageTime?.toDate(),
                    lastMessageSender: data.lastMessageSender,
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

    // (Push notifications now use pushyClient.ts via sendPushNotification)
} 