import { create } from 'zustand';
import { Post } from '@/types';
import { posts as initialPosts } from '@/data/posts';

interface AppState {
  favorites: string[];
  posts: Post[];
  toggleFavorite: (videoId: string) => void;
  isFavorite: (videoId: string) => boolean;
  toggleLikePost: (postId: string) => void;
  addPost: (content: string, images: string[], tags: string[], userName: string, userAvatar: string) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const storedFavorites = localStorage.getItem('fitzone_favorites');
  const initialFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];

  return {
    favorites: initialFavorites,
    posts: initialPosts,

    toggleFavorite: (videoId) => {
      const { favorites } = get();
      let newFavorites: string[];
      if (favorites.includes(videoId)) {
        newFavorites = favorites.filter(id => id !== videoId);
      } else {
        newFavorites = [...favorites, videoId];
      }
      localStorage.setItem('fitzone_favorites', JSON.stringify(newFavorites));
      set({ favorites: newFavorites });
    },

    isFavorite: (videoId) => {
      return get().favorites.includes(videoId);
    },

    toggleLikePost: (postId) => {
      set((state) => ({
        posts: state.posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            };
          }
          return post;
        }),
      }));
    },

    addPost: (content, images, tags, userName, userAvatar) => {
      const newPost: Post = {
        id: 'p' + Date.now(),
        userId: 'current_user',
        userName,
        userAvatar,
        content,
        images,
        likes: 0,
        comments: 0,
        shares: 0,
        tags,
        createdAt: new Date().toISOString(),
        isLiked: false,
      };
      set((state) => ({
        posts: [newPost, ...state.posts],
      }));
    },
  };
});
