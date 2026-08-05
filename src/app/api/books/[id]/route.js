import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;

    const book = await Book.findById(id)
      .populate('ownerId', 'name location profilePicture rating totalExchanges bio');

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    await Book.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return NextResponse.json({ book });

  } catch (error) {
    console.error('Get book error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    let userId;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('PUT /api/books/[id] - NextAuth session found');
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
      // Handle JWT token authentication
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

    const { id } = await params;

    // Validate book ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid book ID format' },
        { status: 400 }
      );
    }

    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    if (book.ownerId.toString() !== userId) {
      return NextResponse.json(
        { error: 'You can only edit your own books' },
        { status: 403 }
      );
    }

    const updateData = await request.json();
    delete updateData.ownerId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedBook = await Book.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('ownerId', 'name location profilePicture rating');

    return NextResponse.json({
      success: true,
      message: 'Book updated successfully',
      book: updatedBook
    });

  } catch (error) {
    console.error('Update book error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    let userId;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('DELETE /api/books/[id] - NextAuth session found');
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
      // Handle JWT token authentication
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

    const { id } = await params;

    // Validate book ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid book ID format' },
        { status: 400 }
      );
    }

    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    if (book.ownerId.toString() !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own books' },
        { status: 403 }
      );
    }
    await Book.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Book deleted successfully'
    });

  } catch (error) {
    console.error('Delete book error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
