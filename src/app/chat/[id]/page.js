'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { useChatSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const exchangeId = params.id;
  const { data: session, status } = useSession();
  const { user, loading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [exchange, setExchange] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  
  const { 
    connected, 
    messages: socketMessages, 
    typingUsers, 
    sendMessage: socketSendMessage, 
    startTyping, 
    stopTyping 
  } = useChatSocket(exchangeId);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  
  useEffect(() => {
    if (status === 'loading' || authLoading) return;
    
    if (!session?.user && !user) {
      toast.error('Please login to access chat');
      router.push('/login');
      return;
    }
  }, [session, user, status, authLoading, router]);

  
  useEffect(() => {
    if (socketMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(msg => msg._id || msg.timestamp));
        const newSocketMessages = socketMessages.filter(msg => 
          !existingIds.has(msg._id || msg.timestamp)
        );
        return [...prev, ...newSocketMessages];
      });
    }
  }, [socketMessages]);

  useEffect(() => {
    if (exchangeId && (session?.user || user)) {
      
      if (session?.user) {
        setCurrentUserId(user?.id);
      } else if (user) {
        setCurrentUserId(user.id);
      }
      
      
      fetchExchangeDetails();
      fetchMessages();
    }
  }, [exchangeId, session, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchExchangeDetails = async () => {
    try {
      let response;
      
      if (session?.user) {
        
        response = await fetch(`/api/exchanges/${exchangeId}`);
      } else {
        
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        
        response = await fetch(`/api/exchanges/${exchangeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.exchange) {
          setExchange(data.exchange);
          
          
          if (currentUserId) {
            
            const requesterIdStr = data.exchange.requesterId._id.toString();
            const ownerIdStr = data.exchange.ownerId._id.toString();
            const currentUserIdStr = currentUserId.toString();
            
            if (requesterIdStr === currentUserIdStr) {
              setOtherUser(data.exchange.ownerId);
            } else if (ownerIdStr === currentUserIdStr) {
              setOtherUser(data.exchange.requesterId);
            } else {
              setOtherUser(data.exchange.requesterId);
            }
          } else {
            setOtherUser(data.exchange.requesterId);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Exchange API error:', errorData);
        
        if (response.status === 404) {
          const allExchangesResponse = await fetch('/api/exchanges', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          router.push('/exchanges');
        }
      }
    } catch (error) {
      console.error('Exception in fetchExchangeDetails:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      let response;
      
      if (session?.user) {
        
        response = await fetch(`/api/chat?exchangeId=${exchangeId}`);
      } else {
        
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        response = await fetch(`/api/chat?exchangeId=${exchangeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    
    if (file.size > 32 * 1024 * 1024) {
      toast.error('Image size should be less than 32MB');
      return;
    }

    
    setSelectedImage(file);
    
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImagePreview = () => {
    setSelectedImage(null);
    setImagePreview(null);
    
    const fileInput = document.getElementById('image-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const uploadAndSendImage = async () => {
    if (!selectedImage) return;

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        
        await sendImageMessage(data.url);
        
        
        setSelectedImage(null);
        setImagePreview(null);
        setNewMessage('');
      } else {
        const errorData = await response.json();
        toast.error('Failed to upload image: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('An error occurred while uploading. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const sendImageMessage = async (imageUrl) => {
    if (!otherUser) return;

    setSending(true);
    try {
      let response;
      
      if (session?.user) {
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            exchangeId,
            content: newMessage.trim() || '', 
            receiverId: otherUser._id,
            messageType: 'image',
            imageUrl: imageUrl
          })
        });
      } else {
        
        const token = localStorage.getItem('token');
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            exchangeId,
            content: newMessage.trim() || '', 
            receiverId: otherUser._id,
            messageType: 'image',
            imageUrl: imageUrl
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        
        
        setMessages(prev => [...prev, data.message]);
        
        
        setTimeout(() => {
          fetchMessages();
        }, 500);
        
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to send image message');
      }
    } catch (error) {
      toast.error('Failed to send image message: ' + (error.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || sending || !otherUser) return;

    
    if (selectedImage) {
      await uploadAndSendImage();
      return;
    }

    
    setSending(true);
    try {
      let response;
      
      if (session?.user) {
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            exchangeId,
            content: newMessage.trim(),
            receiverId: otherUser._id
          })
        });
      } else {
        
        const token = localStorage.getItem('token');
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            exchangeId,
            content: newMessage.trim(),
            receiverId: otherUser._id
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        
        
        setMessages(prev => [...prev, data.message]);
        
        setNewMessage('');
        
        
        setTimeout(() => {
          fetchMessages();
        }, 500);
        
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!exchange || !otherUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Exchange Not Found</h1>
          <p className="text-gray-600 mb-4">The exchange you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/exchanges" className="text-indigo-600 hover:text-indigo-700">
            ← Back to Exchanges
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Shared Navigation */}
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Exchange Info */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-6">
            <div className="relative w-20 h-24">
              <SafeImage 
                src={exchange.bookId.coverImage} 
                alt={exchange.bookId.title}
                fill
                sizes="80px"
                className="object-cover rounded-xl shadow-md"
                type="book"
              />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">📚</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg">{exchange.bookId.title}</h3>
              <p className="text-gray-600 mb-2">by {exchange.bookId.author}</p>
              <div className="flex items-center space-x-3">
                <span className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-medium">
                  {exchange.bookId.genre}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  exchange.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  exchange.status === 'approved' ? 'bg-green-100 text-green-800' :
                  exchange.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {exchange.status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Exchange ID</p>
              <p className="text-xs text-gray-400 font-mono">{exchangeId}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 h-[700px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No messages yet</p>
                  <p className="text-gray-400 text-sm">Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                if (!message || !message._id || !message.senderId || !message.senderId._id) {
                  console.log('Invalid message:', message);
                  return null;
                }

                const isOwn = message.senderId._id === currentUserId;
                console.log('Message sender ID:', message.senderId._id, 'Current user ID:', currentUserId, 'Is own message:', isOwn);
                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isOwn 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' 
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {message.senderId.name?.charAt(0) || 'U'}
                      </div>
                      
                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          isOwn
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {message.messageType === 'image' && message.imageUrl ? (
                          <div className="flex flex-col">
                            <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-2">
                              <SafeImage 
                                src={message.imageUrl} 
                                alt="Shared image" 
                                fill
                                sizes="(max-width: 640px) 150px, 250px"
                                className="rounded-lg shadow-sm object-cover"
                              />
                            </div>
                            {message.content && (
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        )}
                        <p className={`text-xs mt-2 ${
                          isOwn ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          {formatTime(message.createdAt || message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean) 
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="border-t border-gray-200 p-4 bg-white/50">
              <div className="relative w-32 h-32">
                <SafeImage
                  src={imagePreview}
                  alt="Preview"
                  fill
                  sizes="128px"
                  className="rounded-lg shadow-sm object-cover"
                />
                <button
                  onClick={removeImagePreview}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors duration-200 z-10"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 bg-white/50">
            <div className="flex items-end space-x-3">
              {/* Image Upload Button */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={sending || uploadingImage}
              />
              <label
                htmlFor="image-upload"
                className={`p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                  uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </label>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedImage ? "Add a caption (optional)..." : "Type your message..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                  disabled={sending || uploadingImage}
                />
              </div>
              
              <button
                type="submit"
                disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {sending || uploadingImage ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{uploadingImage ? 'Uploading...' : 'Sending...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{selectedImage ? 'Send Image' : 'Send'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
