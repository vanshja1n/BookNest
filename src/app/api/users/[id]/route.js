import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Book from '@/models/Book';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    let userId;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('GET /api/users/[id] - NextAuth session found');
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
      // Handle JWT token authentication (fallback for backward compatibility)
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const { verifyToken } = await import('@/lib/auth');
      const currentUser = verifyToken(token);
      
      if (!currentUser) {
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

    const profileUserId = params.id;

    // Validate profile user ID
    if (!mongoose.Types.ObjectId.isValid(profileUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const user = await User.findById(profileUserId)
      .select('name email profilePicture bio location rating exchangesCompleted createdAt');

    if (!user.exchangesCompleted || user.exchangesCompleted === 0) {
      const Exchange = (await import('@/models/Exchange')).default;
      const completedExchanges = await Exchange.countDocuments({
        $or: [
          { requesterId: profileUserId, status: 'completed' },
          { ownerId: profileUserId, status: 'completed' }
        ]
      });
      
      await User.findByIdAndUpdate(profileUserId, { 
        exchangesCompleted: completedExchanges 
      });
      
      user.exchangesCompleted = completedExchanges;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const books = await Book.find({ 
      ownerId: profileUserId,
      status: 'available'
    })
    .select('title author coverImage genre condition description isbn publishedYear language pageCount tags')
    .sort({ createdAt: -1 });

    console.log('User Profile API - User:', user.name, 'Books:', books.length);

    return NextResponse.json({ 
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        location: user.location,
        rating: user.rating || 0,
        exchangesCompleted: user.exchangesCompleted || 0,
        createdAt: user.createdAt
      },
      books: books.map(book => ({
        _id: book._id,
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
        genre: book.genre,
        condition: book.condition,
        description: book.description,
        isbn: book.isbn,
        publishedYear: book.publishedYear,
        language: book.language,
        pageCount: book.pageCount,
        tags: book.tags
      }))
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
