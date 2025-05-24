from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json
from .models import DashboardLayout, QuickNote, CalendarEvent
from django.utils import timezone


def overview(request):
    # Add user roles to the context
    context = {
        'user_roles': {
            'job_order_requestor': request.user.job_order_user,
            'job_order_approver': request.user.job_order_approver,
            'manhours_staff': request.user.manhours_user,
            'monitoring_staff': request.user.monitoring_user,
            'dcf_requestor': request.user.dcf_requestor,
            'dcf_approver': request.user.dcf_approver
        }
    }
    return render(request, 'overview/overview.html', context)

@login_required
def get_dashboard_layout(request):
    """Get the user's saved dashboard layout"""
    layout, created = DashboardLayout.objects.get_or_create(user=request.user)
    return JsonResponse(layout.layout_data, safe=False)

@login_required
@require_http_methods(["POST"])
def save_dashboard_layout(request):
    """Save the user's dashboard layout"""
    try:
        data = json.loads(request.body)
        layout, created = DashboardLayout.objects.get_or_create(user=request.user)
        layout.layout_data = data
        layout.save()
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# Quick Notes Views
@login_required
def get_quick_notes(request, widget_id):
    """Get all quick notes for a specific widget"""
    notes = QuickNote.objects.filter(user=request.user, widget_id=widget_id)
    notes_data = [
        {
            "id": note.id,
            "content": note.content,
            "created_at": note.created_at.isoformat(),
            "updated_at": note.updated_at.isoformat()
        }
        for note in notes
    ]
    return JsonResponse({"notes": notes_data})

@login_required
@require_http_methods(["POST"])
def create_quick_note(request, widget_id):
    """Create a new quick note"""
    try:
        data = json.loads(request.body)
        content = data.get('content', '').strip()

        if not content:
            return JsonResponse({"status": "error", "message": "Note content cannot be empty"}, status=400)

        note = QuickNote.objects.create(
            user=request.user,
            content=content,
            widget_id=widget_id
        )

        return JsonResponse({
            "status": "success",
            "note": {
                "id": note.id,
                "content": note.content,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat()
            }
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@login_required
@require_http_methods(["DELETE"])
def delete_quick_note(request, note_id):
    """Delete a quick note"""
    try:
        note = get_object_or_404(QuickNote, id=note_id, user=request.user)
        note.delete()
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# Calendar Event Views
@login_required
def get_calendar_events(request, widget_id):
    """Get all calendar events for a specific widget"""
    events = CalendarEvent.objects.filter(user=request.user, widget_id=widget_id)
    events_data = [
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "start": event.start_date.isoformat(),
            "end": event.end_date.isoformat() if event.end_date else None,
            "allDay": event.all_day,
            "type": event.event_type,
            "priority": event.priority,
            "location": event.location,
            "attendees": event.attendees,
            "completed": event.completed
        }
        for event in events
    ]
    return JsonResponse({"events": events_data})

@login_required
@require_http_methods(["POST"])
def create_calendar_event(request, widget_id):
    """Create a new calendar event"""
    try:
        data = json.loads(request.body)

        # Validate required fields
        required_fields = ['title', 'start']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"status": "error", "message": f"Missing required field: {field}"}, status=400)

        # Parse dates
        start_date = timezone.datetime.fromisoformat(data['start'].replace('Z', '+00:00'))
        end_date = None
        if data.get('end'):
            end_date = timezone.datetime.fromisoformat(data['end'].replace('Z', '+00:00'))

        # Create event
        event = CalendarEvent.objects.create(
            user=request.user,
            widget_id=widget_id,
            title=data['title'],
            description=data.get('description', ''),
            start_date=start_date,
            end_date=end_date,
            all_day=data.get('allDay', False),
            event_type=data.get('type', 'task'),
            priority=data.get('priority', 'medium'),
            location=data.get('location', ''),
            attendees=data.get('attendees', []),
            completed=data.get('completed', False)
        )

        return JsonResponse({
            "status": "success",
            "event": {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "start": event.start_date.isoformat(),
                "end": event.end_date.isoformat() if event.end_date else None,
                "allDay": event.all_day,
                "type": event.event_type,
                "priority": event.priority,
                "location": event.location,
                "attendees": event.attendees,
                "completed": event.completed
            }
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@login_required
@require_http_methods(["PUT"])
def update_calendar_event(request, event_id):
    """Update an existing calendar event"""
    try:
        event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
        data = json.loads(request.body)

        # Update fields if provided
        if 'title' in data:
            event.title = data['title']
        if 'description' in data:
            event.description = data['description']
        if 'start' in data:
            event.start_date = timezone.datetime.fromisoformat(data['start'].replace('Z', '+00:00'))
        if 'end' in data:
            event.end_date = timezone.datetime.fromisoformat(data['end'].replace('Z', '+00:00')) if data['end'] else None
        if 'allDay' in data:
            event.all_day = data['allDay']
        if 'type' in data:
            event.event_type = data['type']
        if 'priority' in data:
            event.priority = data['priority']
        if 'location' in data:
            event.location = data['location']
        if 'attendees' in data:
            event.attendees = data['attendees']
        if 'completed' in data:
            event.completed = data['completed']

        event.save()

        return JsonResponse({
            "status": "success",
            "event": {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "start": event.start_date.isoformat(),
                "end": event.end_date.isoformat() if event.end_date else None,
                "allDay": event.all_day,
                "type": event.event_type,
                "priority": event.priority,
                "location": event.location,
                "attendees": event.attendees,
                "completed": event.completed
            }
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@login_required
@require_http_methods(["DELETE"])
def delete_calendar_event(request, event_id):
    """Delete a calendar event"""
    try:
        event = get_object_or_404(CalendarEvent, id=event_id, user=request.user)
        event.delete()
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)