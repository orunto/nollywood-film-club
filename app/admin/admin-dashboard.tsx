'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilmSlateIcon, FileTextIcon, FlagIcon, UsersIcon, ChatsCircleIcon } from "@phosphor-icons/react";
import ContentManagement from './content-management';
import DiscussionsManagement from './discussions-management';
import BlogPostsManagement from './blog-posts-management';
import ReviewsManagement from './reviews-management';
import UserReviewsManagement from './user-reviews-management';
import UsersManagement from './users-management';

const tabTriggerClass = "rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none text-black/60 data-[state=active]:text-black font-light data-[state=active]:font-medium gap-2 py-3";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('content');

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm font-light text-white/60">Manage movies, reviews, and content</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-6 bg-transparent border-b border-black/10 rounded-none p-0 h-auto">
            <TabsTrigger value="content" className={tabTriggerClass}>
              <FilmSlateIcon className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="discussions" className={tabTriggerClass}>
              <ChatsCircleIcon className="w-4 h-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="reviews" className={tabTriggerClass}>
              <FileTextIcon className="w-4 h-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="user-reviews" className={tabTriggerClass}>
              <FlagIcon className="w-4 h-4" />
              User Reviews
            </TabsTrigger>
            <TabsTrigger value="blog" className={tabTriggerClass}>
              <FileTextIcon className="w-4 h-4" />
              Blog Posts
            </TabsTrigger>
            <TabsTrigger value="users" className={tabTriggerClass}>
              <UsersIcon className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <ContentManagement />
          </TabsContent>

          <TabsContent value="discussions" className="space-y-6">
            <DiscussionsManagement />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <ReviewsManagement />
          </TabsContent>

          <TabsContent value="user-reviews" className="space-y-6">
            <UserReviewsManagement />
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <BlogPostsManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
