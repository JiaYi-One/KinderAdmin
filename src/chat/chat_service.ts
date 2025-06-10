import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, updateDoc, doc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
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
    unread?: number;
    image?: string;
    webUser: string;
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

    // Create a new chat message
    static async sendMessage(
        chatId: string,
        message: {
            content: string;
            sender: string;
            studentName: string;
            parentName: string;
            webUser: string;
        }
    ) {
        try {
            const teacherId = await this.getCurrentTeacherId();
            const chatRef = collection(db, 'chats', chatId, 'messages');
            const messageDoc = await addDoc(chatRef, {
                ...message,
                webUser: teacherId,
                timestamp: serverTimestamp(),
            });

            // Update the chat document with the latest message info
            const chatDocRef = doc(db, 'chats', chatId);
            await updateDoc(chatDocRef, {
                lastMessage: message.content,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: message.sender,
                webUser: teacherId,
            });

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
            const chatRef = collection(db, 'chats');
            const chatDoc = await addDoc(chatRef, {
                parentId,
                studentName,
                parentName,
                webUser: teacherId,
                createdAt: serverTimestamp(),
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp(),
                lastMessageSender: parentName,
                unread: 0
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
                    image: data.image,
                    webUser: data.webUser,
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
                    image: data.image,
                    webUser: data.webUser,
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
} 