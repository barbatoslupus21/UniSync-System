from django.contrib import admin
from .models import Chat, Contact, Message, ChatFile, ChatMember, Reaction, MessageRead

admin.site.register(Chat)
admin.site.register(Contact)
admin.site.register(Message)
admin.site.register(ChatFile)
admin.site.register(ChatMember)
admin.site.register(Reaction)
admin.site.register(MessageRead)
