import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';

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
    static readonly webUser = 'Admin'; // Hardcoded web user role

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
            const chatRef = collection(db, 'chats', chatId, 'messages');
            const messageDoc = await addDoc(chatRef, {
                ...message,
                webUser: this.webUser, // Set web user as ADMIN
                timestamp: serverTimestamp(),
            });

            // Update the chat document with the latest message info
            const chatDocRef = doc(db, 'chats', chatId);
            await updateDoc(chatDocRef, {
                lastMessage: message.content,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: message.sender,
                webUser: this.webUser,
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
            const chatRef = collection(db, 'chats');
            const chatDoc = await addDoc(chatRef, {
                parentId,
                studentName,
                parentName,
                webUser: this.webUser, // Set web user as ADMIN
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