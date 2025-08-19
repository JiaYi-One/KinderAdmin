"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Avatar,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Box,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Fab,
  Tooltip
} from "@mui/material"
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  MoreVert,
  Edit,
  Delete,
  Send,
  Add,
  Person,
  Group
} from "@mui/icons-material"
import { Announcement, AnnouncementComment, User as UserType, FormData, NewComment } from "./types"
import { db } from "../firebase"
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc } from "firebase/firestore"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { sendPushNotification } from "../notifications/pushyClient"

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [newComment, setNewComment] = useState<NewComment>({})
  const [newReply, setNewReply] = useState<NewComment>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state for creating/editing announcements
  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
    category: "",
  })

  // Fetch announcements from Firebase
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const announcementsRef = collection(db, "announcements")
      const q = query(announcementsRef, orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      
      const announcementsList: Announcement[] = []
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data()
        
        // Fetch comments for this announcement
        const commentsRef = collection(db, "announcements", docSnapshot.id, "comments")
        const commentsQuery = query(commentsRef, orderBy("createdAt", "asc"))
        const commentsSnapshot = await getDocs(commentsQuery)
        
        const comments: AnnouncementComment[] = []
        
        for (const commentDoc of commentsSnapshot.docs) {
          const commentData = commentDoc.data()
          
          // Fetch replies for this comment
          const repliesRef = collection(db, "announcements", docSnapshot.id, "comments", commentDoc.id, "replies")
          const repliesQuery = query(repliesRef, orderBy("createdAt", "asc"))
          const repliesSnapshot = await getDocs(repliesQuery)
          
          const replies: AnnouncementComment[] = repliesSnapshot.docs.map(replyDoc => {
            const replyData = replyDoc.data()
            return {
              id: replyDoc.id,
              author: replyData.author,
              authorAvatar: replyData.authorAvatar,
              content: replyData.content,
              authorRole: replyData.authorRole,
              parentId: replyData.parentId,
              createdAt: replyData.createdAt,
            }
          })
          
          comments.push({
            id: commentDoc.id,
            author: commentData.author,
            authorAvatar: commentData.authorAvatar,
            content: commentData.content,
            authorRole: commentData.authorRole,
            replies: replies,
            createdAt: commentData.createdAt,
          })
        }

        // Use the document ID directly - don't try to convert to number
        const announcementId = docSnapshot.id
        
        announcementsList.push({
          id: announcementId, // Use string ID directly
          title: data.title,
          content: data.content,
          author: data.author,
          authorRole: data.authorRole,
          authorAvatar: data.authorAvatar || "",
          category: data.category,
          likes: data.likes || 0,
          comments: comments,
          isLiked: currentUser ? (data.likedBy?.includes(currentUser.name) || false) : false,
          createdAt: data.createdAt, // Add Firebase timestamp
          updatedAt: data.updatedAt, // Add updated timestamp if exists
        })
      }
      
      setAnnouncements(announcementsList)
    } catch (error) {
      console.error("Error fetching announcements:", error)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  // Get current user from authentication
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is staff (teacher/admin)
          const staffRef = collection(db, "staff")
          const staffQuery = query(staffRef, where("teacherEmail", "==", user.email))
          const staffSnapshot = await getDocs(staffQuery)
          
          if (!staffSnapshot.empty) {
            const staffData = staffSnapshot.docs[0].data()
            setCurrentUser({
              name: staffData.teacherName,
              role: staffData.role,
              avatar: staffData.teacherAvatar
            })
          } else {
            // Check if user is parent
            const parentsRef = collection(db, "parents")
            const parentQuery = query(parentsRef, where("email", "==", user.email))
            const parentSnapshot = await getDocs(parentQuery)
            
            if (!parentSnapshot.empty) {
              const parentData = parentSnapshot.docs[0].data()
              setCurrentUser({
                name: parentData.name,
                role: "parent",
                avatar: parentData.avatar
              })
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch announcements when current user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchAnnouncements()
    }
  }, [currentUser, fetchAnnouncements])

  // Function to send announcement notifications to all parents
  const sendAnnouncementNotifications = async (
    announcementId: string,
    title: string,
    author: string,
    category: string
  ) => {
    try {
      // Get all parents
      const parentsRef = collection(db, "parents")
      const parentsSnapshot = await getDocs(parentsRef)
      
      const notificationPromises: Promise<boolean>[] = []
      
      for (const parentDoc of parentsSnapshot.docs) {
        const parentId = parentDoc.id
        const parentData = parentDoc.data()
        
        console.log("Debug - Parent info:", {
          parentId: parentId,
          parentEmail: parentData.email,
          parentName: parentData.name
        })
        
        const notificationPayload = {
          parentId: parentId,
          type: "announcement" as const,
          title: `New ${category} Announcement`,
          message: `${title} - From: ${author}`,
          entityId: announcementId,
          announcementId: announcementId, // Add explicit announcementId field
        }
        
        console.log("Debug - Notification payload:", notificationPayload)
        
        // Send push notification only
        const pushPromise = sendPushNotification(db, notificationPayload)
        
        notificationPromises.push(pushPromise)
      }
      
      // Wait for all push notifications to be sent
      await Promise.all(notificationPromises)
      
      console.log(`Sent announcement push notifications to ${parentsSnapshot.docs.length} parents`)
    } catch (error) {
      console.error("Error sending announcement notifications:", error)
    }
  }

  const handleCreateAnnouncement = async () => {
    if (!formData.title?.trim() || !formData.content?.trim() || !formData.category || !currentUser) {
      alert("Please fill in all required fields.")
      return
    }

    setIsCreating(true)
    try {
      // Create a new document reference with auto-generated ID
      const announcementsRef = collection(db, "announcements")
      const newAnnouncementRef = doc(announcementsRef)
      const announcementId = newAnnouncementRef.id
      
      const announcementData = {
        id: announcementId,
        title: formData.title,
        content: formData.content,
        author: currentUser.name,
        authorRole: currentUser.role,
        authorAvatar: currentUser.avatar || "",
        category: formData.category,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      }

      // Save to Firebase
      await setDoc(newAnnouncementRef, announcementData)

      // Create local announcement object
      const newAnnouncement: Announcement = {
        id: announcementId,
        title: formData.title,
        content: formData.content,
        author: currentUser.name,
        authorRole: currentUser.role,
        authorAvatar: currentUser.avatar || "",
        category: formData.category,
        likes: 0,
        comments: [],
        isLiked: false,
        createdAt: new Date(), // Add current date for immediate display
      }

      // Update local state
      setAnnouncements([newAnnouncement, ...announcements])
      setFormData({ title: "", content: "", category: "" })
      setIsCreateDialogOpen(false)

      // Send notifications to all parents
      await sendAnnouncementNotifications(
        announcementId,
        formData.title,
        currentUser.name,
        formData.category
      )
    } catch (error) {
      console.error("Error creating announcement:", error)
      alert("Error creating announcement. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
    })
    setAnchorEl(null)
  }

  const handleUpdateAnnouncement = async () => {
    if (!formData.title || !formData.content || !formData.category || !editingAnnouncement) return

    try {
      const announcementRef = doc(db, "announcements", editingAnnouncement.id)
      
      await updateDoc(announcementRef, {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        updatedAt: serverTimestamp(),
      })

      setAnnouncements(
        announcements.map((ann) =>
          ann.id === editingAnnouncement.id
            ? { 
                ...ann, 
                title: formData.title, 
                content: formData.content, 
                category: formData.category,
                updatedAt: new Date() // Add current timestamp for immediate display
              }
            : ann,
        ),
      )
      setEditingAnnouncement(null)
      setFormData({ title: "", content: "", category: "" })
    } catch (error) {
      console.error("Error updating announcement:", error)
      alert("Error updating announcement. Please try again.")
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const announcementRef = doc(db, "announcements", id)
      await deleteDoc(announcementRef)
      
      setAnnouncements(announcements.filter((ann) => ann.id !== id))
      setAnchorEl(null)
    } catch (error) {
      console.error("Error deleting announcement:", error)
      alert("Error deleting announcement. Please try again.")
    }
  }

  const handleLike = async (id: string) => {
    if (!currentUser) {
      console.log("No current user found")
      return
    }

    console.log("Attempting to like announcement:", id, "by user:", currentUser.name)

    try {
      // Find the announcement in our local state to get the correct document ID
      const announcement = announcements.find(ann => ann.id === id)
      if (!announcement) {
        console.error("Announcement not found in local state")
        return
      }

      console.log("Found announcement:", announcement)

      // Use the document ID from the announcement object
      const announcementRef = doc(db, "announcements", id)
      const announcementDoc = await getDoc(announcementRef)
      
      if (announcementDoc.exists()) {
        const data = announcementDoc.data()
        console.log("Firebase data:", data)
        
        const likedBy = data.likedBy || []
        const currentLikes = data.likes || 0
        const isCurrentlyLiked = likedBy.includes(currentUser.name)
        
        console.log("Current likes:", currentLikes, "Liked by:", likedBy, "Is currently liked:", isCurrentlyLiked)
        
        let newLikedBy: string[]
        let newLikes: number
        
        if (isCurrentlyLiked) {
          // Unlike: remove user from likedBy array and decrease count
          newLikedBy = likedBy.filter((name: string) => name !== currentUser.name)
          newLikes = Math.max(0, currentLikes - 1) // Prevent negative likes
        } else {
          // Like: add user to likedBy array and increase count
          newLikedBy = [...likedBy, currentUser.name]
          newLikes = currentLikes + 1
        }
        
        console.log("Updating Firebase with:", { likes: newLikes, likedBy: newLikedBy })
        
        // Update Firebase
        await updateDoc(announcementRef, {
          likes: newLikes,
          likedBy: newLikedBy,
        })
        
        console.log("Firebase updated successfully")
        
        // Update local state
        setAnnouncements(
          announcements.map((ann) =>
            ann.id === id
              ? {
                  ...ann,
                  isLiked: !ann.isLiked,
                  likes: newLikes,
                }
              : ann,
          ),
        )
        
        console.log("Local state updated")
      } else {
        console.error("Announcement document not found in Firebase")
      }
    } catch (error) {
      console.error("Error updating like:", error)
      alert("Error updating like. Please try again.")
    }
  }

  const handleAddComment = async (announcementId: string) => {
    const commentText = newComment[announcementId]
    if (!commentText?.trim() || !currentUser) return

    try {
      // Create a new comment document reference with auto-generated ID
      const commentsRef = collection(db, "announcements", announcementId, "comments")
      const newCommentRef = doc(commentsRef)
      const commentId = newCommentRef.id
      
      const commentData = {
        author: currentUser.name,
        authorAvatar: currentUser.avatar || "",
        content: commentText,
        authorRole: currentUser.role,
        createdAt: serverTimestamp(),
      }

      // Save to Firebase
      await setDoc(newCommentRef, commentData)
      
      const comment: AnnouncementComment = {
        id: commentId,
        author: currentUser.name,
        authorAvatar: currentUser.avatar || "",
        content: commentText,
        authorRole: currentUser.role,
        replies: [],
        createdAt: new Date(), // Add current date for immediate display
      }

      setAnnouncements(
        announcements.map((ann) => 
          ann.id === announcementId 
            ? { ...ann, comments: [...ann.comments, comment] } 
            : ann
        ),
      )

      setNewComment({ ...newComment, [announcementId]: "" })
    } catch (error) {
      console.error("Error adding comment:", error)
      alert("Error adding comment. Please try again.")
    }
  }

  const handleAddReply = async (announcementId: string, parentCommentId: string) => {
    const replyText = newReply[parentCommentId]
    if (!replyText?.trim() || !currentUser) return

    try {
      // Create a new reply document reference
      const repliesRef = collection(db, "announcements", announcementId, "comments", parentCommentId, "replies")
      const newReplyRef = doc(repliesRef)
      const replyId = newReplyRef.id
      
      const replyData = {
        author: currentUser.name,
        authorAvatar: currentUser.avatar || "",
        content: replyText,
        authorRole: currentUser.role,
        parentId: parentCommentId,
        createdAt: serverTimestamp(),
      }

      // Save to Firebase
      await setDoc(newReplyRef, replyData)
      
      const reply: AnnouncementComment = {
        id: replyId,
        author: currentUser.name,
        authorAvatar: currentUser.avatar || "",
        content: replyText,
        authorRole: currentUser.role,
        parentId: parentCommentId,
        createdAt: new Date(), // Add current date for immediate display
      }

      setAnnouncements(
        announcements.map((ann) => 
          ann.id === announcementId 
            ? {
                ...ann,
                comments: ann.comments.map((comment) =>
                  comment.id === parentCommentId
                    ? { ...comment, replies: [...(comment.replies || []), reply] }
                    : comment
                )
              }
            : ann
        ),
      )

      setNewReply({ ...newReply, [parentCommentId]: "" })
      setReplyingTo(null)
    } catch (error) {
      console.error("Error adding reply:", error)
      alert("Error adding reply. Please try again.")
    }
  }

  const canEditDelete = (announcement: Announcement) => {
    return currentUser?.role === "admin" || (currentUser?.role === "teacher" && announcement.author === currentUser?.name)
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: "error" | "primary" | "success" | "default" } = {
      Important: "error",
      Event: "primary",
      "Field Trip": "success",
      General: "default",
    }
    return colors[category] || "default"
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, announcement: Announcement) => {
    setAnchorEl(event.currentTarget)
    setSelectedAnnouncement(announcement)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedAnnouncement(null)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return "Just now"
    
    const now = new Date()
    let postTime: Date
    
    try {
      // Handle Firebase timestamp objects
      if (timestamp && typeof timestamp.toDate === 'function') {
        postTime = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        postTime = timestamp
      } else if (typeof timestamp === 'string') {
        postTime = new Date(timestamp)
      } else if (typeof timestamp === 'number') {
        postTime = new Date(timestamp)
      } else {
        console.error('Invalid timestamp format:', timestamp)
        return "Just now"
      }
      
      // Check if the date is valid
      if (isNaN(postTime.getTime())) {
        console.error('Invalid date:', postTime)
        return "Just now"
      }
    } catch (error) {
      console.error('Error parsing timestamp:', error)
      return "Just now"
    }
    
    const diffInSeconds = Math.floor((now.getTime() - postTime.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return "Just now"
    } else if (diffInSeconds < 3600) {
      // Less than 1 hour - show in minutes
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      // Between 1 to 24 hours - show in hours
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 172800) {
      // More than 24 hours but less than 48 hours - show "yesterday"
      return "Yesterday"
    } else {
      // More than 48 hours - show the actual date
      return postTime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading announcements...</Typography>
      </Box>
    )
  }

  if (!currentUser) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Please log in to view announcements.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Main Container Wrapper */}
      <Box sx={{ 
        maxWidth: 'lg', 
        mx: 'auto', 
        p: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4, md: 5 }
      }}>
        {/* Content Wrapper */}
        <Paper 
          elevation={0} 
          sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: { xs: 2, sm: 3, md: 4 },
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              Announcements
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Stay updated with school news and events
            </Typography>
          </Box>

          {/* Create Announcement Button - Only for admin and teachers */}
          {(currentUser.role === "admin" || currentUser.role === "teacher") && (
            <Tooltip title="Create New Announcement">
              <Fab
                color="primary"
                onClick={() => setIsCreateDialogOpen(true)}
                sx={{ bgcolor: 'primary.main' }}
              >
                <Add />
              </Fab>
            </Tooltip>
          )}
        </Box>

        {/* Create Dialog */}
        <Dialog 
          open={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Announcement</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="Important">Important</MenuItem>
                  <MenuItem value="Event">Event</MenuItem>
                  <MenuItem value="Field Trip">Field Trip</MenuItem>
                  <MenuItem value="General">General</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your announcement here..."
                multiline
                rows={4}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateAnnouncement} 
              variant="contained"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Post Announcement"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={!!editingAnnouncement} 
          onClose={() => setEditingAnnouncement(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="Important">Important</MenuItem>
                  <MenuItem value="Event">Event</MenuItem>
                  <MenuItem value="Field Trip">Field Trip</MenuItem>
                  <MenuItem value="General">General</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your announcement here..."
                multiline
                rows={4}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingAnnouncement(null)}>Cancel</Button>
            <Button onClick={handleUpdateAnnouncement} variant="contained">
              Update Announcement
            </Button>
          </DialogActions>
        </Dialog>

        {/* Announcements List */}
        <Stack spacing={3}>
          {announcements.map((announcement) => (
            <Card key={announcement.id} sx={{ width: '100%' }}>
              {/* Header Section */}
              <Box sx={{ p: 3, pb: 2, bgcolor: 'grey.100' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  {/* Left side: Avatar and User Info */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                    <Avatar 
                      src={announcement.authorAvatar}
                      sx={{ width: 48, height: 48, mt: 0.5 }}
                    >
                      {getInitials(announcement.author)}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      {/* Top row: Name and Category */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {announcement.author}
                        </Typography>
                        <Chip 
                          label={announcement.category} 
                          color={getCategoryColor(announcement.category)}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                      
                      {/* Bottom row: Role */}
                      <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                        {announcement.authorRole}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Right side: Menu button */}
                  {canEditDelete(announcement) && (
                    <IconButton onClick={(e) => handleMenuOpen(e, announcement)}>
                      <MoreVert />
                    </IconButton>
                  )}
                </Box>
              </Box>
              
              {/* Divider */}
              <Divider />
              
              {/* Title Section */}
              <Box sx={{ p: 3, pt: 2, pb: 1 }}>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {announcement.title}
                </Typography>
              </Box>
              
              {/* Description Section */}
              <Box sx={{ p: 3, pt: 1, pb: 1 }}>
                <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                  {announcement.content}
                </Typography>
              </Box>
              
              {/* Time Section */}
              <Box sx={{ p: 3, pt: 1, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {announcement.updatedAt 
                    ? `Edited ${getRelativeTime(announcement.updatedAt)}`
                    : getRelativeTime(announcement.createdAt)
                  }
                </Typography>
              </Box>
              
              {/* Divider */}
              <Divider sx={{ borderWidth: 2, borderColor: 'grey.300' }} />
              
              {/* Actions Section */}
              <Box sx={{ p: 3, pt: 2 }}>
                {/* Like and Comment Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Button
                    startIcon={announcement.isLiked ? <Favorite /> : <FavoriteBorder />}
                    onClick={() => handleLike(announcement.id)}
                    sx={{ 
                      color: announcement.isLiked ? 'error.main' : 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    {announcement.likes}
                  </Button>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <ChatBubbleOutline sx={{ fontSize: 20 }} />
                    <Typography variant="body2">{announcement.comments.length} comments</Typography>
                  </Box>
                </Box>

                {/* Comments Section */}
                {announcement.comments.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <List sx={{ p: 0 }}>
                      {announcement.comments.map((comment: AnnouncementComment) => (
                        <Box key={comment.id}>
                          <ListItem sx={{ px: 0, py: 1 }}>
                            <ListItemAvatar>
                              <Avatar src={comment.authorAvatar} sx={{ width: 32, height: 32 }}>
                                {getInitials(comment.author)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {comment.author}
                                  </Typography>
                                  <Chip 
                                    icon={comment.authorRole === "parent" ? <Person /> : <Group />}
                                    label={comment.authorRole === "parent" ? "Parent" : comment.authorRole === "admin" ? "Admin" : "Teacher"}
                                    size="small" 
                                    variant="outlined"
                                    color={comment.authorRole === "parent" ? "primary" : comment.authorRole === "admin" ? "error" : "secondary"}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                    {comment.content}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                      {comment.createdAt ? getRelativeTime(comment.createdAt) : 'Just now'}
                                    </Typography>
                                    <Button
                                      size="small"
                                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                      sx={{ minWidth: 'auto', p: 0, color: 'text.secondary' }}
                                    >
                                      Reply
                                    </Button>
                                  </Box>
                                </Box>
                              }
                              primaryTypographyProps={{ component: 'div' }}
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                          
                          {/* Reply Input */}
                          {replyingTo === comment.id && (
                            <Box sx={{ ml: 4, mb: 2 }}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <Avatar src={currentUser.avatar} sx={{ width: 24, height: 24, mt: 0.5 }}>
                                  {getInitials(currentUser.name)}
                                </Avatar>
                                <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                                  <TextField
                                    placeholder="Write a reply..."
                                    value={newReply[comment.id] || ""}
                                    onChange={(e) => setNewReply({ ...newReply, [comment.id]: e.target.value })}
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        handleAddReply(announcement.id, comment.id)
                                      }
                                    }}
                                    size="small"
                                    fullWidth
                                    multiline
                                    maxRows={3}
                                  />
                                  <IconButton
                                    onClick={() => handleAddReply(announcement.id, comment.id)}
                                    disabled={!newReply[comment.id]?.trim()}
                                    color="primary"
                                    size="small"
                                  >
                                    <Send />
                                  </IconButton>
                                </Box>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <Box sx={{ ml: 4 }}>
                              {comment.replies.map((reply: AnnouncementComment) => (
                                <ListItem key={reply.id} sx={{ px: 0, py: 0.5 }}>
                                  <ListItemAvatar>
                                    <Avatar src={reply.authorAvatar} sx={{ width: 24, height: 24 }}>
                                      {getInitials(reply.author)}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: '500', fontSize: '0.875rem' }}>
                                          {reply.author}
                                        </Typography>
                                        <Chip 
                                          icon={reply.authorRole === "parent" ? <Person /> : <Group />}
                                          label={reply.authorRole === "parent" ? "Parent" : reply.authorRole === "admin" ? "Admin" : "Teacher"}
                                          size="small" 
                                          variant="outlined"
                                          color={reply.authorRole === "parent" ? "primary" : reply.authorRole === "admin" ? "error" : "secondary"}
                                          sx={{ height: 20, fontSize: '0.75rem' }}
                                        />
                                      </Box>
                                    }
                                    secondary={
                                      <Box>
                                        <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                                          {reply.content}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          {reply.createdAt ? getRelativeTime(reply.createdAt) : 'Just now'}
                                        </Typography>
                                      </Box>
                                    }
                                    primaryTypographyProps={{ component: 'div' }}
                                    secondaryTypographyProps={{ component: 'div' }}
                                  />
                                </ListItem>
                              ))}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Add Comment */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Avatar src={currentUser.avatar} sx={{ width: 32, height: 32 }}>
                    {getInitials(currentUser.name)}
                  </Avatar>
                  <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
                    <TextField
                      placeholder="Write a comment..."
                      value={newComment[announcement.id] || ""}
                      onChange={(e) => setNewComment({ ...newComment, [announcement.id]: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment(announcement.id)
                        }
                      }}
                      size="small"
                      fullWidth
                    />
                    <IconButton
                      onClick={() => handleAddComment(announcement.id)}
                      disabled={!newComment[announcement.id]?.trim()}
                      color="primary"
                    >
                      <Send />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Card>
          ))}
        </Stack>

        {/* Empty State */}
        {announcements.length === 0 && (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <Group sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No announcements yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                {currentUser.role === "parent"
                  ? "Check back later for updates from teachers and administrators."
                  : "Create your first announcement to share important information with parents."}
              </Typography>
              {(currentUser.role === "admin" || currentUser.role === "teacher") && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create Announcement
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Menu for Edit/Delete */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => selectedAnnouncement && handleEditAnnouncement(selectedAnnouncement)}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem 
            onClick={() => selectedAnnouncement && handleDeleteAnnouncement(selectedAnnouncement.id)}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
                 </Menu>
         </Paper>
       </Box>
     </Box>
   )
 }
