import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Chat, Message, MessageRead, Reaction
from portalusers.models import Users

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.room_group_name = f'chat_{self.chat_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'chat_message':
            # Save message to database
            message = await self.save_message(
                chat_id=data.get('chat_id'),
                content=data.get('content'),
                file_id=data.get('file_id'),
                reply_to=data.get('reply_to')
            )

            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message
                }
            )

        elif message_type == 'typing_indicator':
            # Send typing indicator to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user': await self.get_user_data(self.user)
                }
            )

        elif message_type == 'mark_read':
            # Mark messages as read
            await self.mark_messages_read(
                data.get('message_ids', [])
            )

            # Send read receipt to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_read',
                    'message_ids': data.get('message_ids', [])
                }
            )

        elif message_type == 'reaction':
            # Save reaction to database
            await self.save_reaction(
                message_id=data.get('message_id'),
                emoji=data.get('emoji'),
                action=data.get('action', 'add')
            )

            # Send reaction update to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction',
                    'message_id': data.get('message_id'),
                    'emoji': data.get('emoji'),
                    'user': await self.get_user_data(self.user),
                    'action': data.get('action', 'add')
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    # Receive typing indicator from room group
    async def typing_indicator(self, event):
        # Send typing indicator to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'typing_indicator',
            'user': event['user']
        }))

    # Receive read receipt from room group
    async def message_read(self, event):
        # Send read receipt to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_ids': event['message_ids']
        }))

    # Receive reaction update from room group
    async def message_reaction(self, event):
        # Send reaction update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'emoji': event['emoji'],
            'user': event['user'],
            'action': event['action']
        }))

    # Database access methods
    @database_sync_to_async
    def save_message(self, chat_id, content, file_id=None, reply_to=None):
        chat = Chat.objects.get(id=chat_id)
        
        message = Message(
            chat=chat,
            sender=self.user,
            content=content
        )
        
        if reply_to:
            message.reply_to = Message.objects.get(id=reply_to)
            
        if file_id:
            try:
                prev_msg = Message.objects.get(id=file_id)
                message.file = prev_msg.file
                message.file_name = prev_msg.file_name
                message.file_size = prev_msg.file_size
            except Message.DoesNotExist:
                pass
       
        message.save()
        
        # Format the message for JSON response
        return {
            'id': str(message.id),
            'chat_id': str(message.chat.id),
            'content': message.content,
            'sender': self.get_user_data_sync(message.sender),
            'timestamp': message.timestamp.isoformat(),
            'file': self.get_file_data(message) if message.file else None,
            'reply_to': self.get_reply_data(message.reply_to) if message.reply_to else None,
            'forwarded': message.forwarded,
            'read': False
        }
    
    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        for message_id in message_ids:
            try:
                message = Message.objects.get(id=message_id)
                # Skip if sender is marking their own message as read
                if message.sender == self.user:
                    continue
                    
                MessageRead.objects.get_or_create(
                    message=message,
                    user=self.user
                )
            except Message.DoesNotExist:
                pass
                
    @database_sync_to_async
    def save_reaction(self, message_id, emoji, action='add'):
        message = Message.objects.get(id=message_id)
        
        if action == 'add':
            Reaction.objects.get_or_create(
                message=message,
                user=self.user,
                emoji=emoji
            )
        else:
            Reaction.objects.filter(
                message=message,
                user=self.user,
                emoji=emoji
            ).delete()
            
    @database_sync_to_async
    def get_user_data(self, user):
        return self.get_user_data_sync(user)
        
    def get_user_data_sync(self, user):
        return {
            'id': str(user.id),
            'name': user.get_full_name() or user.username,
            'avatar_url': user.profile.avatar_url if hasattr(user, 'profile') else None
        }
        
    def get_file_data(self, message):
        if not message.file:
            return None
            
        return {
            'url': message.file.url,
            'name': message.file_name,
            'size': message.file_size,
            'type': message.file.name.split('.')[-1]
        }
        
    def get_reply_data(self, message):
        if not message:
            return None
            
        return {
            'id': str(message.id),
            'content': message.content[:50] + ('...' if len(message.content) > 50 else ''),
            'sender': self.get_user_data_sync(message.sender)
        }