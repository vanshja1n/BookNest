import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Exchange from '@/models/Exchange';
import Book from '@/models/Book';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { addPointsForExchange } from '@/lib/points-utils';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    let userId;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('GET /api/exchanges/[id] - NextAuth session found');
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
    
    // Validate exchange ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid exchange ID format' },
        { status: 400 }
      );
    }
    
    const exchange = await Exchange.findById(id)
      .populate('requesterId', 'name profilePicture rating location')
      .populate('ownerId', 'name profilePicture rating location')
      .populate('bookId', 'title author coverImage description condition')
      .populate('messages');

    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      );
    }
    if (exchange.requesterId._id.toString() !== userId.toString() && 
        exchange.ownerId._id.toString() !== userId.toString()) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    return NextResponse.json({ 
      success: true,
      exchange 
    });

  } catch (error) {
    console.error('Get exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    let userId;
    let currentUser;
    
    // Handle NextAuth session authentication
    if (session?.user) {
      console.log('PUT /api/exchanges/[id] - NextAuth session found');
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
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      userId = decoded.userId;
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      currentUser = { name: user.name || 'User', email: user.email || '' };
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
    
    // Validate exchange ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid exchange ID format' },
        { status: 400 }
      );
    }
    
    const { action, rating, review } = await request.json();

    const exchange = await Exchange.findById(id);
    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      );
    }

    const isOwner = exchange.ownerId.toString() === userId.toString();
    const isRequester = exchange.requesterId.toString() === userId.toString();
    
    if (!isOwner && !isRequester) {
      return NextResponse.json(
        { error: 'You are not authorized to perform this action' },
        { status: 403 }
      );
    }

    const ownerOnlyActions = ['approve', 'reject', 'complete'];
    if (ownerOnlyActions.includes(action) && !isOwner) {
      return NextResponse.json(
        { error: 'Only the book owner can perform this action' },
        { status: 403 }
      );
    }

    if (action === 'rate') {
      if (isOwner) {
        if (exchange.requesterId.toString() !== userId) {
          return NextResponse.json(
            { error: 'You can only rate the person you exchanged with' },
            { status: 403 }
          );
        }
      } else if (isRequester) {
        if (exchange.ownerId.toString() !== userId) {
          return NextResponse.json(
            { error: 'You can only rate the person you exchanged with' },
            { status: 403 }
          );
        }
      }
    }

    let updateData = {};
    let notificationMessage = '';

    switch (action) {
      case 'approve':
        if (exchange.status !== 'pending') {
          return NextResponse.json(
            { error: 'Only pending exchanges can be approved' },
            { status: 400 }
          );
        }
        updateData.status = 'approved';
        updateData.exchangeDate = new Date();
        notificationMessage = 'Your exchange request has been approved';
        
        try {
          const { sendEmail, getUserEmail } = await import('@/lib/email');
          const requesterEmail = await getUserEmail(exchange.requesterId);
          const book = await (await import('@/models/Book')).default.findById(exchange.bookId);
          
          if (requesterEmail && book) {
            await sendEmail(requesterEmail, 'exchangeApproved', [
              currentUser.name || 'Book Owner',
              book.title,
              exchange.requesterId.name || 'User'
            ]);
          }
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
        break;

      case 'reject':
        if (exchange.status !== 'pending') {
          return NextResponse.json(
            { error: 'Only pending exchanges can be rejected' },
            { status: 400 }
          );
        }
        updateData.status = 'rejected';
        notificationMessage = 'Your exchange request has been rejected';
        
        try {
          const { sendEmail, getUserEmail } = await import('@/lib/email');
          const requesterEmail = await getUserEmail(exchange.requesterId);
          const book = await (await import('@/models/Book')).default.findById(exchange.bookId);
          
          if (requesterEmail && book) {
            await sendEmail(requesterEmail, 'exchangeRejected', [
              currentUser.name || 'Book Owner',
              book.title,
              exchange.requesterId.name || 'User'
            ]);
          }
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
        
        await Book.findByIdAndUpdate(exchange.bookId, { status: 'available' });
        break;

      case 'complete':
        if (exchange.status !== 'approved') {
          return NextResponse.json(
            { error: 'Only approved exchanges can be completed' },
            { status: 400 }
          );
        }
        updateData.status = 'completed';
        updateData.completionDate = new Date();
        notificationMessage = 'Your exchange has been completed';

        const book = await Book.findById(exchange.bookId);
        if (book) {
          await Book.findByIdAndUpdate(exchange.bookId, { 
            ownerId: exchange.requesterId,
            status: 'traded' 
          });
          
          await User.findByIdAndUpdate(exchange.ownerId, {
            $pull: { books: exchange.bookId }
          });
          
          await User.findByIdAndUpdate(exchange.requesterId, {
            $addToSet: { books: exchange.bookId }
          });
          
          console.log(`Book ownership transferred: ${book.title} from ${exchange.ownerId} to ${exchange.requesterId}`);
        }
        
        await User.findByIdAndUpdate(exchange.requesterId, { 
          $inc: { 
            totalExchanges: 1,
            exchangesCompleted: 1
          } 
        });
        await User.findByIdAndUpdate(exchange.ownerId, { 
          $inc: { 
            totalExchanges: 1,
            exchangesCompleted: 1
          } 
        });

        await addPointsForExchange(exchange.requesterId);
        await addPointsForExchange(exchange.ownerId);
        
        try {
          const { sendEmail, getUserEmail } = await import('@/lib/email');
          const requesterEmail = await getUserEmail(exchange.requesterId);
          const ownerEmail = await getUserEmail(exchange.ownerId);
          
          if (requesterEmail && book) {
            await sendEmail(requesterEmail, 'bookOwnershipTransferred', [
              currentUser.name || 'Book Owner',
              book.title,
              'You are now the owner of this book!'
            ]);
          }
          
          if (ownerEmail && book) {
            await sendEmail(ownerEmail, 'bookOwnershipTransferred', [
              currentUser.name || 'Book Owner',
              book.title,
              'The book has been transferred to the new owner.'
            ]);
          }
        } catch (emailError) {
          console.error('Failed to send ownership transfer emails:', emailError);
        }
        break;

      case 'cancel':
        if (exchange.status === 'completed') {
          return NextResponse.json(
            { error: 'Completed exchanges cannot be cancelled' },
            { status: 400 }
          );
        }
        updateData.status = 'canceled';
        notificationMessage = 'The exchange has been cancelled';
        if (exchange.status === 'approved') {
          await Book.findByIdAndUpdate(exchange.bookId, { status: 'available' });
        }
        break;

      case 'rate':
        if (!rating || rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: 'Invalid rating' },
            { status: 400 }
          );
        }
        updateData.rating = rating;
        updateData.review = review || '';
        updateData.ratedBy = userId;
        
        const targetUserId = exchange.requesterId.toString() === userId 
          ? exchange.ownerId 
          : exchange.requesterId;
          
        const User = (await import('@/models/User')).default;
        await User.findByIdAndUpdate(targetUserId, {
          $inc: { totalRatings: 1, ratingSum: rating }
        });
        
        const user = await User.findById(targetUserId);
        const newRating = user.ratingSum / user.totalRatings;
        await User.findByIdAndUpdate(targetUserId, { rating: newRating });

        await addPointsForRating(userId);
        
        if (rating === 5) {
          await addPointsForFiveStarRating(targetUserId);
        }
        
        try {
          const { sendEmail, getUserEmail } = await import('@/lib/email');
          const ratedUserEmail = await getUserEmail(targetUserId);
          const book = await (await import('@/models/Book')).default.findById(exchange.bookId);
          const ratedUser = await User.findById(targetUserId);
          
          if (ratedUserEmail && book && ratedUser) {
            await sendEmail(ratedUserEmail, 'newRating', [
              currentUser.name || 'A user',
              ratedUser.name || 'User',
              rating,
              book.title
            ]);
          }
        } catch (emailError) {
          console.error('Failed to send rating email:', emailError);
        }
        
        notificationMessage = 'You have received a new rating';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedExchange = await Exchange.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate([
      { path: 'requesterId', select: 'name profilePicture rating' },
      { path: 'ownerId', select: 'name profilePicture rating' },
      { path: 'bookId', select: 'title author coverImage' }
    ]);

    if (notificationMessage) {
      try {
        const requesterNotification = new Notification({
          userId: exchange.requesterId,
          type: action === 'approve' ? 'exchange_approved' : 
                action === 'reject' ? 'exchange_rejected' : 
                action === 'complete' ? 'exchange_completed' : 'exchange_canceled',
          title: 'Exchange Update',
          message: notificationMessage,
          relatedId: exchange._id,
          relatedModel: 'Exchange'
        });

        await requesterNotification.save();
        console.log('Main notification created successfully');
      } catch (notificationError) {
        console.error('Error creating main notification:', notificationError);
      }
      
      if (action === 'complete') {
        try {
          const bookForNotification = await Book.findById(exchange.bookId);
          const requesterUser = await User.findById(exchange.requesterId);
          
          const ownerNotification = new Notification({
            userId: exchange.ownerId,
            type: 'ownership_transferred',
            title: 'Book Ownership Transferred',
            message: `Your book "${bookForNotification?.title || 'Unknown Book'}" has been transferred to ${requesterUser?.name || 'the new owner'}`,
            relatedId: exchange._id,
            relatedModel: 'Exchange'
          });

          await ownerNotification.save();
          console.log('Ownership transfer notification created successfully');
        } catch (notificationError) {
          console.error('Error creating ownership transfer notification:', notificationError);
        }
      }
    }

    return NextResponse.json({
      message: `Exchange ${action}ed successfully`,
      exchange: updatedExchange
    });

  } catch (error) {
    console.error('Update exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
