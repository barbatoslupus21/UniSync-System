from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Q, Max, Count, OuterRef, Subquery, Value, IntegerField
from portalusers.models import Users
from django.core.paginator import Paginator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.conf import settings
from django.utils import timezone
from .models import Chat, Contact, Message, ChatFile, ChatMember, Reaction, MessageRead
import json
import os
import datetime

# HTML Views
@login_required
def chat_view(request):
    # Store the request in the get_user_online_status function
    get_user_online_status.request = request

    # Get user's chats
    chats = get_user_chats(request.user)
    contacts = get_user_contacts(request.user)

    return render(request, 'chat/chat.html', {
        'chats': chats,
        'contacts': contacts
    })

# API Views

@login_required
@require_GET
def get_chats(request):
    # Store the request in the get_user_online_status function
    get_user_online_status.request = request

    chats = get_user_chats(request.user)
    return JsonResponse(chats, safe=False)

@login_required
@require_GET
def get_chat(request, chat_id):
    try:
        # Store the request in the get_user_online_status function
        get_user_online_status.request = request

        # Log the request for debugging
        print(f"Loading chat {chat_id} for user {request.user.id}")

        chat = get_object_or_404(Chat, id=chat_id, participants=request.user)
        print(f"Found chat: {chat.id}, type: {chat.chat_type}")

        # Get chat details
        try:
            chat_data = get_chat_data(chat, request.user)
            print(f"Chat data loaded successfully")
        except Exception as e:
            print(f"Error getting chat data: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': 'Failed to load chat data'}, status=500)

        # Get messages
        try:
            messages = get_chat_messages(chat, request.user)
            print(f"Loaded {len(messages)} messages")
        except Exception as e:
            print(f"Error getting chat messages: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': 'Failed to load messages'}, status=500)

        return JsonResponse({
            'chat': chat_data,
            'messages': messages
        })
    except Exception as e:
        print(f"Unexpected error in get_chat: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': 'An unexpected error occurred'}, status=500)

@login_required
def get_contacts(request):
    # Store the request in the get_user_online_status function
    get_user_online_status.request = request

    if request.method == 'GET':
        contacts = get_user_contacts(request.user)
        return JsonResponse(contacts, safe=False)
    elif request.method == 'POST':
        return add_contact(request)
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
@require_POST
def add_contact(request):
    # Store the request in the get_user_online_status function
    get_user_online_status.request = request
    data = json.loads(request.body)
    user_id = data.get('user_id')

    if not user_id:
        return JsonResponse({'error': 'Users ID is required'}, status=400)

    try:
        contact_user = Users.objects.get(id=user_id)

        # Don't allow adding self as contact
        if contact_user == request.user:
            return JsonResponse({'error': 'Cannot add yourself as a contact'}, status=400)

        # Create contact if it doesn't exist
        contact, created = Contact.objects.get_or_create(
            user=request.user,
            contact=contact_user
        )

        return JsonResponse({
            'success': True,
            'contact': {
                'id': contact_user.id,
                'name': contact_user.name or contact_user.username,
                'avatar_url': contact_user.avatar.url if contact_user.avatar else None,
                'title': getattr(contact_user.profile, 'title', '') if hasattr(contact_user, 'profile') else '',
                'department': getattr(contact_user.profile, 'department', '') if hasattr(contact_user, 'profile') else '',
                'online': get_user_online_status(contact_user)
            }
        })
    except Users.DoesNotExist:
        return JsonResponse({'error': 'Users not found'}, status=404)

@login_required
@require_POST
def create_direct_chat(request, user_id):
    contact_user = get_object_or_404(Users, id=user_id)

    # Check if chat already exists
    chats = Chat.objects.filter(
        chat_type='direct',
        participants=request.user
    ).filter(
        participants=contact_user
    )

    if chats.exists():
        chat = chats.first()
    else:
        # Create new chat
        chat = Chat.objects.create(
            chat_type='direct'
        )

        # Add participants
        ChatMember.objects.create(chat=chat, user=request.user)
        ChatMember.objects.create(chat=chat, user=contact_user)

    # Check if initial message was sent
    data = {}
    try:
        data = json.loads(request.body)
    except:
        pass

    initial_message = data.get('message')
    if initial_message:
        Message.objects.create(
            chat=chat,
            sender=request.user,
            content=initial_message
        )

    return JsonResponse({
        'success': True,
        'chat_id': chat.id
    })

@login_required
@require_POST
def create_group_chat(request):
    data = json.loads(request.body)

    name = data.get('name')
    member_ids = data.get('members', [])

    if not name:
        return JsonResponse({'error': 'Group name is required'}, status=400)

    if not member_ids:
        return JsonResponse({'error': 'At least one member is required'}, status=400)

    # Create new chat
    chat = Chat.objects.create(
        name=name,
        chat_type='group'
    )

    # Add current user as admin
    ChatMember.objects.create(
        chat=chat,
        user=request.user,
        role='admin'
    )

    # Add other members
    for member_id in member_ids:
        try:
            user = Users.objects.get(id=member_id)
            ChatMember.objects.create(
                chat=chat,
                user=user
            )
        except Users.DoesNotExist:
            pass

    return JsonResponse({
        'success': True,
        'chat_id': chat.id
    })

@login_required
@require_POST
def add_group_members(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)

    # Check if user is admin
    is_admin = ChatMember.objects.filter(
        chat=chat,
        user=request.user,
        role='admin'
    ).exists()

    if not is_admin:
        return JsonResponse({'error': 'Only admins can add members'}, status=403)

    data = json.loads(request.body)
    member_ids = data.get('members', [])

    if not member_ids:
        return JsonResponse({'error': 'At least one member is required'}, status=400)

    # Add members
    for member_id in member_ids:
        try:
            user = Users.objects.get(id=member_id)

            # Skip if already a member
            if chat.participants.filter(id=user.id).exists():
                continue

            ChatMember.objects.create(
                chat=chat,
                user=user
            )

            # Create system message
            Message.objects.create(
                chat=chat,
                sender=request.user,
                content=f"{request.user.name or request.user.username} added {user.name or user.username} to the group"
            )
        except Users.DoesNotExist:
            pass

    # Get updated chat data
    chat_data = get_chat_data(chat, request.user)

    return JsonResponse({
        'success': True,
        'chat': chat_data
    })

@login_required
@require_POST
def rename_group(request, chat_id):
    print(f"Rename group request received for chat_id: {chat_id}, user: {request.user.id}")

    try:
        chat = get_object_or_404(Chat, id=chat_id, chat_type='group', participants=request.user)
        print(f"Found chat: {chat.id}, current name: {chat.name}")

        # Check if user is admin
        is_admin = ChatMember.objects.filter(
            chat=chat,
            user=request.user,
            role='admin'
        ).exists()
        print(f"User is admin: {is_admin}")

        if not is_admin:
            print(f"User {request.user.id} is not an admin of chat {chat_id}")
            return JsonResponse({'error': 'Only admins can rename the group'}, status=403)

        # Print request headers and body for debugging
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request content type: {request.content_type}")
        print(f"Request body: {request.body.decode('utf-8')}")

        try:
            data = json.loads(request.body)
            print(f"Parsed request data: {data}")
            new_name = data.get('name')
            print(f"New name: {new_name}")
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {str(e)}")
            return JsonResponse({'error': 'Invalid JSON format'}, status=400)

        if not new_name:
            print("No name provided in request")
            return JsonResponse({'error': 'Group name is required'}, status=400)

        # Update chat name
        old_name = chat.name
        chat.name = new_name
        chat.save()
        print(f"Chat renamed from '{old_name}' to '{new_name}'")

        # Create system message
        system_message = Message.objects.create(
            chat=chat,
            sender=request.user,
            content=f"{request.user.name or request.user.username} renamed the group from '{old_name}' to '{new_name}'"
        )
        print(f"System message created: {system_message.id}")

        response_data = {
            'success': True,
            'name': new_name
        }
        print(f"Sending response: {response_data}")
        return JsonResponse(response_data)

    except Exception as e:
        print(f"Error in rename_group: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)

@login_required
@require_GET
def get_available_contacts(request, chat_id):
    print(f"Getting available contacts for chat_id: {chat_id}, user: {request.user.id}")

    try:
        # Get the chat
        chat = get_object_or_404(Chat, id=chat_id, chat_type='group', participants=request.user)
        print(f"Found chat: {chat.id}, name: {chat.name}")

        # Get current participants
        current_participants = chat.participants.all().values_list('id', flat=True)
        print(f"Current participants: {list(current_participants)}")

        # Get user's contacts
        contacts = get_user_contacts(request.user)
        print(f"User has {len(contacts)} contacts")

        # Filter out contacts that are already in the group
        available_contacts = [contact for contact in contacts if contact['id'] not in current_participants]
        print(f"Found {len(available_contacts)} available contacts")

        return JsonResponse({
            'success': True,
            'contacts': available_contacts
        })

    except Exception as e:
        print(f"Error in get_available_contacts: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)

@login_required
@require_POST
def leave_group(request, chat_id):
    print(f"Leave group request received for chat_id: {chat_id}, user: {request.user.id}")

    try:
        chat = get_object_or_404(Chat, id=chat_id, chat_type='group', participants=request.user)
        print(f"Found chat: {chat.id}, name: {chat.name}")

        # Get user membership
        membership = get_object_or_404(ChatMember, chat=chat, user=request.user)
        print(f"Found membership, role: {membership.role}")

        # Check if user is the only admin
        is_admin = membership.role == 'admin'
        other_admins = ChatMember.objects.filter(chat=chat, role='admin').exclude(user=request.user).exists()
        print(f"User is admin: {is_admin}, other admins exist: {other_admins}")

        if is_admin and not other_admins:
            # Check if there are other members
            other_members = ChatMember.objects.filter(chat=chat).exclude(user=request.user)
            print(f"Found {other_members.count()} other members")

            if other_members.exists():
                # Promote someone else to admin
                new_admin = other_members.first()
                new_admin.role = 'admin'
                new_admin.save()
                print(f"Promoted user {new_admin.user.id} to admin")

        # Print request headers for debugging
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request content type: {request.content_type}")

        # Create system message
        system_message = Message.objects.create(
            chat=chat,
            sender=request.user,
            content=f"{request.user.name or request.user.username} left the group"
        )
        print(f"System message created: {system_message.id}")

        # Remove user from chat
        membership.delete()
        print(f"User {request.user.id} removed from chat {chat.id}")

        response_data = {
            'success': True
        }
        print(f"Sending response: {response_data}")
        return JsonResponse(response_data)

    except Exception as e:
        print(f"Error in leave_group: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)

@login_required
@require_POST
def upload_file(request):
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    file = request.FILES['file']
    chat_id = request.POST.get('chat_id')

    # Check file size (max 10MB)
    if file.size > 10 * 1024 * 1024:
        return JsonResponse({'error': 'File size exceeds the 10MB limit'}, status=400)

    # Check file type (no videos)
    file_ext = os.path.splitext(file.name)[1].lower()
    if file_ext in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']:
        return JsonResponse({'error': 'Video files are not allowed'}, status=400)

    # Check if chat exists and user is a participant
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)

    # Save the file as a ChatFile
    chat_file = ChatFile.objects.create(
        chat=chat,
        uploader=request.user,
        file=file,
        name=file.name,
        content_type=file.content_type,
        size=file.size
    )

    return JsonResponse({
        'success': True,
        'file_id': chat_file.id
    })

@login_required
@require_GET
def search_messages(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)

    query = request.GET.get('query', '')
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    files_only = request.GET.get('files_only') == 'true'
    images_only = request.GET.get('images_only') == 'true'

    # Base queryset
    messages = Message.objects.filter(chat=chat)

    # Apply filters
    if query:
        messages = messages.filter(content__icontains=query)

    if date_from:
        messages = messages.filter(timestamp__date__gte=date_from)

    if date_to:
        messages = messages.filter(timestamp__date__lte=date_to)

    if files_only:
        messages = messages.exclude(file='')

    if images_only:
        messages = messages.filter(file__endswith__in=['.jpg', '.jpeg', '.png', '.gif'])

    # Order by timestamp
    messages = messages.order_by('timestamp')

    # Prepare response
    messages_data = get_messages_data(messages, request.user)

    return JsonResponse({
        'messages': messages_data
    })

@login_required
@require_GET
def search_contacts(request):
    # Store the request in the get_user_online_status function
    get_user_online_status.request = request
    query = request.GET.get('query', '')

    if not query or len(query) < 2:
        # Return all users if query is empty or less than 2 characters
        users = Users.objects.all().exclude(id=request.user.id)
    else:
        # Search users by name or username
        users = Users.objects.filter(
            Q(name__icontains=query) |
            Q(username__icontains=query)
        ).exclude(id=request.user.id)

    # Get contacts
    contacts = Contact.objects.filter(user=request.user).values_list('contact_id', flat=True)

    # Prepare response
    results = []

    for user in users:
        results.append({
            'id': user.id,
            'name': user.name or user.username,
            'avatar_url': user.avatar.url if user.avatar else None,
            'title': user.position or '',
            'department': user.line.line_name if user.line else '',
            'is_contact': user.id in contacts
        })

    return JsonResponse(results, safe=False)

@login_required
@require_POST
def forward_message(request):
    data = json.loads(request.body)

    message_id = data.get('message_id')
    recipients = data.get('recipients', [])

    if not message_id or not recipients:
        return JsonResponse({'error': 'Message ID and recipients are required'}, status=400)

    # Get original message
    original_message = get_object_or_404(Message, id=message_id)

    # Forward message to each recipient
    for recipient in recipients:
        chat_id = recipient.get('id')
        chat_type = recipient.get('type')

        # Get or create chat
        if chat_type == 'direct':
            # For direct chats, recipient ID could be a user ID
            if len(chat_id) < 10:  # Assume user ID if short
                try:
                    user = Users.objects.get(id=chat_id)

                    # Find or create direct chat
                    chats = Chat.objects.filter(
                        chat_type='direct',
                        participants=request.user
                    ).filter(
                        participants=user
                    )

                    if chats.exists():
                        chat = chats.first()
                    else:
                        chat = Chat.objects.create(chat_type='direct')
                        ChatMember.objects.create(chat=chat, user=request.user)
                        ChatMember.objects.create(chat=chat, user=user)
                except Users.DoesNotExist:
                    continue
            else:
                try:
                    chat = Chat.objects.get(id=chat_id, participants=request.user)
                except Chat.DoesNotExist:
                    continue
        else:
            try:
                chat = Chat.objects.get(id=chat_id, participants=request.user)
            except Chat.DoesNotExist:
                continue

        # Create forwarded message
        forwarded_message = Message(
            chat=chat,
            sender=request.user,
            content=original_message.content,
            forwarded=True
        )

        # Copy file if present
        if original_message.file:
            forwarded_message.file = original_message.file
            forwarded_message.file_name = original_message.file_name
            forwarded_message.file_size = original_message.file_size

        forwarded_message.save()

    return JsonResponse({
        'success': True
    })

# Helper functions

def get_user_chats(user):
    print(f"Getting chats for user {user.id}")
    chats = Chat.objects.filter(participants=user)

    # Get last message for each chat
    last_messages = Message.objects.filter(
        chat=OuterRef('pk')
    ).order_by('-timestamp')

    # Get the user's last activity in each chat
    try:
        chat_members = ChatMember.objects.filter(
            chat=OuterRef('pk'),
            user=user
        )

        # Get the last time the user was active in the chat
        last_activity_time = chat_members.values('joined_at')[:1]

        print(f"Got last activity for user {user.id}")
    except Exception as e:
        print(f"Error getting last activity: {e}")

    # Count unread messages using the new unread field
    # Only count messages that are marked as unread and not sent by the current user
    unread_counts = Message.objects.filter(
        chat=OuterRef('pk'),
        unread=True
    ).exclude(
        sender=user
    ).values('chat').annotate(
        count=Count('id')
    ).values('count')

    print("Preparing unread counts query using unread field...")

    chats = chats.annotate(
        last_message_time=Subquery(last_messages.values('timestamp')[:1]),
        last_message_content=Subquery(last_messages.values('content')[:1]),
        last_message_sender=Subquery(last_messages.values('sender')[:1]),
        last_message_file=Subquery(last_messages.values('file')[:1]),
        unread_count=Subquery(unread_counts[:1])
    ).order_by('-last_message_time')

    # Format chat data
    result = []

    for chat in chats:
        # For direct chats, get other participant
        if chat.chat_type == 'direct':
            other_user = chat.participants.exclude(id=user.id).first()
            if other_user:
                name = other_user.name or other_user.username
                avatar_url = other_user.avatar.url if other_user.avatar else None
                online = get_user_online_status(other_user)
                print(f"Direct chat with user {other_user.id}")
            else:
                # Handle case where there's no other participant
                print(f"Warning: No other participant found in direct chat {chat.id}")
                name = "Unknown User"
                avatar_url = None
                online = False
        else:
            name = chat.name
            avatar_url = None
            online = False

        # Format last message
        last_message = chat.last_message_content or ''
        last_message_is_file = bool(chat.last_message_file)

        if last_message_is_file:
            if last_message:
                last_message = f"File: {last_message}"
            else:
                last_message = "File"

        # Format time
        last_message_time = ''
        if chat.last_message_time:
            # Format as "Today", "Yesterday", or date
            import datetime
            from django.utils import timezone
            today = datetime.datetime.now().date()
            message_date = chat.last_message_time.date()

            if message_date == today:
                # Use 12-hour format with AM/PM and ensure it's in local timezone
                local_time = chat.last_message_time.astimezone(timezone.get_current_timezone())
                last_message_time = local_time.strftime('%I:%M %p')  # 12-hour format with AM/PM
            elif message_date == today - datetime.timedelta(days=1):
                last_message_time = 'Yesterday'
            else:
                last_message_time = message_date.strftime('%d/%m/%Y')

        # Get unread count and ensure it's an integer
        unread_count = chat.unread_count or 0

        # Log the unread count for debugging
        print(f"Chat {chat.id} ({name}) - Unread count: {unread_count}")

        result.append({
            'id': chat.id,
            'name': name,
            'type': chat.chat_type,
            'avatar_url': avatar_url,
            'online': online,
            'last_message': last_message,
            'last_message_time': last_message_time,
            'last_message_is_file': last_message_is_file,
            'unread_count': unread_count,
            'unread': unread_count > 0
        })

    return result

def get_user_contacts(user):
    # Get user's contacts
    contacts = Contact.objects.filter(user=user)

    result = []

    for contact in contacts:
        contact_user = contact.contact

        # Get the last message time between user and contact
        last_message_time = None
        try:
            # Find direct chat between user and contact
            chat = Chat.objects.filter(
                chat_type='direct',
                participants=user
            ).filter(participants=contact_user).first()

            if chat:
                last_message = Message.objects.filter(chat=chat).order_by('-timestamp').first()
                if last_message:
                    last_message_time = last_message.timestamp.isoformat()
        except Exception as e:
            print(f"Error getting last message time for contact {contact_user.id}: {str(e)}")

        result.append({
            'id': contact_user.id,
            'name': contact_user.name or contact_user.username,
            'avatar_url': contact_user.avatar.url if contact_user.avatar else None,
            'title': getattr(contact_user.profile, 'title', '') if hasattr(contact_user, 'profile') else '',
            'department': getattr(contact_user.profile, 'department', '') if hasattr(contact_user, 'profile') else '',
            'online': get_user_online_status(contact_user),
            'last_message_time': last_message_time
        })

    return result

def get_chat_data(chat, user):
    try:
        print(f"Getting chat data for chat {chat.id}")

        # For direct chats, get other participant
        if chat.chat_type == 'direct':
            try:
                other_user = chat.participants.exclude(id=user.id).first()
                if other_user:
                    name = other_user.name or other_user.username
                    avatar_url = other_user.avatar.url if other_user.avatar else None
                    online = get_user_online_status(other_user)
                    print(f"Direct chat with user {other_user.id}")
                else:
                    print(f"Warning: No other participant found in direct chat {chat.id}")
                    name = "Unknown User"
                    avatar_url = None
                    online = False
            except Exception as e:
                print(f"Error getting other participant: {str(e)}")
                name = "Unknown User"
                avatar_url = None
                online = False
        else:
            name = chat.name
            avatar_url = None
            online = False
            print(f"Group chat: {name}")

        # Get participants
        participants = []
        try:
            print(f"Getting participants for chat {chat.id}")
            for participant in chat.participants.all():
                try:
                    role = ChatMember.objects.get(chat=chat, user=participant).role
                    participants.append({
                        'id': participant.id,
                        'name': participant.name or participant.username,
                        'avatar_url': participant.avatar.url if participant.avatar else None,
                        'department': participant.line.line_name if participant.line else '',
                        'title': participant.position or '',
                        'role': role,
                        'online': get_user_online_status(participant)
                    })
                except Exception as e:
                    print(f"Error processing participant {participant.id}: {str(e)}")
            print(f"Found {len(participants)} participants")
        except Exception as e:
            print(f"Error getting participants: {str(e)}")
            import traceback
            traceback.print_exc()

        # Get shared files
        shared_files = []
        try:
            print(f"Getting shared files for chat {chat.id}")
            file_messages = Message.objects.filter(chat=chat).exclude(file='')
            print(f"Found {file_messages.count()} file messages")

            for message in file_messages:
                try:
                    if message.file:
                        shared_files.append({
                            'id': message.id,
                            'name': message.file_name or os.path.basename(message.file.name),
                            'url': message.file.url,
                            'size': message.file_size or message.file.size,
                            'type': os.path.splitext(message.file.name)[1].lower(),
                            'uploaded_by': {
                                'id': message.sender.id,
                                'name': message.sender.name or message.sender.username
                            },
                            'timestamp': message.timestamp.isoformat()
                        })
                except Exception as e:
                    print(f"Error processing file message {message.id}: {str(e)}")
            print(f"Processed {len(shared_files)} shared files")
        except Exception as e:
            print(f"Error getting shared files: {str(e)}")
            import traceback
            traceback.print_exc()

        result = {
            'id': chat.id,
            'name': name,
            'type': chat.chat_type,
            'avatar_url': avatar_url,
            'online': online,
            'participants': participants,
            'shared_files': shared_files,
            'created_at': chat.created_at.isoformat()
        }
        print(f"Chat data prepared successfully")
        return result
    except Exception as e:
        print(f"Unexpected error in get_chat_data: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def get_chat_messages(chat, user):
    try:
        print(f"Getting messages for chat {chat.id}")

        # Count unread messages but don't try to mark them as read here
        # We'll handle that in the frontend
        try:
            unread_count = Message.objects.filter(
                chat=chat
            ).exclude(
                sender=user
            ).count()

            print(f"Found {unread_count} unread messages")
        except Exception as e:
            print(f"Error counting unread messages: {str(e)}")
            import traceback
            traceback.print_exc()

        # Get all messages for the chat
        try:
            # Add more detailed logging
            print(f"Retrieving all messages for chat {chat.id}")

            # Get all messages without any filtering
            messages = Message.objects.filter(chat=chat).order_by('timestamp')
            print(f"Found {messages.count()} total messages in database")

            # Log each message for debugging
            for msg in messages:
                print(f"Message ID: {msg.id}, Sender: {msg.sender.id}, Content: {msg.content[:30]}...")

            # Process messages
            result = get_messages_data(messages, user)
            print(f"Processed {len(result)} messages for frontend")

            # Log processed messages
            for msg in result:
                print(f"Processed message ID: {msg['id']}, Sender: {msg['sender']['id']}, Content: {msg['content'][:30]}...")

            return result
        except Exception as e:
            print(f"Error getting messages: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    except Exception as e:
        print(f"Unexpected error in get_chat_messages: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def get_messages_data(messages, user):
    result = []

    for message in messages:
        try:
            # Use the unread field to determine if a message is read
            # Messages sent by the current user are always considered "read"
            read = not message.unread or message.sender.id == user.id

            # Get reactions
            reactions = []

            for reaction in message.reactions.all():
                reactions.append({
                    'emoji': reaction.emoji,
                    'user': {
                        'id': reaction.user.id,
                        'name': reaction.user.name or reaction.user.username
                    }
                })

            # Prepare file data if present
            file_data = None
            if message.file:
                try:
                    file_data = {
                        'url': message.file.url,
                        'name': message.file_name or os.path.basename(message.file.name),
                        'size': message.file_size or message.file.size,
                        'type': os.path.splitext(message.file.name)[1].lower()
                    }
                except Exception as e:
                    print(f"Error processing file for message {message.id}: {str(e)}")
                    file_data = None

            # Prepare reply_to data if present
            reply_to_data = None
            if message.reply_to is not None:
                try:
                    reply_to_data = {
                        'id': message.reply_to.id,
                        'content': message.reply_to.content[:50] + ('...' if len(message.reply_to.content) > 50 else ''),
                        'sender': {
                            'id': message.reply_to.sender.id,
                            'name': message.reply_to.sender.name or message.reply_to.sender.username
                        }
                    }
                except Exception as e:
                    print(f"Error processing reply_to for message {message.id}: {str(e)}")
                    reply_to_data = None

            # Format message
            result.append({
                'id': message.id,
                'chat_id': message.chat.id,
                'content': message.content,
                'sender': {
                    'id': message.sender.id,
                    'name': message.sender.name or message.sender.username,
                    'avatar_url': message.sender.avatar.url if message.sender.avatar else None
                },
                'timestamp': message.timestamp.isoformat(),
                'file': file_data,
                'reply_to': reply_to_data,
                'forwarded': message.forwarded,
                'read': read,
                'reactions': reactions
            })
        except Exception as e:
            print(f"Error processing message {message.id}: {str(e)}")
            # Skip this message and continue with the next one
            continue

    return result

@login_required
@require_GET
def get_current_user(request):
    """Return information about the current logged-in user"""
    user = request.user
    return JsonResponse({
        'id': user.id,
        'name': user.name or user.username,
        'username': user.username,
        'avatar_url': user.avatar.url if user.avatar else None,
        'position': user.position or '',
        'department': user.line.line_name if user.line else ''
    })

@login_required
def send_message(request, chat_id):
    """Send a message to a chat"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    # Get the chat
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)

    # Parse the request data
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    # Validate the data
    content = data.get('content', '').strip()
    file_id = data.get('file_id')
    reply_to_id = data.get('reply_to')

    if not content and not file_id:
        return JsonResponse({'error': 'Message cannot be empty'}, status=400)

    # Get the file if provided
    chat_file = None
    if file_id:
        chat_file = get_object_or_404(ChatFile, id=file_id, chat=chat)

    # Get the reply_to message if provided
    reply_to = None
    if reply_to_id:
        reply_to = get_object_or_404(Message, id=reply_to_id, chat=chat)

    # Create the message
    message = Message.objects.create(
        chat=chat,
        sender=request.user,
        content=content,
        reply_to=reply_to,
        unread=True  # New messages are unread by default
    )

    # If we have a chat file, update the message with the file information
    if chat_file:
        # Set the file field to the chat_file's file
        message.file = chat_file.file
        message.file_name = chat_file.name
        message.file_size = chat_file.size
        message.save()

    # Prepare response data
    response_data = {
        'id': message.id,
        'content': message.content,
        'timestamp': message.timestamp.isoformat(),
        'sender': {
            'id': message.sender.id,
            'name': message.sender.name or message.sender.username,
            'avatar_url': message.sender.avatar.url if message.sender.avatar else None
        },
        'file': None,
        'reply_to': None
    }

    # Add file data if present
    if message.file:
        response_data['file'] = {
            'url': message.file.url,
            'name': message.file_name or os.path.basename(message.file.name),
            'size': message.file_size or message.file.size,
            'type': os.path.splitext(message.file.name)[1].lower()
        }

    # Add reply_to data if present
    if reply_to:
        response_data['reply_to'] = {
            'id': reply_to.id,
            'content': reply_to.content,
            'sender': {
                'id': reply_to.sender.id,
                'name': reply_to.sender.name or reply_to.sender.username
            }
        }

    return JsonResponse(response_data)

@login_required
def mark_messages_read(request, chat_id):
    """Mark messages as read"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    # Get the chat
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)

    try:
        # Parse the request data
        data = json.loads(request.body)
        message_ids = data.get('message_ids', [])

        # Mark messages as read in the database
        if not message_ids:
            # If no specific message IDs provided, mark all messages in this chat as read
            try:
                # Only mark messages from other users as read
                unread_count = Message.objects.filter(
                    chat=chat,
                    unread=True
                ).exclude(
                    sender=request.user
                ).update(unread=False)

                print(f"Marked {unread_count} messages as read in chat {chat_id}")
            except Exception as e:
                print(f"Error marking all messages as read: {str(e)}")
                import traceback
                traceback.print_exc()
                unread_count = 0
        else:
            # Mark specific messages as read
            try:
                unread_count = Message.objects.filter(
                    chat=chat,
                    id__in=message_ids,
                    unread=True
                ).exclude(
                    sender=request.user
                ).update(unread=False)

                print(f"Marked {unread_count} specific messages as read in chat {chat_id}")
            except Exception as e:
                print(f"Error marking specific messages as read: {str(e)}")
                import traceback
                traceback.print_exc()
                unread_count = len(message_ids)

        # Update the chat member's last activity timestamp
        try:
            ChatMember.objects.filter(
                chat=chat,
                user=request.user
            ).update(joined_at=timezone.now())
        except Exception as e:
            print(f"Error updating chat member timestamp: {str(e)}")

        # Return success to update the UI
        return JsonResponse({
            'success': True,
            'marked_count': unread_count
        })
    except Exception as e:
        print(f"Error in mark_messages_read: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return success anyway to prevent UI issues
        return JsonResponse({
            'success': True,
            'marked_count': 0,
            'error': str(e)
        })

@login_required
@require_GET
def get_message_file(request, message_id):
    """Get file information for a message"""
    # Get the message
    message = get_object_or_404(Message, id=message_id)

    # Check if user is a participant in the chat
    if request.user not in message.chat.participants.all():
        return JsonResponse({'error': 'Access denied'}, status=403)

    # Check if message has a file
    if not message.file:
        return JsonResponse({'error': 'Message has no file'}, status=404)

    # Return file information
    return JsonResponse({
        'file_url': message.file.url,
        'file_name': message.file_name or os.path.basename(message.file.name),
        'file_size': message.file_size or message.file.size,
        'file_type': os.path.splitext(message.file.name)[1].lower()
    })

@login_required
def delete_message(request, message_id):
    """Delete a message"""
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        # Get the message
        message = get_object_or_404(Message, id=message_id)

        # Check if user is the sender of the message
        if message.sender != request.user:
            return JsonResponse({'error': 'You can only delete your own messages'}, status=403)

        # Check if user is a participant in the chat
        if request.user not in message.chat.participants.all():
            return JsonResponse({'error': 'Access denied'}, status=403)

        # Store chat ID for updating UI
        chat_id = message.chat.id

        # Instead of deleting, update the message content to indicate it was deleted
        # This avoids the SQLite trigger issues
        message.content = "[Message deleted]"
        if message.file:
            # Clear the file reference but don't delete the actual file
            message.file = None
            message.file_name = None
            message.file_size = None

        # Save the updated message
        message.save()

        return JsonResponse({
            'success': True,
            'message': 'Message deleted successfully',
            'chat_id': chat_id
        })
    except Exception as e:
        print(f"Error deleting message: {str(e)}")
        return JsonResponse({
            'error': f'Failed to delete message: {str(e)}'
        }, status=500)

def get_user_online_status(user):
    """Get the online status of a user"""
    from .models import UserOnlineStatus
    from django.utils import timezone
    import datetime

    # Always consider the current user as online
    request = getattr(get_user_online_status, 'request', None)
    if request and request.user.is_authenticated and user.id == request.user.id:
        # Update the current user's online status
        status, created = UserOnlineStatus.objects.get_or_create(user=user)
        status.is_online = True
        status.save()
        return True

    try:
        # Check if the user has an online status record
        status = UserOnlineStatus.objects.get(user=user)

        # If the user is marked as online and has activity in the last 5 minutes, consider them online
        if status.is_online:
            # Check if the last activity was within the last 5 minutes
            five_minutes_ago = timezone.now() - datetime.timedelta(minutes=5)
            if status.last_activity >= five_minutes_ago:
                return True
            else:
                # If the last activity was more than 5 minutes ago, mark them as offline
                status.is_online = False
                status.save()
                return False
        return False
    except UserOnlineStatus.DoesNotExist:
        # If no status record exists, create one and mark as offline
        UserOnlineStatus.objects.create(user=user, is_online=False)
        return False


# ========================================
# AJAX Long Polling Views for Chat
# ========================================

@login_required
@require_GET
def poll_messages(request):
    """
    Long polling endpoint for new messages.
    Returns new messages since the provided timestamp.
    Note: For SQLite, we use short polling to avoid database locking.
    """
    from django.db import connection
    
    last_timestamp = request.GET.get('since')
    
    # Parse the timestamp
    if last_timestamp:
        try:
            last_time = datetime.datetime.fromisoformat(last_timestamp.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            last_time = timezone.now() - datetime.timedelta(seconds=5)
    else:
        last_time = timezone.now() - datetime.timedelta(seconds=5)
    
    # Update user's online status
    update_user_online_status(request.user)
    
    # Get user's chat IDs
    user_chats = list(Chat.objects.filter(participants=request.user).values_list('id', flat=True))
    
    # Query for new messages (no blocking loop to avoid SQLite locking)
    new_messages = Message.objects.filter(
        chat_id__in=user_chats,
        timestamp__gt=last_time
    ).exclude(
        sender=request.user
    ).select_related('sender', 'chat', 'reply_to').order_by('timestamp')
    
    messages_data = []
    for msg in new_messages:
        msg_data = {
            'id': msg.id,
            'chat_id': msg.chat_id,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat(),
            'sender': {
                'id': msg.sender.id,
                'name': msg.sender.name or msg.sender.username,
                'avatar_url': msg.sender.avatar.url if msg.sender.avatar else None
            },
            'file': None,
            'reply_to': None,
            'unread': msg.unread
        }
        
        if msg.file:
            msg_data['file'] = {
                'url': msg.file.url,
                'name': msg.file_name or os.path.basename(msg.file.name),
                'size': msg.file_size or 0,
                'type': os.path.splitext(msg.file.name)[1].lower()
            }
        
        if msg.reply_to:
            msg_data['reply_to'] = {
                'id': msg.reply_to.id,
                'content': msg.reply_to.content,
                'sender': {
                    'id': msg.reply_to.sender.id,
                    'name': msg.reply_to.sender.name or msg.reply_to.sender.username
                }
            }
        
        messages_data.append(msg_data)
    
    # Close database connection to prevent locking
    connection.close()
    
    return JsonResponse({
        'messages': messages_data,
        'timestamp': timezone.now().isoformat()
    })


@login_required
@require_GET
def poll_typing(request, chat_id):
    """
    Long polling endpoint for typing indicators.
    """
    # Verify user has access to this chat
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)
    
    # Get typing users from cache/session (simplified - in production use Redis/cache)
    typing_users = get_typing_users(chat_id, request.user.id)
    
    return JsonResponse({
        'typing': typing_users,
        'timestamp': timezone.now().isoformat()
    })


@login_required
@require_POST
def set_typing(request, chat_id):
    """
    Set typing status for a user in a chat.
    """
    from django.db import connection
    
    # Verify user has access to this chat
    chat = get_object_or_404(Chat, id=chat_id, participants=request.user)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = {}
    
    is_typing = data.get('typing', True)
    
    # Store typing status (simplified - in production use Redis/cache)
    set_user_typing(chat_id, request.user.id, is_typing)
    
    # Close database connection to prevent locking
    connection.close()
    
    return JsonResponse({'success': True})


@login_required
@require_GET
def poll_online_status(request):
    """
    Poll for online status of user's contacts.
    """
    from django.db import connection
    
    # Update requesting user's online status
    update_user_online_status(request.user)
    
    # Get user's contacts
    contacts = list(Contact.objects.filter(user=request.user).select_related('contact'))
    
    online_statuses = {}
    for contact in contacts:
        online_statuses[contact.contact.id] = get_user_online_status(contact.contact)
    
    # Close database connection to prevent locking
    connection.close()
    
    return JsonResponse({
        'statuses': online_statuses,
        'timestamp': timezone.now().isoformat()
    })


@login_required
@require_POST  
def update_heartbeat(request):
    """
    Update user's online status (heartbeat).
    Called periodically to keep user marked as online.
    """
    from django.db import connection
    
    update_user_online_status(request.user)
    
    # Close database connection to prevent locking
    connection.close()
    
    return JsonResponse({
        'success': True,
        'timestamp': timezone.now().isoformat()
    })


def update_user_online_status(user):
    """
    Helper function to update user's online status and last activity.
    """
    from .models import UserOnlineStatus
    status, created = UserOnlineStatus.objects.get_or_create(user=user)
    status.is_online = True
    status.last_activity = timezone.now()
    status.save()


# Simple in-memory typing storage (for demo - use Redis in production)
_typing_users = {}

def set_user_typing(chat_id, user_id, is_typing):
    """Set user typing status."""
    key = f"chat_{chat_id}"
    if key not in _typing_users:
        _typing_users[key] = {}
    
    if is_typing:
        _typing_users[key][user_id] = timezone.now()
    elif user_id in _typing_users[key]:
        del _typing_users[key][user_id]


def get_typing_users(chat_id, exclude_user_id):
    """Get list of users currently typing in a chat."""
    key = f"chat_{chat_id}"
    if key not in _typing_users:
        return []
    
    # Clean up old typing entries (older than 5 seconds)
    now = timezone.now()
    cutoff = now - datetime.timedelta(seconds=5)
    
    typing_users = []
    users_to_remove = []
    
    for user_id, timestamp in _typing_users[key].items():
        if user_id != exclude_user_id:
            if timestamp >= cutoff:
                typing_users.append(user_id)
            else:
                users_to_remove.append(user_id)
    
    # Clean up old entries
    for user_id in users_to_remove:
        del _typing_users[key][user_id]
    
    return typing_users