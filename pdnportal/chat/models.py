from django.db import models
from portalusers.models import Users
from django.core.validators import FileExtensionValidator, MaxValueValidator
import os

class Contact(models.Model):
    user = models.ForeignKey(Users, related_name='user_contact', on_delete=models.CASCADE)
    contact = models.ForeignKey(Users, related_name='contact_user', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'contact')

class Chat(models.Model):
    CHAT_TYPES = (
        ('direct', 'Direct Message'),
        ('group', 'Group Chat'),
    )

    name = models.CharField(max_length=255, blank=True, null=True)
    chat_type = models.CharField(max_length=10, choices=CHAT_TYPES)
    participants = models.ManyToManyField(Users, through='ChatMember')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ChatMember(models.Model):
    ROLES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
    )

    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('chat', 'user')

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    sender = models.ForeignKey(Users, on_delete=models.CASCADE)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='chat_files/%Y/%m/%d/',
                            validators=[
                                FileExtensionValidator(allowed_extensions=[
                                    'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx',
                                    'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'
                                ])
                            ],
                            null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.PositiveIntegerField(
        validators=[MaxValueValidator(10 * 1024 * 1024)],  # 10MB max
        blank=True, null=True
    )
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    forwarded = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    unread = models.BooleanField(default=True)  # New field to track if message is unread

class MessageRead(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')

class Reaction(models.Model):
    message = models.ForeignKey(Message, related_name='reactions', on_delete=models.CASCADE)
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emoji')

def get_file_upload_path(instance, filename):
    # Generate a path like: chat_files/chat_id/year/month/day/filename
    from datetime import datetime
    now = datetime.now()
    return f'chat_files/{instance.chat.id}/{now.strftime("%Y/%m/%d")}/{filename}'

class ChatFile(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    uploader = models.ForeignKey(Users, on_delete=models.CASCADE)
    file = models.FileField(
        upload_to=get_file_upload_path,
        validators=[
            FileExtensionValidator(allowed_extensions=[
                'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx',
                'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'
            ])
        ]
    )
    name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField(
        validators=[MaxValueValidator(10 * 1024 * 1024)]  # 10MB max
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def filename(self):
        return os.path.basename(self.file.name)

class UserOnlineStatus(models.Model):
    """Model to track user online status"""
    user = models.OneToOneField(Users, on_delete=models.CASCADE)
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {'Online' if self.is_online else 'Offline'}"