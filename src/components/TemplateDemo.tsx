import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api-client';
import type { Chat, ChatMessage, User } from '@shared/types';
import { toast } from 'sonner';
import { useAppStore } from '../stores/useAppStore';
import { Skeleton } from './ui/skeleton';
export function TemplateDemo() {
  const [count, setCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const refetchTrigger = useAppStore((state) => state.refetchData);
  const triggerRefetch = useAppStore((state) => state.triggerRefetch);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [counterRes, usersRes, chatsRes] = await Promise.all([
          api<{ count: number }>('/api/counter'),
          api<User[]>('/api/demo/users'),
          api<Chat[]>('/api/demo/chats'),
        ]);
        setCount(counterRes.count);
        setUsers(usersRes);
        setChats(chatsRes);
        if (usersRes.length > 0 && !selectedUserId) {
          setSelectedUserId(usersRes[0].id);
        }
        if (chatsRes.length > 0 && !selectedChatId) {
          setSelectedChatId(chatsRes[0].id);
        }
      } catch (error) {
        toast.error('Failed to fetch initial data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refetchTrigger, selectedUserId, selectedChatId]);
  useEffect(() => {
    if (selectedChatId) {
      api<ChatMessage[]>(`/api/demo/chats/${selectedChatId}/messages`)
        .then(setMessages)
        .catch(() => toast.error('Failed to fetch messages.'));
    }
  }, [selectedChatId, refetchTrigger]);
  const handleIncrement = async () => {
    try {
      const res = await api<{ count: number }>('/api/counter/increment', { method: 'POST' });
      setCount(res.count);
    } catch (error) {
      toast.error('Failed to increment counter.');
    }
  };
  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    try {
      await api('/api/demo/users', { method: 'POST', body: JSON.stringify({ name: newUserName }) });
      setNewUserName('');
      triggerRefetch();
      toast.success('User added!');
    } catch (error) {
      toast.error('Failed to add user.');
    }
  };
  const handleAddChat = async () => {
    if (!newChatTitle.trim()) return;
    try {
      await api('/api/demo/chats', { method: 'POST', body: JSON.stringify({ title: newChatTitle }) });
      setNewChatTitle('');
      triggerRefetch();
      toast.success('Chat created!');
    } catch (error) {
      toast.error('Failed to create chat.');
    }
  };
  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedChatId || !selectedUserId) return;
    try {
      await api(`/api/demo/chats/${selectedChatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUserId, text: newMessageText }),
      });
      setNewMessageText('');
      triggerRefetch();
    } catch (error) {
      toast.error('Failed to send message.');
    }
  };
  const getUserById = (id: string) => users.find((u) => u.id === id);
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>DO Counter</CardTitle>
          <CardDescription>A simple counter stored in a Durable Object.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-center">{count}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleIncrement} className="w-full">
            Increment
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Users & Chats</CardTitle>
          <CardDescription>Manage users and chat rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Users</Label>
            <ScrollArea className="h-24 border rounded-md p-2">
              {users.map((user) => (
                <div key={user.id} className={`p-1 rounded ${selectedUserId === user.id ? 'bg-accent' : ''}`} onClick={() => setSelectedUserId(user.id)}>
                  {user.username}
                </div>
              ))}
            </ScrollArea>
            <div className="flex gap-2 mt-2">
              <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="New user name" />
              <Button onClick={handleAddUser}>Add</Button>
            </div>
          </div>
          <Separator />
          <div>
            <Label>Chats</Label>
            <ScrollArea className="h-24 border rounded-md p-2">
              {chats.map((chat) => (
                <div key={chat.id} className={`p-1 rounded ${selectedChatId === chat.id ? 'bg-accent' : ''}`} onClick={() => setSelectedChatId(chat.id)}>
                  {chat.title}
                </div>
              ))}
            </ScrollArea>
            <div className="flex gap-2 mt-2">
              <Input value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} placeholder="New chat title" />
              <Button onClick={handleAddChat}>Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Chat: {chats.find((c) => c.id === selectedChatId)?.title || 'Select a chat'}</CardTitle>
          <CardDescription>Messages will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-64 p-4 border rounded-md">
            {messages.map((msg) => (
              <div key={msg.id} className="mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="font-bold">{getUserById(msg.userId)?.username || '?'}</span>:
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{new Date(msg.ts).toLocaleString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>{' '}
                {msg.text}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Input value={newMessageText} onChange={(e) => setNewMessageText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
          <Button onClick={handleSendMessage}>Send</Button>
        </CardFooter>
      </Card>
    </div>
  );
}