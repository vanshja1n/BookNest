import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Exchange from '@/models/Exchange';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    console.log('GET /api/chat - Session check:', session ? 'Session found' : 'No session');
    
    let userId;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('GET /api/chat - NextAuth session found');
      console.log('Session user id:', session.user.id);
      
      // Use session.user.id directly (MongoDB ObjectId from our fixed auth flow)
      if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
        userId = session.user.id;
        console.log('Using session.user.id as userId:', userId);
      } else {
        // Fallback to email lookup if ID is invalid
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        userId = user._id;
        console.log('Using email lookup userId:', userId);
      }
    } else {
      console.log('GET /api/chat - No NextAuth session, trying JWT fallback');
      // Handle JWT token authentication (fallback for backward compatibility)
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('GET /api/chat - No authorization header found');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const currentUser = verifyToken(token);
      
      if (!currentUser) {
        console.log('GET /api/chat - Invalid JWT token');
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      userId = currentUser.userId;
      console.log('Using JWT userId:', userId);
    }

    // Validate ObjectId before proceeding
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid userId format:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchangeId');

    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Exchange ID is required' },
        { status: 400 }
      );
    }

    // Validate exchange ID
    if (!mongoose.Types.ObjectId.isValid(exchangeId)) {
      return NextResponse.json(
        { error: 'Invalid exchange ID format' },
        { status: 400 }
      );
    }

    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      );
    }

    if (exchange.requesterId.toString() !== userId.toString() && 
        exchange.ownerId.toString() !== userId.toString()) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const messages = await Message.find({
      exchangeId,
      isDeleted: false
    })
    .populate('senderId', 'name profilePicture')
    .sort({ createdAt: 1 });

    return NextResponse.json({ 
      success: true,
      messages 
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    console.log('POST /api/chat - Session check:', session ? 'Session found' : 'No session');
    
    let userId;
    let currentUser;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('POST /api/chat - NextAuth session found');
      console.log('Session user id:', session.user.id);
      
      // Use session.user.id directly (MongoDB ObjectId from our fixed auth flow)
      if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
        userId = session.user.id;
        console.log('Using session.user.id as userId:', userId);
      } else {
        // Fallback to email lookup if ID is invalid
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        userId = user._id;
        console.log('Using email lookup userId:', userId);
      }
      currentUser = { name: session.user.name || 'User', email: session.user.email || '' };
    } else {
      console.log('POST /api/chat - No NextAuth session, trying JWT fallback');
      // Handle JWT token authentication (fallback for backward compatibility)
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('POST /api/chat - No authorization header found');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded) {
        console.log('POST /api/chat - Invalid JWT token');
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      userId = decoded.userId;
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      currentUser = { name: user.name || 'User', email: user.email || '' };
      console.log('Using JWT userId:', userId);
    }

    // Validate ObjectId before proceeding
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid userId format:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const { exchangeId, content, messageType = 'text', imageUrl } = await request.json();

    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Exchange ID is required' },
        { status: 400 }
      );
    }

    // Validate exchange ID
    if (!mongoose.Types.ObjectId.isValid(exchangeId)) {
      return NextResponse.json(
        { error: 'Invalid exchange ID format' },
        { status: 400 }
      );
    }

    if (messageType === 'text' && !content) {
      return NextResponse.json(
        { error: 'Content is required for text messages' },
        { status: 400 }
      );
    }

    if (messageType === 'image' && !imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required for image messages' },
        { status: 400 }
      );
    }

    const exchange = await Exchange.findById(exchangeId);
    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      );
    }

    if (exchange.requesterId.toString() !== userId.toString() && 
        exchange.ownerId.toString() !== userId.toString()) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const receiverId = exchange.requesterId.toString() === userId.toString() 
      ? exchange.ownerId 
      : exchange.requesterId;

    const message = new Message({
      senderId: userId,
      receiverId,
      exchangeId,
      content: content || '',
      messageType,
      imageUrl: imageUrl || null
    });

    await message.save();

    await Exchange.findByIdAndUpdate(exchangeId, {
      $push: { messages: message._id }
    });

    await message.populate('senderId', 'name profilePicture');
    try {
      const { sendEmail, getUserEmail } = await import('@/lib/email');
      const receiverEmail = await getUserEmail(receiverId);
      const exchangeData = await Exchange.findById(exchangeId)
        .populate('bookId', 'title');
      const receiver = await User.findById(receiverId);
      
      if (receiverEmail && exchangeData && exchangeData.bookId) {
        await sendEmail(receiverEmail, 'newMessage', [
          currentUser.name || 'A user',
          receiver?.name || 'User',
          exchangeData.bookId.title
        ]);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      newMessage: message
    }, { status: 201 });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
