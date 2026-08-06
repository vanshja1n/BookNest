import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request) {
  try {
    await connectDB();
    
    
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      
    } else {
      
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
    }

    
    const users = await User.find({})
      .select('name email profilePicture bio location rating books exchangesCompleted createdAt')
      .populate('books', 'title author coverImage genre')
      .sort({ createdAt: -1 });

    console.log('All Users API - Found users:', users.length);

    
    const Exchange = (await import('@/models/Exchange')).default;
    const usersWithExchangeCounts = await Promise.all(
      users.map(async (user) => {
        let exchangesCompleted = user.exchangesCompleted || 0;
        
        
        if (exchangesCompleted === 0) {
          const completedExchanges = await Exchange.countDocuments({
            $or: [
              { requesterId: user._id, status: 'completed' },
              { ownerId: user._id, status: 'completed' }
            ]
          });
          
          
          if (completedExchanges > 0) {
            await User.findByIdAndUpdate(user._id, { 
              exchangesCompleted: completedExchanges 
            });
            exchangesCompleted = completedExchanges;
          }
        }
        
        const finalProfilePicture = (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.trim() !== '') 
          ? user.profilePicture 
          : null;

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: finalProfilePicture,
          bio: user.bio,
          location: user.location,
          rating: user.rating || 0,
          books: user.books || [],
          exchangesCompleted: exchangesCompleted,
          createdAt: user.createdAt
        };
      })
    );

    return NextResponse.json({ 
      users: usersWithExchangeCounts
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
