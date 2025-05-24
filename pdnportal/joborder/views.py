from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from datetime import timedelta, date
from django.http import JsonResponse
from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import JORequestSerializer, JORoutingSerializer, JORequestApproverSerializer, JORequestAdminSerializer
from django.db.models.functions import TruncMonth
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from .models import GreenControlNumber, YellowControlNumber, WhiteControlNumber, OrangeControlNumber, JOLogsheet, JORouting
from portalusers.models import UserApprovers, Users
from notification.models import Notification
import calendar
import datetime
import openpyxl
import json
import io
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from django.http import HttpResponse, JsonResponse
from datetime import datetime
from django.db.models import Count, Q
from django.views.decorators.http import require_GET, require_POST
from django.db.models.functions import ExtractMonth, ExtractYear
from django.core.paginator import Paginator
from settings.models import Line

# REQUESTORS VIEW
@login_required(login_url="user-login")
def requestor_page(request):
    current_month = now().month
    current_year = now().year

    pendingJO = JOLogsheet.objects.filter(Q(status="Routing") | Q(status="Completed") | Q(status="Checked"), prepared_by=request.user).order_by("-date_created")
    joRequests = JOLogsheet.objects.filter(prepared_by=request.user).order_by("-date_created")

    joRequestsCount = JOLogsheet.objects.filter(prepared_by=request.user, date_created__year=current_year, date_created__month=current_month).count()
    pendingJOCount = JOLogsheet.objects.filter(status = "Routing", prepared_by=request.user, date_created__year=current_year, date_created__month=current_month).count()
    approvedJOCount = JOLogsheet.objects.filter(status = "Closed", prepared_by=request.user, date_created__year=current_year, date_created__month=current_month).count()
    lines = Line.objects.all()

    context={
        'pendingJO':pendingJO,
        'all_requests':joRequests,
        'joRequestsCount':joRequestsCount,
        'pendingJOCount':pendingJOCount,
        'approvedJOCount':approvedJOCount,
        'lines': lines,
    }
    return render(request, 'joborder/jo-requestor.html', context)

@login_required
@require_GET
def job_order_chart_data(request, period):
    today = timezone.now().date()

    if period == '3month':
        months_back = 3
    elif period == '1year':
        months_back = 12
    else:
        months_back = 6

    start_date = today.replace(day=1)
    for _ in range(months_back - 1):
        prev_month = start_date.month - 1
        year = start_date.year
        if prev_month == 0:
            prev_month = 12
            year -= 1
        start_date = start_date.replace(year=year, month=prev_month, day=1)

    months = []
    month_year_map = {}

    current = start_date
    index = 0
    while current <= today.replace(day=28):
        month_name = calendar.month_name[current.month][:3]
        year = current.year
        month_year = f"{month_name} {year}"

        months.append(month_year)
        month_year_map[f"{current.year}-{current.month:02d}"] = index

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

        index += 1

    green_data = [0] * len(months)
    yellow_data = [0] * len(months)
    white_data = [0] * len(months)
    orange_data = [0] * len(months)

    job_orders = JOLogsheet.objects.filter(
        prepared_by=request.user,
        date_created__gte=timezone.make_aware(timezone.datetime.combine(start_date, timezone.datetime.min.time())),
        date_created__lte=timezone.now()
    )

    for order in job_orders:
        date = order.date_created.date()
        month_year_key = f"{date.year}-{date.month:02d}"

        if month_year_key in month_year_map:
            idx = month_year_map[month_year_key]
            category = order.jo_color.lower() if order.jo_color else "unknown"

            if category == 'green':
                green_data[idx] += 1
            elif category == 'yellow':
                yellow_data[idx] += 1
            elif category == 'white':
                white_data[idx] += 1
            elif category == 'orange':
                orange_data[idx] += 1

    return JsonResponse({
        'labels': months,
        'green': green_data,
        'yellow': yellow_data,
        'white': white_data,
        'orange': orange_data
    })

@login_required(login_url="user-login")
def create_jo_request(request):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == 'POST':
        try:
            category = request.POST.get("jo-category")
            tooling = request.POST.get("tooling")
            nature = request.POST.get("nature")            
            details = request.POST.get("details")
            line_id = request.POST.get("line")
            complaint = request.POST.get("complaint")
            requestor = request.POST.get("requestor")

            # Get the Line instance using the ID
            line = Line.objects.filter(id=line_id).first()

            if not all([category, tooling, nature, details, line, requestor]):
                missing = []
                if not category: missing.append('category')
                if not tooling: missing.append('tooling')
                if not nature: missing.append('nature')
                if not details: missing.append('details')
                if not line_id or not line: missing.append('line')
                if not requestor: missing.append('requestor')

                error_message = f"Missing required fields: {', '.join(missing)}"

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': error_message})

                messages.error(request, error_message)
                return redirect("requestor-homepage")

            if (category == "orange" and
                nature in ["countermeasure-cri", "countermeasure-ecc", "safety"] and
                not complaint):
                error_message = "Please specify your complaint for orange category requests."

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': error_message})

                messages.error(request, error_message)
                return redirect("requestor-homepage")

            changes_request = f"{nature}: {complaint}" if complaint else nature

            try:
                jo_approver = UserApprovers.objects.get(user=request.user, module="Job Order", approver_role="Approver")

                if not jo_approver.approver:
                    error_message = "Invalid approver configuration. Please contact administrator."

                    if is_ajax:
                        return JsonResponse({'status': 'error', 'message': error_message})

                    messages.error(request, error_message)
                    return redirect("requestor-homepage")

            except UserApprovers.DoesNotExist:
                error_message = "No approver assigned for JO Request. Please contact administrator."

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': error_message})

                messages.error(request, error_message)
                return redirect("requestor-homepage")
            except Exception as e:
                error_message = f"Error finding approver: {str(e)}"

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': error_message})

                messages.error(request, "Failed to find approver. Please contact administrator.")
                return redirect("requestor-homepage")

            control_number = None
            try:
                if category == "green":
                    instance = GreenControlNumber.objects.create(prepared_by=request.user)
                    control_number = f'G-{instance.id:04}'
                elif category == "yellow":
                    instance = YellowControlNumber.objects.create(prepared_by=request.user)
                    control_number = f'Y-{instance.id:04}'
                elif category == "white":
                    instance = WhiteControlNumber.objects.create(prepared_by=request.user)
                    control_number = f'W-{instance.id:04}'
                elif category == "orange":
                    instance = OrangeControlNumber.objects.create(prepared_by=request.user)
                    control_number = f'O-{instance.id:04}'
                else:
                    error_message = "Invalid category selected."

                    if is_ajax:
                        return JsonResponse({'status': 'error', 'message': error_message})

                    messages.error(request, error_message)
                    return redirect("requestor-homepage")
            except Exception as e:
                error_message = f"Failed to generate control number: {str(e)}"

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': "Failed to generate control number"})

                messages.error(request, "Failed to generate control number")
                return redirect("requestor-homepage")

            try:
                new_request = JOLogsheet.objects.create(
                    jo_number=control_number,                    prepared_by=request.user,
                    requestor=requestor,
                    line=line,  # Now passing the Line instance rather than the ID
                    jo_type=changes_request,
                    jo_tools=tooling,
                    jo_color=category.capitalize(),
                    details=details,
                )
            except Exception as e:
                error_message = f"JOLogsheet creation failed: {str(e)}"

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': "Failed to create job order"})

                messages.error(request, "Failed to create job order")
                return redirect("requestor-homepage")

            try:
                JORouting.objects.create(
                    jo_number=new_request,
                    jo_request=request.user,
                    approver=request.user,
                    approver_sequence=0,
                    status="Submitted"
                )

                JORouting.objects.create(
                    jo_number=new_request,
                    jo_request=request.user,
                    approver=jo_approver.approver,
                    first_approver=True,
                    approver_sequence=1,
                    status="Processing"
                )
            except Exception as e:
                error_message = f"Routing creation failed: {str(e)}"

                if is_ajax:
                    return JsonResponse({'status': 'error', 'message': "Failed to create approval routing"})

                messages.error(request, "Failed to create approval routing")
                return redirect("requestor-homepage")

            try:
                Notification.objects.create(
                    sender=request.user,
                    recipient=jo_approver.approver,
                    title="Approval",
                    message=f'You have a JO request from {request.user.name} awaiting your approval.'
                )
            except Exception as e:
                pass

            success_message = f"JO request {control_number} submitted successfully!"

            if is_ajax:
                return JsonResponse({
                    'status': 'success',
                    'message': success_message,
                    'control_number': control_number
                })

            messages.success(request, success_message)
            return redirect("requestor-homepage")

        except Exception as e:
            error_message = f"Unexpected error in create_jo_request: {str(e)}"

            if is_ajax:
                return JsonResponse({'status': 'error', 'message': "An unexpected error occurred. Please contact support."})

            messages.error(request, "An unexpected error occurred. Please contact support.")
            return redirect("requestor-homepage")
    return redirect("requestor-homepage")

@login_required(login_url="user-login")
def get_job_order_details(request, jo_id):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    try:
        print(f"Looking for job order with ID: {jo_id}")

        job_order = JOLogsheet.objects.get(id=jo_id)
        print(f"Found job order: {job_order.jo_number}")

        routing_entries = JORouting.objects.filter(jo_number=job_order)
        print(f"Found {routing_entries.count()} routing entries")

        routing_data = []
        for entry in routing_entries:
            routing_data.append({
                'approver_name': entry.approver.name if hasattr(entry.approver, 'name') else str(entry.approver),
                'status': entry.status,
                'date': entry.request_at.strftime('%b %d, %Y, %I:%M %p') if entry.request_at else None,
                'approved_at': entry.approved_at.strftime('%b %d, %Y, %I:%M %p') if entry.approved_at else None,
                'first_approver': entry.first_approver,
                'approver_sequence': entry.approver_sequence,
                'remarks': entry.remarks if hasattr(entry, 'remarks') else ""
            })

        data = {
            'status': 'success',
            'id': job_order.id,
            'jo_number': job_order.jo_number,
            'category': job_order.jo_color,
            'line': job_order.line.line_name if job_order.line else None,
            'jo_status': job_order.status,
            'submitted_date': job_order.date_created.strftime('%b %d, %Y') if job_order.date_created else None,
            'tool': job_order.jo_tools,
            'nature': job_order.jo_type,
            'prepared_by': job_order.prepared_by.name if job_order.prepared_by else None,
            'requestor': job_order.requestor,
            'details': job_order.details,
            'in_charge': job_order.in_charge.name if job_order.in_charge else None,
            'date_received': job_order.date_received.strftime('%b %d, %Y') if job_order.date_received else None,
            'target_date': job_order.target_date.strftime('%b %d, %Y') if job_order.target_date else None,
            'date_complete': job_order.date_complete.strftime('%b %d, %Y') if job_order.date_complete else None,
            'action_taken': job_order.action_taken if job_order.action_taken else None,
            'target_date_reason': job_order.target_date_reason if job_order.target_date_reason else None,
            'is_creator': request.user == job_order.prepared_by,
            'routing': routing_data
        }


        return JsonResponse(data)

    except JOLogsheet.DoesNotExist:
        print(f"Job order with ID {jo_id} not found")
        return JsonResponse({'status': 'error', 'message': f'Job order with ID {jo_id} not found'})

    except Exception as e:
        print(f"Error retrieving job order details: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': f"Error retrieving job order details: {str(e)}"})

@login_required(login_url="user-login")
def cancel_jo_request(request, jo_id):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method != 'POST':
        if is_ajax:
            return JsonResponse({'status': 'error', 'message': 'Invalid request method'})
        messages.error(request, "Invalid request method")
        return redirect("requestor-homepage")

    try:

        job_order = JOLogsheet.objects.get(id=jo_id)
        last_routing = JORouting.objects.filter(jo_number=job_order)
        last_routing.delete()

        if job_order.prepared_by != request.user:
            if is_ajax:
                return JsonResponse({'status': 'error', 'message': 'You can only cancel your own job order requests'})
            messages.error(request, "You can only cancel your own job order requests")
            return redirect("requestor-homepage")

        if job_order.status != 'Routing':
            if is_ajax:
                return JsonResponse({'status': 'error', 'message': 'This job order cannot be cancelled in its current state'})
            messages.error(request, "This job order cannot be cancelled in its current state")
            return redirect("requestor-homepage")

        job_order.status = 'Cancelled'
        job_order.save()


        JORouting.objects.filter(jo_number=job_order, status='Pending').update(status='Cancelled')

        if is_ajax:
            return JsonResponse({
                'status': 'success',
                'message': f'Job order {job_order.jo_number} has been cancelled'
            })

        messages.success(request, f'Job order {job_order.jo_number} has been cancelled')
        return redirect("requestor-homepage")

    except JOLogsheet.DoesNotExist:
        if is_ajax:
            return JsonResponse({'status': 'error', 'message': 'Job order not found'})
        messages.error(request, "Job order not found")
        return redirect("requestor-homepage")

    except Exception as e:
        if is_ajax:
            return JsonResponse({'status': 'error', 'message': f'An error occurred: {str(e)}'})
        messages.error(request, f"An error occurred: {str(e)}")
        return redirect("requestor-homepage")

@login_required(login_url="user-login")
def close_transaction(request, jo_id):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method != 'POST':
        if is_ajax:
            return JsonResponse({'status': 'error', 'message': 'Invalid request method'})
        messages.error(request, "Invalid request method")
        return redirect("requestor-homepage")

    try:
        job_order = get_object_or_404(JOLogsheet, id=jo_id)

        if job_order.prepared_by != request.user:
            if is_ajax:
                return JsonResponse({'status': 'error', 'message': 'You can only close your own job order transactions'})
            messages.error(request, "You can only close your own job order transactions")
            return redirect("requestor-homepage")

        if job_order.status != 'Checked':
            if is_ajax:
                return JsonResponse({'status': 'error', 'message': 'This job order cannot be closed in its current state'})
            messages.error(request, "This job order cannot be closed in its current state")
            return redirect("requestor-homepage")

        try:
            routing_entry = JORouting.objects.filter(
                jo_number=job_order,
                approver=request.user,
                approver_sequence=8,
            ).first()

            routing_entry.status = "Approved"

            if request.POST.get('remarks'):
                routing_entry.remarks = request.POST.get('remarks')

            routing_entry.approved_at = timezone.now()
            routing_entry.save()

            job_order.status = "Closed"
            job_order.save()

            if is_ajax:
                return JsonResponse({
                    'status': 'success',
                    'message': f'Job order {job_order.jo_number} has been closed successfully'
                })

            messages.success(request, f'Job order {job_order.jo_number} has been closed successfully')
            return redirect("requestor-homepage")

        except JORouting.DoesNotExist:
            if is_ajax:
                return JsonResponse({'status': 'error', 'message': 'Routing entry does not exist'})
            messages.error(request, "Routing entry does not exist")
            return redirect("requestor-homepage")

    except Exception as e:
        if is_ajax:
            return JsonResponse({'status': 'error', 'message': f'An error occurred: {str(e)}'})
        messages.error(request, f"An error occurred: {str(e)}")
        return redirect("requestor-homepage")

# APPROVER'S VIEW
@login_required(login_url="user-login")
def supervisor_view(request):
    current_month = now().month
    current_year = now().year

    search_query = request.GET.get('search', '')
    filter_value = request.GET.get('filter', 'all')

    pending_approvals = JORouting.objects.filter(status="Processing", approver=request.user).order_by("-request_at")
    approval_history = JORouting.objects.filter(approver=request.user).order_by("-request_at")

    if search_query:
        pending_approvals = pending_approvals.filter(
            Q(jo_number__jo_number__icontains=search_query) |
            Q(jo_request__first_name__icontains=search_query) |
            Q(jo_request__last_name__icontains=search_query) |
            Q(jo_number__jo_tools__icontains=search_query) |
            Q(jo_number__jo_type__icontains=search_query)
        )

        approval_history = approval_history.filter(
            Q(jo_number__jo_number__icontains=search_query) |
            Q(jo_request__first_name__icontains=search_query) |
            Q(jo_request__last_name__icontains=search_query) |
            Q(jo_number__jo_tools__icontains=search_query) |
            Q(jo_number__jo_type__icontains=search_query)
        )

    # Apply category filter if provided
    if filter_value and filter_value != 'all':
        pending_approvals = pending_approvals.filter(jo_number__jo_color__iexact=filter_value)
        approval_history = approval_history.filter(jo_number__jo_color__iexact=filter_value)

    # Get statistics
    joRequestsCount = JORouting.objects.filter(approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    pendingJOCount = JORouting.objects.filter(status="Processing", approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    approvedJOCount = JORouting.objects.filter(status="Approved", approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    rejectedJOCount = JORouting.objects.filter(status="Rejected", approver=request.user, request_at__year=current_year, request_at__month=current_month).count()

    context = {
        'pending_approvals': pending_approvals,
        'three_days_ago': datetime.now() - timedelta(days=1),
        'approval_history': approval_history,
        'joRequestsCount': joRequestsCount,
        'pendingJOCount': pendingJOCount,
        'approvedJOCount': approvedJOCount,
        'rejectedJOCount': rejectedJOCount,
        'search_query': search_query,
        'filter_value': filter_value,
    }
    return render(request, 'joborder/jo-approver.html', context)

@login_required(login_url="user-login")
@require_GET
def approver_job_order_chart_data(request, period):
    today = timezone.now().date()
    current_user = request.user

    if period == '3month':
        months_back = 3
    elif period == '1year':
        months_back = 12
    else:
        months_back = 6

    start_date = today.replace(day=1)
    for _ in range(months_back - 1):
        prev_month = start_date.month - 1
        year = start_date.year
        if prev_month == 0:
            prev_month = 12
            year -= 1
        start_date = start_date.replace(year=year, month=prev_month, day=1)

    months = []
    month_year_map = {}

    current = start_date
    index = 0
    while current <= today.replace(day=28):
        month_name = calendar.month_name[current.month][:3]
        year = current.year
        month_year = f"{month_name} {year}"

        months.append(month_year)
        month_year_map[f"{current.year}-{current.month:02d}"] = index

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

        index += 1

    green_data = [0] * len(months)
    yellow_data = [0] * len(months)
    white_data = [0] * len(months)
    orange_data = [0] * len(months)

    routing_entries = JORouting.objects.filter(
        approver=current_user,
        request_at__gte=timezone.make_aware(timezone.datetime.combine(start_date, timezone.datetime.min.time())),
        request_at__lte=timezone.now()
    ).select_related('jo_number')

    for entry in routing_entries:
        if entry.jo_number:
            date = entry.request_at.date()
            month_year_key = f"{date.year}-{date.month:02d}"

            if month_year_key in month_year_map:
                idx = month_year_map[month_year_key]
                category = entry.jo_number.jo_color.lower() if entry.jo_number.jo_color else "unknown"

                if category == 'green':
                    green_data[idx] += 1
                elif category == 'yellow':
                    yellow_data[idx] += 1
                elif category == 'white':
                    white_data[idx] += 1
                elif category == 'orange':
                    orange_data[idx] += 1

    return JsonResponse({
        'labels': months,
        'green': green_data,
        'yellow': yellow_data,
        'white': white_data,
        'orange': orange_data
    })

@login_required(login_url="user-login")
def approve_job_order(request):
    if request.method != 'POST':
        messages.error(request, "Invalid request method.")
        return redirect('approval')

    jo_id = request.POST.get('jo_id')
    remarks = request.POST.get('remarks', '')

    if not jo_id:
        messages.error(request, "No job order specified.")
        return redirect('approval')

    try:
        jo = JOLogsheet.objects.get(id=jo_id)

        routing = JORouting.objects.get(
            jo_number=jo,
            approver=request.user,
            status='Processing'
        )

        if routing.approver_sequence == 4:
            next_approver_user = Users.objects.filter(job_order_facilitator=True).first()
        else:
            next_approver = UserApprovers.objects.filter(user=request.user, module="Job Order").first()
            next_approver_user = next_approver.approver if next_approver else None

        if next_approver_user:
            routing.status = 'Approved'
            routing.remarks = remarks
            routing.approved_at = timezone.now()
            routing.save()

            JORouting.objects.create(
                jo_number=jo,
                jo_request=jo.prepared_by,
                approver=next_approver_user,
                approver_sequence=routing.approver_sequence + 1,
                status='Processing'
            )

            messages.success(request, f"Job Order {jo.jo_number} has been approved successfully.")
        else:
            messages.error(request, "No next approver found. Cannot proceed with routing.")

    except JOLogsheet.DoesNotExist:
        messages.error(request, "Job order not found.")
    except JORouting.DoesNotExist:
        messages.error(request, "You are not authorized to approve this job order or it has already been processed.")
    except Exception as e:
        messages.error(request, f"Error approving job order: {str(e)}")

    return redirect('approval')

@login_required(login_url="user-login")
def reject_job_order(request):
    if request.method != 'POST':
        messages.error(request, "Invalid request method.")
        return redirect('approval')

    jo_id = request.POST.get('jo_id')
    remarks = request.POST.get('remarks', '')

    if not jo_id:
        messages.error(request, "No job order specified.")
        return redirect('approval')

    if not remarks:
        messages.error(request, "Rejection reason is required.")
        return redirect('approval')

    try:
        jo = JOLogsheet.objects.get(id=jo_id)
        routing = JORouting.objects.get(
            jo_number=jo,
            approver=request.user,
            status='Processing'
        )

        routing.status = 'Rejected'
        routing.remarks = remarks
        routing.approved_at = timezone.now()
        routing.save()

        jo.status = 'Rejected'
        jo.save()

        try:
            Notification.objects.create(
                sender=request.user,
                recipient=jo.prepared_by,
                title="Approval",
                message=f'Your job order request with JO number {jo.jo_number} has been declined by {request.user.name}. Please review the remarks for more details.'
            )
        except Exception as e:
            pass

        messages.warning(request, f"Job Order {jo.jo_number} has been rejected.")

    except JOLogsheet.DoesNotExist:
        messages.error(request, "Job order not found.")
    except JORouting.DoesNotExist:
        messages.error(request, "You are not authorized to reject this job order or it has already been processed.")
    except Exception as e:
        messages.error(request, f"Error rejecting job order: {str(e)}")

    return redirect('approval')

@login_required(login_url="user-login")
def approve_checking(request):
    if request.method != 'POST':
        messages.error(request, "Invalid request method.")
        return redirect('approval')

    jo_id = request.POST.get('jo_id')
    remarks = request.POST.get('remarks', '')

    if not jo_id:
        messages.error(request, "No job order specified.")
        return redirect('approval')

    try:
        jo = JOLogsheet.objects.get(id=jo_id)

        routing = JORouting.objects.get(
            jo_number=jo,
            approver=request.user,
            status='Processing'
        )

        routing.status = 'Approved'
        routing.remarks = remarks
        routing.approved_at = timezone.now()
        routing.save()

        jo.status = 'Checked'
        jo.save()

        JORouting.objects.create(
            jo_number=jo,
            jo_request=jo.prepared_by,
            approver=jo.prepared_by,
            approver_sequence=routing.approver_sequence + 1,
            status='Processing'
        )

        messages.success(request, f"Job Order {jo.jo_number} has been checked and returned to the preparer.")

    except JOLogsheet.DoesNotExist:
        messages.error(request, "Job order not found.")
    except JORouting.DoesNotExist:
        messages.error(request, "You are not authorized to approve this job order or it has already been processed.")
    except Exception as e:
        messages.error(request, f"Error approving job order: {str(e)}")

    return redirect('approval')

@login_required(login_url="user-login")
def reject_checking(request):
    if request.method != 'POST':
        messages.error(request, "Invalid request method.")
        return redirect('approval')

    jo_id = request.POST.get('jo_id')
    remarks = request.POST.get('remarks', '')

    if not jo_id:
        messages.error(request, "No job order specified.")
        return redirect('approval')

    if not remarks:
        messages.error(request, "Rejection reason is required.")
        return redirect('approval')

    try:
        jo = JOLogsheet.objects.get(id=jo_id)
        routing = JORouting.objects.get(
            jo_number=jo,
            approver=request.user,
            approver_sequence=7,
            status='Processing'
        )

        last_routing = JORouting.objects.filter(
            jo_number=jo,
            approver_sequence=6,
            status='Approved'
        ).first()

        routing.status = 'Rejected'
        routing.remarks = remarks
        routing.approved_at = timezone.now()
        routing.save()

        last_routing.status = 'Processing'
        last_routing.approved_at = None
        last_routing.save()

        jo.status = 'Routing'
        jo.date_complete= None
        jo.save()

        try:
            Notification.objects.create(
                sender=request.user,
                recipient=last_routing.approver,
                title="Approval",
                message = f'JO number {jo.jo_number} was rejected by {request.user.name} upon checking. Kindly review the remarks for further information.'
            )
        except Exception as e:
            pass

        messages.warning(request, f"Job Order {jo.jo_number} has been rejected.")

    except JOLogsheet.DoesNotExist:
        messages.error(request, "Job order not found.")
    except JORouting.DoesNotExist:
        messages.error(request, "You are not authorized to reject this job order or it has already been processed.")
    except Exception as e:
        messages.error(request, f"Error rejecting job order: {str(e)}")

    return redirect('approval')

# FACILITATOR VIEW
@login_required(login_url="user-login")
def job_order_facilitator(request):
    current_month = now().month
    current_year = now().year
    today = timezone.now().date()
    maintenance_personnel = Users.objects.filter(job_order_maintenance=True)

    joRequestsCount = JOLogsheet.objects.filter(date_created__year=current_year, date_created__month=current_month).count()
    overdueCount = JORouting.objects.filter(status = "Processing", approver__in=maintenance_personnel, request_at__year=current_year, request_at__month=current_month).filter(jo_number__target_date__lt=today).count()
    assignJOCount = JOLogsheet.objects.filter(in_charge__isnull=True, date_created__year=current_year, date_created__month=current_month).count()
    pendingJOCount = JORouting.objects.filter(jo_number__in_charge__isnull=True, jo_number__date_created__year=current_year, jo_number__date_created__month=current_month, approver=request.user).count()

    pending_assignments_list = JORouting.objects.filter(jo_number__in_charge__isnull=True, approver_sequence=5, approver=request.user).order_by('-request_at')[:10]
    for jo in pending_assignments_list:
        if jo.jo_number and jo.jo_number.date_created:
            jo.is_overdue_warning = (timezone.now() - jo.jo_number.date_created) >= timedelta(days=1)
            jo.is_overdue_critical = (timezone.now() - jo.jo_number.date_created) >= timedelta(days=2)
        else:
            jo.is_overdue_warning = False
            jo.is_overdue_critical = False

    recent_job_orders = JOLogsheet.objects.all().order_by("-date_created")[:15]



    context = {
        'joRequestsCount': joRequestsCount,
        'overdueCount': overdueCount,
        'assignJOCount': assignJOCount,
        'pendingJOCount': pendingJOCount,
        'pending_assignments_list': pending_assignments_list,
        'recent_job_orders': recent_job_orders,
        'maintenance_personnel': maintenance_personnel,

    }

    return render(request, 'joborder/jo-facilitator.html', context)

@login_required(login_url="user-login")
def job_order_analytics(request):
    try:
        period = request.GET.get('period', '6month')
        today = timezone.now()
        default_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
        default_data = [0, 0, 0, 0, 0, 0]

        if period == '1month':
            months = 1
        elif period == '3month':
            months = 3
        else:
            months = 6

        # Calculate the first day of the current month
        first_of_this_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Calculate the first month to include
        start_month = first_of_this_month
        for _ in range(months - 1):
            prev_month = start_month.month - 1 or 12
            prev_year = start_month.year if start_month.month > 1 else start_month.year - 1
            start_month = start_month.replace(year=prev_year, month=prev_month, day=1)

        # Now, for each month, calculate the start and end
        labels = []
        total_by_month = []
        completed_by_month = []
        for i in range(months):
            # Move forward i months from start_month
            month = (start_month.month - 1 + i) % 12 + 1
            year = start_month.year + ((start_month.month - 1 + i) // 12)
            month_start = start_month.replace(year=year, month=month, day=1)
            # Calculate the first day of the next month
            if month == 12:
                next_month = month_start.replace(year=year+1, month=1, day=1)
            else:
                next_month = month_start.replace(month=month+1, day=1)
            month_end = next_month
            month_label = month_start.strftime('%b')
            try:
                total_count = JOLogsheet.objects.filter(
                    date_created__gte=month_start,
                    date_created__lt=month_end
                ).count()
            except Exception as db_error:
                print(f"Database error when fetching total count: {str(db_error)}")
                total_count = 0
            try:
                completed_count = JOLogsheet.objects.filter(
                    date_created__gte=month_start,
                    date_created__lt=month_end,
                    date_complete__isnull=False
                ).count()
            except Exception as db_error:
                print(f"Database error when fetching completed count: {str(db_error)}")
                completed_count = 0
            labels.append(month_label)
            total_by_month.append(total_count)
            completed_by_month.append(completed_count)

        if not labels or len(labels) < months:
            if months == 1:
                labels = [default_labels[0]]
                total_by_month = [default_data[0]]
                completed_by_month = [default_data[0]]
            elif months == 3:
                labels = default_labels[:3]
                total_by_month = default_data[:3]
                completed_by_month = default_data[:3]
            else:
                labels = default_labels
                total_by_month = default_data
                completed_by_month = default_data

        data = {
            'status': 'success',
            'period': period,
            'labels': labels,
            'total_by_month': total_by_month,
            'completed_by_month': completed_by_month
        }
        return JsonResponse(data)
    except Exception as e:
        import traceback
        print(f"Error in job_order_analytics: {str(e)}")
        traceback.print_exc()
        return JsonResponse({
            'status': 'success',
            'period': request.GET.get('period', '6month'),
            'labels': default_labels[:months] if 'months' in locals() else default_labels,
            'total_by_month': default_data[:months] if 'months' in locals() else default_data,
            'completed_by_month': default_data[:months] if 'months' in locals() else default_data,
            'error_logged': True
        })

@login_required(login_url="user-login")
def maintenance_workload(request):
    try:
        # Get all maintenance staff
        maintenance_staff = Users.objects.filter(job_order_maintenance=True)

        workload_data = []
        for staff in maintenance_staff:
            try:
                # Count active tasks for this staff member
                active_tasks = JOLogsheet.objects.filter(
                    in_charge=staff,
                    status__in=['Routing', 'Completed']
                ).count()

                # Calculate workload percentage with safety checks
                max_capacity = 10  # Default capacity

                # Prevent division by zero
                if max_capacity > 0:
                    workload_percentage = min(int((active_tasks / max_capacity) * 100), 100)
                else:
                    workload_percentage = 0

                # Add staff member's data to the result
                workload_data.append({
                    'name': f"{staff.name}" if hasattr(staff, 'name') and staff.name else f"Staff #{staff.id}",
                    'active_tasks': active_tasks,
                    'workload_percentage': workload_percentage
                })

            except Exception as staff_error:
                # Log error for this staff member but continue processing others
                import traceback
                print(f"Error processing workload for staff {staff.id}: {str(staff_error)}")
                traceback.print_exc()

                # Add a placeholder entry for this staff member
                workload_data.append({
                    'name': f"Staff #{staff.id}" if hasattr(staff, 'id') else "Unknown Staff",
                    'active_tasks': 0,
                    'workload_percentage': 0,
                    'error': True
                })

        # Return successful response
        return JsonResponse({
            'status': 'success',
            'workload_data': workload_data
        })

    except Exception as e:
        # Log the error
        import traceback
        print(f"Error in maintenance_workload: {str(e)}")
        traceback.print_exc()

        # Return error response with empty data
        return JsonResponse({
            'status': 'success',  # Still return success to prevent UI breaking
            'workload_data': [],
            'error_logged': True
        })

@login_required(login_url="user-login")
@require_POST
def assign_person_in_charge(request):
    try:
        jo_id = request.POST.get('jo_id')
        assignee_id = request.POST.get('assignee_id')

        if not jo_id or not assignee_id:
            messages.error(request, 'Missing required information for assignment.')
            return redirect('facilitator')

        job_order = JOLogsheet.objects.get(id=jo_id)
        assignee = Users.objects.get(id=assignee_id)

        job_order.in_charge = assignee
        job_order.date_received=timezone.now()
        job_order.save()

        routing_entry = JORouting.objects.filter(jo_number=job_order, approver_sequence=5, approver=request.user).first()
        routing_entry.status='Approved'
        routing_entry.approved_at=timezone.now()
        routing_entry.save()

        new_routing = JORouting.objects.create(
            jo_number=job_order,
            jo_request=job_order.prepared_by,
            approver=assignee,
            approver_sequence=6,
            status='Processing'
        )

        messages.success(request, f'Job Order {job_order.jo_number} successfully assigned to {assignee.first_name} {assignee.last_name}.')
        return redirect('facilitator')

    except JOLogsheet.DoesNotExist:
        messages.error(request, f'Job Order with ID {jo_id} not found.')

    except Users.DoesNotExist:
        messages.error(request, f'User with ID {assignee_id} not found.')

    except Exception as e:
        messages.error(request, f'An error occurred: {str(e)}')
    return redirect('facilitator')

@login_required(login_url="user-login")
def export_job_orders(request):
    print("Export job orders function called")
    if request.method != 'POST':
        print("Method not allowed, expected POST")
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        date_from = request.POST.get('date_from')
        date_to = request.POST.get('date_to')
        status_filters = request.POST.getlist('status')
        category_filters = request.POST.getlist('category')

        if 'all' in status_filters:
            status_filters = [status[0] for status in JOLogsheet.STATUS_CHOICES]

        if 'all' in category_filters:
            category_filters = list(JOLogsheet.objects.values_list('jo_color', flat=True).distinct())

        if date_from:
            try:
                start_date = datetime.strptime(date_from, '%Y-%m-%d')
                start_date = timezone.make_aware(start_date.replace(hour=0, minute=0, second=0))
            except ValueError:
                return JsonResponse({'error': 'Invalid start date format'}, status=400)
        else:
            start_date = timezone.now().replace(hour=0, minute=0, second=0) - timezone.timedelta(days=30)

        if date_to:
            try:
                end_date = datetime.strptime(date_to, '%Y-%m-%d')
                end_date = timezone.make_aware(end_date.replace(hour=23, minute=59, second=59))
            except ValueError:
                return JsonResponse({'error': 'Invalid end date format'}, status=400)
        else:
            end_date = timezone.now().replace(hour=23, minute=59, second=59)

        query_filters = {
            'date_created__gte': start_date,
            'date_created__lte': end_date
        }

        if status_filters and 'all' not in request.POST.getlist('status'):
            query_filters['status__in'] = status_filters

        if category_filters and 'all' not in request.POST.getlist('category'):
            query_filters['jo_color__in'] = category_filters

        job_orders = JOLogsheet.objects.filter(**query_filters).order_by('-date_created')

        workbook = openpyxl.Workbook()
        worksheet = workbook.active
        worksheet.title = 'Job Orders'

        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="3366FF", end_color="3366FF", fill_type="solid")
        header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        cell_alignment = Alignment(vertical='top', wrap_text=True)

        status_styles = {
            'Routing': {
                'fill': PatternFill(start_color="FFF8E1", end_color="FFF8E1", fill_type="solid"),
                'font': Font(color="FFC107")
            },
            'Completed': {
                'fill': PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid"),
                'font': Font(color="4CAF50")
            },
            'Checked': {
                'fill': PatternFill(start_color="E3F2FD", end_color="E3F2FD", fill_type="solid"),
                'font': Font(color="2196F3")
            },
            'Cancelled': {
                'fill': PatternFill(start_color="FBE9E7", end_color="FBE9E7", fill_type="solid"),
                'font': Font(color="FF5722")
            },
            'Closed': {
                'fill': PatternFill(start_color="E0F2F1", end_color="E0F2F1", fill_type="solid"),
                'font': Font(color="009688")
            },
            'Rejected': {
                'fill': PatternFill(start_color="FFEBEE", end_color="FFEBEE", fill_type="solid"),
                'font': Font(color="F44336")
            }
        }

        category_styles = {
            'green': {
                'fill': PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid"),
                'font': Font(color="4CAF50")
            },
            'yellow': {
                'fill': PatternFill(start_color="FFF8E1", end_color="FFF8E1", fill_type="solid"),
                'font': Font(color="FFC107")
            },
            'white': {
                'fill': PatternFill(start_color="ECEFF1", end_color="ECEFF1", fill_type="solid"),
                'font': Font(color="607D8B")
            },
            'orange': {
                'fill': PatternFill(start_color="FBE9E7", end_color="FBE9E7", fill_type="solid"),
                'font': Font(color="FF5722")
            }
        }

        column_widths = {
            'A': 15,  # Date Submitted
            'B': 15,  # JO Number
            'C': 20,  # Requested By
            'D': 12,  # Category
            'E': 15,  # Tool
            'F': 15,  # Nature of Changes
            'G': 30,  # Details
            'H': 12,  # Status
            'I': 20,  # Person In Charge
            'J': 15,  # Date Received
            'K': 15,  # Expected Date
            'L': 15,  # Date Completed
            'M': 30,  # Action Taken
            'N': 30,  # Remarks
        }

        for col, width in column_widths.items():
            worksheet.column_dimensions[col].width = width

        headers = [
            'Date Submitted',
            'JO Number',
            'Requested By',
            'Category',
            'Tool',
            'Nature of Changes',
            'Details',
            'Status',
            'Person In Charge',
            'Date Received',
            'Expected Date',
            'Date Completed',
            'Action Taken',
            'Remarks',
        ]

        for col, header in enumerate(headers, start=1):
            cell = worksheet.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border

        for row_idx, jo in enumerate(job_orders, start=2):
            # Date Created
            formatted_date = jo.date_created.strftime('%Y-%m-%d') if jo.date_created else ''
            cell = worksheet.cell(row=row_idx, column=1, value=formatted_date)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # JO Number
            cell = worksheet.cell(row=row_idx, column=2, value=jo.jo_number)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Requested By
            cell = worksheet.cell(row=row_idx, column=3, value=jo.requestor)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Category with color formatting
            cell = worksheet.cell(row=row_idx, column=4, value=jo.jo_color)
            if jo.jo_color and jo.jo_color.lower() in category_styles:
                style = category_styles[jo.jo_color.lower()]
                cell.fill = style['fill']
                cell.font = style['font']
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center')

            # Tool
            cell = worksheet.cell(row=row_idx, column=5, value=jo.jo_tools)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Nature
            cell = worksheet.cell(row=row_idx, column=6, value=jo.jo_type)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Details
            cell = worksheet.cell(row=row_idx, column=7, value=jo.details)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Status with color formatting
            cell = worksheet.cell(row=row_idx, column=8, value=jo.status)
            if jo.status in status_styles:
                style = status_styles[jo.status]
                cell.fill = style['fill']
                cell.font = style['font']
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center')

            # Person In Charge
            in_charge_name = ''
            if jo.in_charge:
                try:
                    if hasattr(jo.in_charge, 'name') and jo.in_charge.name:
                        in_charge_name = jo.in_charge.name
                    else:
                        in_charge_name = jo.in_charge.username
                except:
                    in_charge_name = str(jo.in_charge.id) if jo.in_charge.id else 'Unknown'

            cell = worksheet.cell(row=row_idx, column=9, value=in_charge_name)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Date Received
            # Details
            cell = worksheet.cell(row=row_idx, column=7, value=jo.details)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Status with color formatting
            cell = worksheet.cell(row=row_idx, column=8, value=jo.status)
            if jo.status in status_styles:
                style = status_styles[jo.status]
                cell.fill = style['fill']
                cell.font = style['font']
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center')

            # Person In Charge
            in_charge_name = ''
            if jo.in_charge:
                try:
                    if hasattr(jo.in_charge, 'name') and jo.in_charge.name:
                        in_charge_name = jo.in_charge.name
                    else:
                        in_charge_name = jo.in_charge.username
                except:
                    in_charge_name = str(jo.in_charge.id) if jo.in_charge.id else 'Unknown'

            cell = worksheet.cell(row=row_idx, column=9, value=in_charge_name)
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Date Received
            if jo.date_received:
                formatted_date = jo.date_received.strftime('%Y-%m-%d')
                cell = worksheet.cell(row=row_idx, column=10, value=formatted_date)
            else:
                cell = worksheet.cell(row=row_idx, column=10, value='')
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Expected Date
            if jo.target_date:
                formatted_date = jo.target_date.strftime('%Y-%m-%d')
                cell = worksheet.cell(row=row_idx, column=11, value=formatted_date)
            else:
                cell = worksheet.cell(row=row_idx, column=11, value='')
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Date Completed
            if jo.date_complete:
                formatted_date = jo.date_complete.strftime('%Y-%m-%d')
                cell = worksheet.cell(row=row_idx, column=12, value=formatted_date)
            else:
                cell = worksheet.cell(row=row_idx, column=12, value='')
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Action Taken
            cell = worksheet.cell(row=row_idx, column=13, value=jo.action_taken if jo.action_taken else '')
            cell.border = thin_border
            cell.alignment = cell_alignment

            # Remarks
            cell = worksheet.cell(row=row_idx, column=14, value=jo.target_date_reason if jo.target_date_reason else '')
            cell.border = thin_border
            cell.alignment = cell_alignment

        summary_sheet = workbook.create_sheet(title="Summary")

        summary_sheet.column_dimensions['A'].width = 40
        summary_sheet.column_dimensions['B'].width = 15

        # Title
        title_cell = summary_sheet.cell(row=1, column=1, value='Job Orders Export Summary')
        title_cell.font = Font(bold=True, size=14)
        summary_sheet.merge_cells('A1:B1')
        title_cell.alignment = Alignment(horizontal='center', vertical='center')

        # Date range
        summary_sheet.cell(row=3, column=1, value='Date Range:').font = Font(bold=True)
        summary_sheet.cell(row=3, column=2, value=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")

        # Total count
        summary_sheet.cell(row=4, column=1, value='Total Job Orders:').font = Font(bold=True)
        summary_sheet.cell(row=4, column=2, value=len(job_orders))

        # Status breakdown
        status_counts = {}
        for jo in job_orders:
            status_counts[jo.status] = status_counts.get(jo.status, 0) + 1

        summary_sheet.cell(row=6, column=1, value='Status Breakdown:').font = Font(bold=True)

        summary_row = 7
        for status, count in status_counts.items():
            summary_sheet.cell(row=summary_row, column=1, value=status)
            summary_sheet.cell(row=summary_row, column=2, value=count)
            if status in status_styles:
                summary_sheet.cell(row=summary_row, column=1).font = status_styles[status]['font']

            summary_row += 1

        category_counts = {}
        for jo in job_orders:
            if jo.jo_color:
                category_counts[jo.jo_color] = category_counts.get(jo.jo_color, 0) + 1

        summary_sheet.cell(row=summary_row + 1, column=1, value='Category Breakdown:').font = Font(bold=True)

        summary_row += 2
        for category, count in category_counts.items():
            summary_sheet.cell(row=summary_row, column=1, value=category)
            summary_sheet.cell(row=summary_row, column=2, value=count)

            if category.lower() in category_styles:
                summary_sheet.cell(row=summary_row, column=1).font = category_styles[category.lower()]['font']

            summary_row += 1

        # Save workbook to BytesIO object
        output = io.BytesIO()
        workbook.save(output)
        output.seek(0)

        # Generate a unique filename with timestamp
        filename = f"job_orders_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        # Create response with proper headers
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # Set headers for file download
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = str(len(response.content))
        response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length, X-Export-Success'
        response['X-Export-Success'] = 'true'

        print(f"Export successful, returning file: {filename}, size: {len(response.content)} bytes")
        return response

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Export error: {str(e)}")
        print(error_traceback)

        # Return a more detailed error response
        error_message = str(e)
        if "CSRF" in error_message:
            error_message = "CSRF verification failed. Please refresh the page and try again."

        return JsonResponse({
            'error': error_message,
            'details': 'An error occurred while generating the Excel file. Please try again or contact support.'
        }, status=500)

# Queue
@login_required(login_url="user-login")
def queue_overview(request):
    current_month = now().month
    current_year = now().year

    pendingJO = JORouting.objects.filter(status = "Processing", approver=request.user).order_by("-request_at")

    joRequestsCount = JORouting.objects.filter(approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    formatted_joRequestsCount = f"{joRequestsCount:04}"
    noTargetJOCount = JORouting.objects.filter(status = "Processing", approver=request.user, jo_number__target_date__isnull=True,request_at__year=current_year, request_at__month=current_month).count()
    formatted_noTargetJOCount = f"{noTargetJOCount:04}"
    noInchargeJOCount = JORouting.objects.filter(status = "Processing", approver=request.user, jo_number__target_date__isnull=True, request_at__year=current_year, request_at__month=current_month).count()
    formatted_noInchargeJOCount = f"{noInchargeJOCount:04}"
    pendingJOCount = JORouting.objects.filter(status = "Processing", approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    formatted_pendingJOCount = f"{pendingJOCount:04}"

    context={
        'queueList':pendingJO,

        'joRequestsCount':formatted_joRequestsCount,
        'noTargetJOCount':formatted_noTargetJOCount,
        'noInchargeJOCount':formatted_noInchargeJOCount,
        'pendingJOCount':formatted_pendingJOCount,
    }
    return render(request, 'joborder/overall-dashboard.html', context)

@require_GET
def job_order_stats_api(request):
    try:
        now = timezone.now()
        today = now.date()
        thirty_days_ago = today - timedelta(days=30)
        sixty_days_ago = today - timedelta(days=60)

        # Get all users with job_order_maintenance = True
        maintenance_users = Users.objects.filter(job_order_maintenance=True)

        # Active JO count - specifically count JORouting entries where:
        # - approver has job_order_maintenance=True
        # - status="Pending"
        active_jo_count = JORouting.objects.filter(
            approver__in=maintenance_users,
            status='Processing'
        ).count()

        # Previous 30-day active JO count (using the same criteria)
        prev_active_jo_count = JORouting.objects.filter(
            approver__in=maintenance_users,
            status='Processing',
            request_at__range=[sixty_days_ago, thirty_days_ago]
        ).count()

        # Calculate percentage change
        if prev_active_jo_count > 0:
            active_jo_percentage = round(((active_jo_count - prev_active_jo_count) / prev_active_jo_count) * 100)
        else:
            active_jo_percentage = 100 if active_jo_count > 0 else 0

        # Completion rate
        total_jo_last_30_days = JOLogsheet.objects.filter(
            date_created__gte=thirty_days_ago
        ).count()

        completed_jo_last_30_days = JORouting.objects.filter(
            jo_number__date_created__gte=thirty_days_ago,
            approver__in=maintenance_users,
            status="Approved",
            approved_at__isnull=False
        ).count()

        completion_rate = (
            int((completed_jo_last_30_days / total_jo_last_30_days) * 100)
            if total_jo_last_30_days > 0 else 0
        )

        # Previous period completion rate
        total_jo_prev_period = JOLogsheet.objects.filter(
            date_created__range=[sixty_days_ago, thirty_days_ago]
        ).count()

        completed_jo_prev_period = JORouting.objects.filter(
            jo_number__date_created__range=[sixty_days_ago, thirty_days_ago],
            approver__in=maintenance_users,
            status="Approved",
            approved_at__isnull=False
        ).count()

        prev_completion_rate = (
            round((completed_jo_prev_period / total_jo_prev_period) * 100)
            if total_jo_prev_period > 0 else 0
        )

        completion_rate_change = completion_rate - prev_completion_rate

        # Resolution time (in days)
        completed_jobs = JOLogsheet.objects.filter(
            status__in=['Completed', 'Checked', 'Closed'],
            date_created__gte=thirty_days_ago,
            date_complete__isnull=False
        )

        avg_resolution_days = 0
        resolution_time_change = 0
        resolution_time_improved = False

        resolution_times = [
            (job.date_complete - job.date_created).days
            for job in completed_jobs
            if job.date_complete and job.date_created
        ]

        if resolution_times:
            avg_resolution_days = round(sum(resolution_times) / len(resolution_times), 1)

            prev_completed_jobs = JOLogsheet.objects.filter(
                status__in=['Completed', 'Checked', 'Closed'],
                date_created__range=[sixty_days_ago, thirty_days_ago],
                date_complete__isnull=False
            )

            prev_resolution_times = [
                (job.date_complete - job.date_created).days
                for job in prev_completed_jobs
                if job.date_complete and job.date_created
            ]

            if prev_resolution_times:
                prev_avg = sum(prev_resolution_times) / len(prev_resolution_times)
                resolution_time_change = round(abs((avg_resolution_days - prev_avg) / prev_avg * 100))
                resolution_time_improved = avg_resolution_days < prev_avg

        # Overdue tasks - count JORouting entries where:
        # - approver has job_order_maintenance=True
        # - status="Pending"
        # - target_date from JOLogsheet is in the past
        overdue_tasks = JORouting.objects.filter(
            approver__in=maintenance_users,
            status='Pending',
            jo_number__target_date__lt=now
        ).count()

        # Previous period overdue tasks
        prev_overdue_date = sixty_days_ago
        prev_overdue_tasks = JORouting.objects.filter(
            approver__in=maintenance_users,
            status='Pending',
            jo_number__target_date__lt=prev_overdue_date,
            request_at__lt=thirty_days_ago
        ).count()

        overdue_tasks_change = (
            round(abs((overdue_tasks - prev_overdue_tasks) / prev_overdue_tasks * 100))
            if prev_overdue_tasks > 0 else 0
        )
        overdue_tasks_reduced = overdue_tasks < prev_overdue_tasks

        # Count jobs with no target date
        no_target_date_count = JORouting.objects.filter(
            approver__in=maintenance_users,
            status='Pending',
            jo_number__target_date__isnull=True
        ).count()

        return JsonResponse({
            'status': 'success',
            'active_jo_count': active_jo_count,
            'active_jo_percentage': active_jo_percentage,
            'completion_rate': completion_rate,
            'completion_rate_change': completion_rate_change,
            'avg_resolution_time': avg_resolution_days,
            'resolution_time_improved': resolution_time_improved,
            'resolution_time_change': resolution_time_change,
            'overdue_tasks': overdue_tasks,
            'overdue_tasks_change': overdue_tasks_change,
            'overdue_tasks_reduced': overdue_tasks_reduced,
            'no_target_date_count': no_target_date_count,
            'last_updated': timezone.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)})

@require_GET
def job_order_timeline_api(request, view_type):
    try:
        now = timezone.now()
        today = now.date()
        maintenance = Users.objects.filter(job_order_maintenance=True)

        response_data = {
            'status': 'success',
            'view_type': view_type,
            'events': []
        }

        # Get all pending job orders assigned to maintenance users regardless of date
        all_pending_jobs = JORouting.objects.filter(
            approver__in=maintenance,
            status='Processing'
        ).order_by('-request_at')

        # Helper function to create event data with common fields
        def create_event_data(job, additional_fields=None):
            # Get the JO number
            jo_number = job.jo_number.jo_number if hasattr(job.jo_number, 'jo_number') else str(job.jo_number)

            # Get the requestor name
            requestor = job.jo_number.requestor if hasattr(job.jo_number, 'requestor') else "Unknown"

            # Get target date for color coding
            target_date = job.jo_number.target_date if hasattr(job.jo_number, 'target_date') else None

            # Calculate days until target date for color coding
            days_until_target = None
            has_target_date = target_date is not None
            is_overdue = False
            is_approaching = False

            if has_target_date:
                days_until_target = (target_date.date() - today).days
                is_overdue = days_until_target < 0
                is_approaching = 0 <= days_until_target <= 3

            # Format the time with AM/PM
            time_str = job.request_at.strftime("%I:%M %p").strip()

            # Format the date for month view
            date_str = job.request_at.strftime("%b %d")

            # Get department/line information
            department_line = "N/A"
            try:
                if job.jo_number.prepared_by and job.jo_number.prepared_by.line:
                    department_line = job.jo_number.prepared_by.line.line_name
            except Exception as e:
                print(f"Error getting line information: {str(e)}")

            # Create the base event data
            event_data = {
                'jo_number': jo_number,
                'time': time_str,
                'date': date_str,
                'title': f"Assigned to {job.approver.name}",
                'requestor': requestor,
                'requestor_dept': department_line,
                'status': job.status,
                'has_target_date': has_target_date,
                'is_overdue': is_overdue,
                'is_approaching': is_approaching,
                'days_until_target': days_until_target,
                'event_date': job.request_at.strftime("%Y-%m-%d")  # For date filtering
            }

            # Add any additional fields
            if additional_fields:
                event_data.update(additional_fields)

            return event_data

        if view_type == 'timeline-today':
            # For today view, still filter by today but include all pending jobs
            today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            today_end = timezone.make_aware(datetime.combine(today, datetime.max.time()))

            # Get jobs created today
            today_jobs = all_pending_jobs.filter(
                request_at__range=[today_start, today_end]
            )

            # If no jobs today, show some of the most recent pending jobs
            if not today_jobs.exists():
                today_jobs = all_pending_jobs[:5]  # Show up to 5 recent pending jobs

            for job in today_jobs:
                event_data = create_event_data(job)
                response_data['events'].append(event_data)

        elif view_type == 'timeline-week':
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)

            # Create day columns for the current week
            day_columns = {(start_of_week + timedelta(days=i)).day: i+1 for i in range(7)}
            day_rows = {i+1: 1 for i in range(7)}

            # Get jobs from this week
            week_jobs = all_pending_jobs.filter(
                request_at__date__gte=start_of_week,
                request_at__date__lte=end_of_week
            )

            # If no jobs this week, show some of the most recent pending jobs
            if not week_jobs.exists():
                week_jobs = all_pending_jobs[:10]  # Show up to 10 recent pending jobs

                # For jobs outside the current week, distribute them evenly across the week
                for i, job in enumerate(week_jobs):
                    day_column = (i % 7) + 1  # Distribute across the 7 days of the week
                    additional_fields = {
                        'day_column': day_column,
                        'row': day_rows[day_column]
                    }
                    event_data = create_event_data(job, additional_fields)
                    response_data['events'].append(event_data)
                    day_rows[day_column] += 1
            else:
                # For jobs within the current week, place them on the correct day
                for job in week_jobs:
                    job_day = job.request_at.day
                    # Find the closest day column if the exact day isn't in our columns
                    closest_day = min(day_columns.keys(), key=lambda x: abs(x - job_day))
                    day_column = day_columns.get(closest_day, 1)

                    additional_fields = {
                        'day_column': day_column,
                        'row': day_rows[day_column]
                    }
                    event_data = create_event_data(job, additional_fields)
                    response_data['events'].append(event_data)
                    day_rows[day_column] += 1

        elif view_type == 'timeline-month':
            start_of_month = today.replace(day=1)

            # Create week columns for the current month
            weeks_in_month = (today.day - 1) // 7 + 1
            week_columns = {i+1: i+1 for i in range(weeks_in_month)}
            week_rows = {i+1: 1 for i in range(weeks_in_month)}

            # Get jobs from this month
            month_jobs = all_pending_jobs.filter(
                request_at__year=today.year,
                request_at__month=today.month
            )

            # If no jobs this month, show some of the most recent pending jobs
            if not month_jobs.exists():
                month_jobs = all_pending_jobs[:15]  # Show up to 15 recent pending jobs

                # For jobs outside the current month, distribute them evenly across the weeks
                for i, job in enumerate(month_jobs):
                    week_column = (i % weeks_in_month) + 1  # Distribute across the weeks of the month
                    additional_fields = {
                        'week_column': week_column,
                        'row': week_rows[week_column]
                    }
                    event_data = create_event_data(job, additional_fields)
                    response_data['events'].append(event_data)
                    week_rows[week_column] += 1
            else:
                # For jobs within the current month, place them in the correct week
                for job in month_jobs:
                    week_of_month = (job.request_at.day - 1) // 7 + 1
                    if week_of_month not in week_columns:
                        week_columns[week_of_month] = len(week_columns) + 1
                        week_rows[week_columns[week_of_month]] = 1

                    week_column = week_columns[week_of_month]
                    additional_fields = {
                        'week_column': week_column,
                        'row': week_rows[week_column]
                    }
                    event_data = create_event_data(job, additional_fields)
                    response_data['events'].append(event_data)
                    week_rows[week_column] += 1

        response_data['events'].sort(key=lambda x: x.get('row', 0))

        return JsonResponse(response_data)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)})

@require_GET
def job_order_deadlines_api(request):
    try:
        now = timezone.now()
        today = now.date()

        maintenance_personnel = Users.objects.filter(job_order_maintenance=True)

        upcoming_deadlines = JOLogsheet.objects.filter(
            target_date__gte=now,
            joRouting__status='Processing',
            joRouting__approver_sequence=6,
            joRouting__approver__in=maintenance_personnel
        ).order_by('target_date').distinct()[:10]

        deadlines_data = []

        for job in upcoming_deadlines:
            if job.target_date:
                days_until = (job.target_date.date() - today).days

                if days_until == 0:
                    countdown = "Today"
                elif days_until == 1:
                    countdown = "Tomorrow"
                else:
                    countdown = f"{days_until} days"

                assigned_person = job.in_charge.name if job.in_charge else None
                assigned_to = f"Assigned to {assigned_person}" if assigned_person else "Not yet assigned"

                # Get requestor information
                requestor = job.requestor if job.requestor else "Unknown"

                # Get department/line information
                department_line = "N/A"
                try:
                    if job.prepared_by and job.prepared_by.line:
                        department_line = job.prepared_by.line.line_name
                except Exception as e:
                    print(f"Error getting line information: {str(e)}")

                deadline = {
                    'jo_number': job.jo_number,
                    'category': job.jo_color,
                    'day': job.target_date.day,
                    'month': job.target_date.strftime('%b'),
                    'description': f"{job.jo_tools} - {job.jo_type} - {assigned_to}",
                    'countdown': countdown,
                    'is_critical': job.jo_color.lower() == 'orange' or days_until <= 2,
                    'requestor': requestor,
                    'department': department_line
                }

                deadlines_data.append(deadline)

        return JsonResponse({
            'status': 'success',
            'deadlines': deadlines_data,
            'last_updated': now.strftime("%Y-%m-%d %H:%M:%S")
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        })

@require_GET
def job_order_alerts_api(request):
    try:
        now = timezone.now()
        today = now.date()
        maintenance_personnel = Users.objects.filter(job_order_maintenance=True)
        alerts_data = []

        overdue_jobs = JOLogsheet.objects.filter(
            target_date__lt=now,
            status='Routing',
            joRouting__status='Processing',
            joRouting__approver_sequence=6,
            joRouting__approver__in=maintenance_personnel
        ).distinct().order_by('target_date')[:3]

        for job in overdue_jobs:
            days_overdue = (today - job.target_date.date()).days
            assigned_to = job.in_charge.name if job.in_charge else "No assignee yet"
            requestor = job.requestor if job.requestor else "Unknown"
            department_line = "N/A"
            try:
                if job.prepared_by and job.prepared_by.line:
                    department_line = job.prepared_by.line.line_name
            except Exception as e:
                print(f"Error getting line information: {str(e)}")

            message = f"{job.jo_tools} is overdue by {days_overdue} days. Assigned to {assigned_to}."

            alert = {
                'type': 'critical',
                'icon': 'exclamation-triangle',
                'title': f"Overdue Job Order: {job.jo_number}",
                'time': f"{days_overdue} days ago",
                'message': message,
                'requestor': requestor,
                'department': department_line,
                'actions': [
                    {
                        'text': 'View Details',
                        'icon': 'eye',
                        'data_jo': job.jo_number
                    },
                    {
                        'text': 'Send Reminder',
                        'icon': 'bell',
                        'data_jo': None
                    }
                ]
            }

            alerts_data.append(alert)

        overloaded_staff = JOLogsheet.objects.filter(
            status='Routing',
            joRouting__status='Pending',
            joRouting__approver_sequence=6,
            joRouting__approver__in=maintenance_personnel
        ).values('in_charge').annotate(
            task_count=Count('id')
        ).filter(task_count__gte=3).order_by('-task_count')[:2]

        for staff in overloaded_staff:
            if staff['in_charge']:
                try:
                    staff_member = Users.objects.get(id=staff['in_charge'])
                    workload_percent = min(round((staff['task_count'] / 6) * 100), 100)

                    alert = {
                        'type': 'resource',
                        'icon': 'cogs',
                        'title': f"Resource Bottleneck: {staff_member.name}",
                        'time': 'Active',
                        'message': f"{staff_member.name} has {workload_percent}% workload capacity with {staff['task_count']} pending tasks.",
                        'actions': [
                            {
                                'text': 'Reassign Tasks',
                                'icon': 'exchange-alt',
                                'data_jo': None
                            },
                            {
                                'text': 'Resource Planning',
                                'icon': 'users',
                                'data_jo': None
                            }
                        ]
                    }

                    alerts_data.append(alert)
                except Users.DoesNotExist:
                    continue

        return JsonResponse({
            'status': 'success',
            'alerts': alerts_data,
            'last_updated': now.strftime("%Y-%m-%d %H:%M:%S")
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        })

# Maintenance
@login_required(login_url="user-login")
def maintenance_personnel(request):
    today = now().date()
    current_month = now().month
    current_year = now().year

    pendingJO = JORouting.objects.filter(status = "Processing", approver=request.user).order_by("-request_at")
    overallJO = JOLogsheet.objects.filter(joRouting__approver=request.user, joRouting__approver_sequence=6).order_by("-joRouting__request_at", "joRouting__status")
    for job in overallJO:
        job.has_pending_routing = job.joRouting.filter(approver_sequence=6, status='Processing').exists()

    joRequestsCount = JOLogsheet.objects.filter(in_charge=request.user, date_created__year=current_year, date_created__month=current_month).count()
    completedJO = JORouting.objects.filter(status = "Approved", approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    pendingRequest = JORouting.objects.filter(status = "Pending", approver=request.user, request_at__year=current_year, request_at__month=current_month).count()
    overdueRequests = JORouting.objects.filter(status = "Pending", approver=request.user, request_at__year=current_year, request_at__month=current_month).filter(jo_number__target_date__lt=today).count()

    context={
        'pendingRequest':pendingJO,
        'overallJO':overallJO,
        'totalAssigned':joRequestsCount,
        'completedRequest':completedJO,
        'pending':pendingRequest,
        'overdueRequests':overdueRequests,
    }
    return render(request, 'joborder/jo-maintenance.html', context)

@login_required
def maintenance_job_orders_api(request):
    """API endpoint to get job orders for maintenance personnel"""
    try:
        # Get job orders assigned to the current user
        job_orders = JOLogsheet.objects.filter(
            joRouting__approver=request.user,
            joRouting__approver_sequence=6
        ).order_by("-joRouting__request_at", "joRouting__status")

        # Prepare data for response
        job_orders_data = []
        for job in job_orders:
            # Check if job has pending routing
            has_pending_routing = job.joRouting.filter(approver_sequence=6, status='Processing').exists()

            # Check if job is overdue
            is_overdue = False
            if job.target_date and job.target_date < now().date() and job.status != 'Completed':
                is_overdue = True

            job_orders_data.append({
                'id': job.id,
                'jo_number': job.jo_number,
                'jo_color': job.jo_color,
                'jo_tools': job.jo_tools,
                'requestor': job.requestor,
                'target_date': job.target_date.strftime('%b %d, %Y') if job.target_date else None,
                'status': job.status,
                'is_overdue': is_overdue,
                'has_pending_routing': has_pending_routing
            })

        return JsonResponse({
            'status': 'success',
            'job_orders': job_orders_data
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@login_required
def get_job_order_trends(request):
    period = request.GET.get('period', 'month')
    current_user = request.user
    today = timezone.now()

    if (period == 'month'):
        start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = today.month + 1 if today.month < 12 else 1
        next_month_year = today.year if today.month < 12 else today.year + 1
        days_in_month = (datetime(next_month_year, next_month, 1) - timedelta(days=1)).day

        labels = [(start_date + timedelta(days=i)).strftime('%d') for i in range(days_in_month)]
        new_orders_data = [0] * days_in_month
        completed_data = [0] * days_in_month

        new_routings = JORouting.objects.filter(
            approver=current_user,
            approver_sequence=6,
            request_at__year=today.year,
            request_at__month=today.month
        )

        completed_routings = JORouting.objects.filter(
            approver=current_user,
            approver_sequence=6,
            approved_at__year=today.year,
            approved_at__month=today.month,
            status='Approved'
        )

        for routing in new_routings:
            day_index = routing.request_at.day - 1
            if 0 <= day_index < len(new_orders_data):
                new_orders_data[day_index] += 1

        for routing in completed_routings:
            if routing.approved_at:
                day_index = routing.approved_at.day - 1
                if 0 <= day_index < len(completed_data):
                    completed_data[day_index] += 1

    elif period == 'quarter':
        current_month = today.month
        quarter_start_month = 3 * ((current_month - 1) // 3) + 1

        months = []
        for i in range(3):
            month = (quarter_start_month + i - 1) % 12 + 1
            year = today.year if month >= quarter_start_month or quarter_start_month > today.month else today.year - 1
            months.append((year, month))

        labels = [datetime(year, month, 1).strftime('%b') for year, month in months]
        new_orders_data = [0] * 3
        completed_data = [0] * 3

        for i, (year, month) in enumerate(months):
            month_new_routings = JORouting.objects.filter(
                approver=current_user,
                approver_sequence=6,
                request_at__year=year,
                request_at__month=month
            ).count()
            new_orders_data[i] = month_new_routings

            month_completed_routings = JORouting.objects.filter(
                approver=current_user,
                approver_sequence=6,
                approved_at__year=year,
                approved_at__month=month,
                status='Approved'
            ).count()
            completed_data[i] = month_completed_routings

    elif period == 'year':
        months_data = []
        for i in range(11, -1, -1):
            target_date = today - timedelta(days=i*30)
            year = target_date.year
            month = target_date.month
            months_data.append((year, month, target_date.strftime('%b %y')))

        months_data.sort()

        labels = [month_label for _, _, month_label in months_data]
        new_orders_data = [0] * 12
        completed_data = [0] * 12

        for i, (year, month, _) in enumerate(months_data):
            month_new_routings = JORouting.objects.filter(
                approver=current_user,
                approver_sequence=6,
                request_at__year=year,
                request_at__month=month
            ).count()
            new_orders_data[i] = month_new_routings

            month_completed_routings = JORouting.objects.filter(
                approver=current_user,
                approver_sequence=6,
                approved_at__year=year,
                approved_at__month=month,
                status='Approved'
            ).count()
            completed_data[i] = month_completed_routings

    data = {
        'labels': labels,
        'datasets': [
            {
                'label': 'New Orders',
                'data': new_orders_data,
                'borderColor': '#3366ff',
                'backgroundColor': 'rgba(51, 102, 255, 0.8)',
                'borderWidth': 1
            },
            {
                'label': 'Completed',
                'data': completed_data,
                'borderColor': '#4caf50',
                'backgroundColor': 'rgba(76, 175, 80, 0.8)',
                'borderWidth': 1
            }
        ]
    }

    return JsonResponse(data)

@login_required
def get_upcoming_deadlines(request):
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)
    next_week = today + timedelta(days=7)
    two_weeks = today + timedelta(days=14)

    # Base query for JORouting objects assigned to the current user
    base_query = JORouting.objects.filter(
        approver=request.user,
        approver_sequence=6,
        status="Processing"  # Use Processing instead of Pending to match other queries
    )

    # Count job orders with target date today
    today_count = base_query.filter(
        jo_number__target_date__date=today
    ).count()

    # Count job orders with target date tomorrow
    tomorrow_count = base_query.filter(
        jo_number__target_date__date=tomorrow
    ).count()

    # Count job orders with target date in this week (after tomorrow, up to 7 days from today)
    this_week_count = base_query.filter(
        jo_number__target_date__date__gt=tomorrow,
        jo_number__target_date__date__lte=next_week
    ).count()

    # Count job orders with target date in next week (8-14 days from today)
    next_week_count = base_query.filter(
        jo_number__target_date__date__gt=next_week,
        jo_number__target_date__date__lte=two_weeks
    ).count()

    # Count job orders with target date beyond two weeks
    later_count = base_query.filter(
        jo_number__target_date__date__gt=two_weeks
    ).count()

    # Count overdue job orders (target date before today)
    overdue_count = base_query.filter(
        jo_number__target_date__lt=today
    ).count()


    data = {
        'labels': ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'Later'],
        'datasets': [{
            'label': 'Number of Job Orders',
            'data': [overdue_count, today_count, tomorrow_count, this_week_count, next_week_count, later_count],
            'backgroundColor': [
                'rgba(220, 53, 69, 0.7)',   # Overdue (red)
                'rgba(241, 70, 104, 0.7)',  # Today (urgent)
                'rgba(255, 159, 64, 0.7)',  # Tomorrow
                'rgba(255, 193, 7, 0.7)',   # This Week
                'rgba(76, 175, 80, 0.7)',   # Next Week
                'rgba(51, 102, 255, 0.7)'   # Later
            ],
            'borderColor': [
                'rgba(220, 53, 69, 1)',
                'rgba(241, 70, 104, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(76, 175, 80, 1)',
                'rgba(51, 102, 255, 1)'
            ],
            'borderWidth': 1,
            'barThickness': 30
        }]
    }

    return JsonResponse(data)

@login_required
def set_target_date(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    try:
        job_id = request.POST.get('job_id')
        target_date_str = request.POST.get('target_date')
        target_date_reason = request.POST.get('target_date_reason', '')

        if not job_id or not target_date_str:
            return JsonResponse({
                'status': 'error',
                'message': 'Missing required fields'
            }, status=400)

        target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
        target_date = timezone.make_aware(target_date)

        job_order = JOLogsheet.objects.get(id=job_id)

        if job_order.in_charge != request.user:
            return JsonResponse({
                'status': 'error',
                'message': 'You are not authorized to update this job order'
            }, status=403)

        job_order.target_date = target_date
        job_order.target_date_reason = target_date_reason
        job_order.save()

        return JsonResponse({
            'status': 'success',
            'message': 'Target date set successfully',
            'target_date': target_date.strftime('%b %d, %Y')
        })

    except JOLogsheet.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'Job order not found'
        }, status=404)

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@login_required
def complete_job_order(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    try:
        job_id = request.POST.get('job_id')
        action_taken = request.POST.get('action_taken')
        completion_remarks = request.POST.get('completion_remarks', '')

        if not job_id or not action_taken:
            return JsonResponse({
                'status': 'error',
                'message': 'Missing required fields'
            }, status=400)

        job_order = JOLogsheet.objects.get(id=job_id)

        if job_order.in_charge != request.user:
            return JsonResponse({
                'status': 'error',
                'message': 'You are not authorized to update this job order'
            }, status=403)

        current_routing = JORouting.objects.filter(
            jo_number=job_order,
            approver=request.user,
            status='Processing'
        ).first()

        if not current_routing:
            return JsonResponse({
                'status': 'error',
                'message': 'No pending routing found'
            }, status=404)

        checker_approver = UserApprovers.objects.filter(
            user=job_order.prepared_by,
            module="Job Order",
            approver_role="Checker"
        ).first()

        if not checker_approver or not checker_approver.approver:
            return JsonResponse({
                'status': 'error',
                'message': 'Checker not found'
            }, status=404)

        # Proceed with updating only if checker is available
        job_order.action_taken = action_taken
        job_order.date_complete = timezone.now()
        job_order.status = 'Completed'
        job_order.save()

        current_routing.status = 'Approved'
        current_routing.approved_at = timezone.now()
        current_routing.remarks = completion_remarks
        current_routing.save()

        checker_routing = JORouting.objects.filter(jo_number=job_order,approver_sequence=7,status="Rejected").first()
        if checker_routing:
            checker_routing.status="Processing"
            checker_routing.save()
        else:
            JORouting.objects.create(
                jo_number=job_order,
                jo_request=job_order.prepared_by,
                approver=checker_approver.approver,
                approver_sequence=current_routing.approver_sequence + 1,
                status='Processing'
            )

        return JsonResponse({
            'status': 'success',
            'message': 'Job order marked as complete',
            'completion_date': job_order.date_complete.strftime('%b %d, %Y')
        })

    except JOLogsheet.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'Job order not found'
        }, status=404)

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)