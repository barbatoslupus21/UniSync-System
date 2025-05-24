from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseForbidden, HttpResponse
from django.contrib import messages
from django.db.models import Count
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.db import transaction

from .models import DCF, DCFApprovalTimeline, DCFNumberSetting
from .forms import DCFForm, DCFApprovalForm
from portalusers.models import Users
from .utils import retry_on_db_lock

import datetime
import json

#  Helper functions 

def check_dcf_user(user):
    return user.dcf_user

def check_dcf_requestor(user):
    return user.dcf_requestor

def check_dcf_approver(user):
    return user.dcf_approver

#  Requestor Views 

@login_required(login_url="user-login")
def dcf_requestor(request):
    if not (check_dcf_user(request.user) and check_dcf_requestor(request.user)):
        messages.error(request, "You don't have permission to access this page.")
        return redirect('dashboard')

    total_dcfs = DCF.objects.filter(requisitioner=request.user).count()
    on_process_dcfs = DCF.objects.filter(requisitioner=request.user, status='on_process').count()
    approved_dcfs = DCF.objects.filter(requisitioner=request.user, status='approved').count()
    rejected_dcfs = DCF.objects.filter(requisitioner=request.user, status='rejected').count()

    recent_dcfs = DCF.objects.filter(requisitioner=request.user).order_by('-date_filed')[:3]

    all_dcfs_list = DCF.objects.filter(requisitioner=request.user).order_by('-date_filed')
    paginator = Paginator(all_dcfs_list, 10)
    page = request.GET.get('page')
    all_dcfs = paginator.get_page(page)

    context = {
        'total_dcfs': total_dcfs,
        'on_process_dcfs': on_process_dcfs,
        'approved_dcfs': approved_dcfs,
        'rejected_dcfs': rejected_dcfs,
        'recent_dcfs': recent_dcfs,
        'all_dcfs': all_dcfs,
    }

    return render(request, 'dcf/requestor.html', context)

@login_required(login_url="user-login")
def create_dcf(request):
    if not (check_dcf_user(request.user) and check_dcf_requestor(request.user)):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    if request.method == 'POST':
        form = DCFForm(request.POST)
        if form.is_valid():
            prepared_by = form.cleaned_data.get('prepared_by')

            dcf = form.save(commit=False)
            dcf.requisitioner = request.user

            if prepared_by:
                dcf.prepared_by = prepared_by
            else:
                dcf.prepared_by = request.user.name

            dcf.save()

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"DCF {dcf.dcf_number} has been created successfully."
                })

            messages.success(request, f"DCF {dcf.dcf_number} has been created successfully.")
            return redirect('dcf_requestor')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': "There were errors in your submission. Please check the form and try again.",
                    'errors': form.errors
                }, status=400)

            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    else:
        form = DCFForm()

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': False,
            'message': "Method not allowed"
        }, status=405)

    return render(request, 'dcf/requestor.html', {'form': form, 'action': 'Create'})

@login_required(login_url="user-login")
def edit_dcf(request, pk):
    dcf = get_object_or_404(DCF, pk=pk)

    if not (check_dcf_user(request.user) and check_dcf_requestor(request.user) and dcf.requisitioner == request.user):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    if not dcf.is_editable():
        messages.error(request, "This DCF can no longer be edited as it has been processed.")
        return redirect('dcf_requestor')

    if request.method == 'POST':
        form = DCFForm(request.POST, instance=dcf)
        if form.is_valid():
            prepared_by = form.cleaned_data.get('prepared_by')

            dcf_instance = form.save(commit=False)

            if prepared_by:
                dcf_instance.prepared_by = prepared_by

            dcf_instance.save()

            messages.success(request, f"DCF {dcf.dcf_number} has been updated successfully.")
            return redirect('dcf_requestor')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    else:
        form = DCFForm(instance=dcf, initial={'prepared_by': dcf.prepared_by})

    return render(request, 'dcf/dcf_form.html', {'form': form, 'dcf': dcf, 'action': 'Edit'})

@login_required(login_url="user-login")
@require_POST
def delete_dcf(request, pk):
    dcf = get_object_or_404(DCF, pk=pk)

    if not (check_dcf_user(request.user) and check_dcf_requestor(request.user) and dcf.requisitioner == request.user):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    if not dcf.is_editable():
        messages.error(request, "This DCF can no longer be deleted as it has been processed.")
        return redirect('dcf_requestor')

    dcf_number = dcf.dcf_number
    dcf.delete()
    messages.success(request, f"DCF {dcf_number} has been deleted successfully.")

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'status': 'success'})
    return redirect('dcf_requestor')

@login_required(login_url="user-login")
def view_dcf(request, pk):
    dcf = get_object_or_404(DCF, pk=pk)

    if not check_dcf_user(request.user):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    if not (check_dcf_requestor(request.user) and dcf.requisitioner == request.user) and not check_dcf_approver(request.user):
        return HttpResponseForbidden("You don't have permission to view this DCF.")

    approval_timeline = dcf.approvals.all().order_by('date_acted')

    context = {
        'dcf': dcf,
        'approval_timeline': approval_timeline,
        'can_edit': dcf.is_editable() and dcf.requisitioner == request.user
    }

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        if request.GET.get('format') == 'json':
            data = {
                'id': dcf.id,
                'dcf_number': dcf.dcf_number,
                'requisitioner': dcf.requisitioner.name,
                'prepared_by': dcf.prepared_by,
                'document_code': dcf.document_code,
                'document_title': dcf.document_title,
                'revision_number': dcf.revision_number,
                'nature': dcf.nature,
                'details': dcf.details,
                'effectivity_date': dcf.effectivity_date.strftime('%Y-%m-%d'),
                'status': dcf.status,
                'status_display': dcf.get_status_display(),
                'date_filed': dcf.date_filed.strftime('%b %d, %Y'),
                'can_edit': dcf.is_editable() and dcf.requisitioner == request.user
            }
            return JsonResponse(data)
        return render(request, 'dcf/dcf_details_partial.html', context)
    return render(request, 'dcf/dcf_details.html', context)

#  Approver Views 

@login_required(login_url="user-login")
def dcf_approver_dashboard(request):
    if not (check_dcf_user(request.user) and check_dcf_approver(request.user)):
        messages.error(request, "You don't have permission to access this page.")
        return redirect('dcf_approver')

    pending_list = DCF.objects.filter(status='on_process').order_by('-date_filed')

    total_dcfs = DCF.objects.all().count()
    pending_count = pending_list.count()
    approved_dcfs = DCF.objects.filter(status='approved').count()
    rejected_dcfs = DCF.objects.filter(status='rejected').count()
    paginator = Paginator(pending_list, 10)
    page = request.GET.get('page')
    pending_approvals = paginator.get_page(page)

    recent_approvals = DCFApprovalTimeline.objects.filter(approver=request.user).order_by('-date_acted')[:5]

    approval_activity = DCFApprovalTimeline.objects.all().order_by('-date_acted')[:5]

    all_activity = list(approval_activity)

    if len(all_activity) < 5:
        pending_activity_dcfs = DCF.objects.filter(status='on_process').order_by('-date_filed')[:5-len(all_activity)]
        for dcf in pending_activity_dcfs:
            temp_activity = {
                'id': f"pending_{dcf.id}",
                'dcf': dcf,
                'approver': {'name': 'System'},
                'status': 'pending',
                'date_acted': dcf.date_filed,
                'remarks': 'Awaiting approval'
            }
            all_activity.append(temp_activity)

    context = {
        'total_dcfs': total_dcfs,
        'pending_dcfs': pending_count,
        'approved_dcfs': approved_dcfs,
        'rejected_dcfs': rejected_dcfs,
        'pending_approvals': pending_approvals,
        'recent_approvals': recent_approvals,
        'all_activity': all_activity,
    }

    return render(request, 'dcf/approver.html', context)

@login_required(login_url="user-login")
def approve_dcf_modal(request, pk):
    dcf = get_object_or_404(DCF, pk=pk)

    if not (check_dcf_user(request.user) and check_dcf_approver(request.user)):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    approval_timeline = dcf.approvals.all().order_by('date_acted')

    context = {
        'dcf': dcf,
        'approval_timeline': approval_timeline,
    }

    return render(request, 'dcf/dcf_approve_modal.html', context)

@login_required(login_url="user-login")
@require_POST
@retry_on_db_lock(max_retries=5, base_delay=0.2)
@transaction.atomic
def approve_dcf(request, pk):
    dcf = get_object_or_404(DCF, pk=pk)

    if not (check_dcf_user(request.user) and check_dcf_approver(request.user)):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    if dcf.status != 'on_process':
        messages.error(request, "This DCF has already been processed.")
        return redirect('dcf_approver')

    remarks = request.POST.get('remarks', '')

    with transaction.atomic():
        dcf = DCF.objects.select_for_update().get(pk=pk)
        approval = dcf.add_approval(request.user, 'approved', remarks)
        dcf.status = 'approved'
        dcf.save()

    messages.success(request, f"DCF {dcf.dcf_number} has been approved successfully.")

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'status': 'success'})
    return redirect('dcf_approver')

@login_required(login_url="user-login")
@require_POST
@retry_on_db_lock(max_retries=5, base_delay=0.2)
@transaction.atomic
def reject_dcf(request, pk):
    dcf = get_object_or_404(DCF, pk=pk)

    if not (check_dcf_user(request.user) and check_dcf_approver(request.user)):
        return HttpResponseForbidden("You don't have permission to perform this action.")

    if dcf.status != 'on_process':
        messages.error(request, "This DCF has already been processed.")
        return redirect('dcf_approver')

    remarks = request.POST.get('remarks', '')

    if not remarks:
        messages.error(request, "Please provide a reason for rejection.")
        return redirect('approve_dcf_modal', pk=dcf.pk)

    with transaction.atomic():
        dcf = DCF.objects.select_for_update().get(pk=pk)
        rejection = dcf.add_approval(request.user, 'rejected', remarks)
        dcf.status = 'rejected'
        dcf.save()

    messages.success(request, f"DCF {dcf.dcf_number} has been rejected successfully.")

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'status': 'success'})
    return redirect('dcf_approver')

#  API endpoints for charts and statistics 

@login_required(login_url="user-login")
def dcf_stats_chart(request):
    if not check_dcf_user(request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    period = request.GET.get('period', 'this_week')
    user_only = request.GET.get('user_only', 'false').lower() == 'true'

    today = timezone.now().date()

    if period == 'this_week':
        start_of_week = today - datetime.timedelta(days=today.weekday())
        days = []
        on_process_data = []
        approved_data = []
        rejected_data = []

        # Generate data for each day of the week
        for i in range(7):
            current_date = start_of_week + datetime.timedelta(days=i)
            days.append(current_date.strftime('%A'))  # Day name

            # Filter by user if requested
            if user_only and check_dcf_requestor(request.user):
                on_process = DCF.objects.filter(
                    requisitioner=request.user,
                    status='on_process',
                    date_filed__date=current_date
                ).count()

                approved = DCF.objects.filter(
                    requisitioner=request.user,
                    status='approved',
                    date_filed__date=current_date
                ).count()

                rejected = DCF.objects.filter(
                    requisitioner=request.user,
                    status='rejected',
                    date_filed__date=current_date
                ).count()
            else:
                on_process = DCF.objects.filter(
                    status='on_process',
                    date_filed__date=current_date
                ).count()

                approved = DCF.objects.filter(
                    status='approved',
                    date_filed__date=current_date
                ).count()

                rejected = DCF.objects.filter(
                    status='rejected',
                    date_filed__date=current_date
                ).count()

            on_process_data.append(on_process)
            approved_data.append(approved)
            rejected_data.append(rejected)

        data = {
            'labels': days,
            'datasets': [
                {
                    'label': 'On Process',
                    'data': on_process_data,
                    'backgroundColor': 'rgba(255, 193, 7, 0.2)',
                    'borderColor': 'rgba(255, 193, 7, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(255, 193, 7, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                },
                {
                    'label': 'Approved',
                    'data': approved_data,
                    'backgroundColor': 'rgba(76, 175, 80, 0.2)',
                    'borderColor': 'rgba(76, 175, 80, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(76, 175, 80, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                },
                {
                    'label': 'Rejected',
                    'data': rejected_data,
                    'backgroundColor': 'rgba(244, 67, 54, 0.2)',
                    'borderColor': 'rgba(244, 67, 54, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(244, 67, 54, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                }
            ]
        }

    elif period == 'this_month':
        # Get data for each day of the current month
        current_month = today.month
        current_year = today.year
        days_in_month = (datetime.date(current_year, current_month + 1, 1) if current_month < 12
                         else datetime.date(current_year + 1, 1, 1)) - datetime.date(current_year, current_month, 1)
        days_in_month = days_in_month.days

        days = []
        on_process_data = []
        approved_data = []
        rejected_data = []

        # Generate data for each day of the month
        for i in range(1, days_in_month + 1):
            current_date = datetime.date(current_year, current_month, i)
            days.append(str(i))  # Just the day number

            # Filter by user if requested
            if user_only and check_dcf_requestor(request.user):
                on_process = DCF.objects.filter(
                    requisitioner=request.user,
                    status='on_process',
                    date_filed__date=current_date
                ).count()

                approved = DCF.objects.filter(
                    requisitioner=request.user,
                    status='approved',
                    date_filed__date=current_date
                ).count()

                rejected = DCF.objects.filter(
                    requisitioner=request.user,
                    status='rejected',
                    date_filed__date=current_date
                ).count()
            else:
                on_process = DCF.objects.filter(
                    status='on_process',
                    date_filed__date=current_date
                ).count()

                approved = DCF.objects.filter(
                    status='approved',
                    date_filed__date=current_date
                ).count()

                rejected = DCF.objects.filter(
                    status='rejected',
                    date_filed__date=current_date
                ).count()

            on_process_data.append(on_process)
            approved_data.append(approved)
            rejected_data.append(rejected)

        data = {
            'labels': days,
            'datasets': [
                {
                    'label': 'On Process',
                    'data': on_process_data,
                    'backgroundColor': 'rgba(255, 193, 7, 0.2)',
                    'borderColor': 'rgba(255, 193, 7, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(255, 193, 7, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                },
                {
                    'label': 'Approved',
                    'data': approved_data,
                    'backgroundColor': 'rgba(76, 175, 80, 0.2)',
                    'borderColor': 'rgba(76, 175, 80, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(76, 175, 80, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                },
                {
                    'label': 'Rejected',
                    'data': rejected_data,
                    'backgroundColor': 'rgba(244, 67, 54, 0.2)',
                    'borderColor': 'rgba(244, 67, 54, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(244, 67, 54, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                }
            ]
        }

    elif period == 'quarterly':
        # Get data for each month of the year
        months = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December']

        on_process_data = []
        approved_data = []
        rejected_data = []

        current_year = today.year

        # Generate data for each month
        for i in range(1, 13):
            start_date = datetime.date(current_year, i, 1)
            end_date = (datetime.date(current_year, i + 1, 1) if i < 12
                       else datetime.date(current_year + 1, 1, 1))

            # Filter by user if requested
            if user_only and check_dcf_requestor(request.user):
                on_process = DCF.objects.filter(
                    requisitioner=request.user,
                    status='on_process',
                    date_filed__gte=start_date,
                    date_filed__lt=end_date
                ).count()

                approved = DCF.objects.filter(
                    requisitioner=request.user,
                    status='approved',
                    date_filed__gte=start_date,
                    date_filed__lt=end_date
                ).count()

                rejected = DCF.objects.filter(
                    requisitioner=request.user,
                    status='rejected',
                    date_filed__gte=start_date,
                    date_filed__lt=end_date
                ).count()
            else:
                on_process = DCF.objects.filter(
                    status='on_process',
                    date_filed__gte=start_date,
                    date_filed__lt=end_date
                ).count()

                approved = DCF.objects.filter(
                    status='approved',
                    date_filed__gte=start_date,
                    date_filed__lt=end_date
                ).count()

                rejected = DCF.objects.filter(
                    status='rejected',
                    date_filed__gte=start_date,
                    date_filed__lt=end_date
                ).count()

            on_process_data.append(on_process)
            approved_data.append(approved)
            rejected_data.append(rejected)

        data = {
            'labels': months,
            'datasets': [
                {
                    'label': 'On Process',
                    'data': on_process_data,
                    'backgroundColor': 'rgba(255, 193, 7, 0.2)',
                    'borderColor': 'rgba(255, 193, 7, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(255, 193, 7, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                },
                {
                    'label': 'Approved',
                    'data': approved_data,
                    'backgroundColor': 'rgba(76, 175, 80, 0.2)',
                    'borderColor': 'rgba(76, 175, 80, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(76, 175, 80, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                },
                {
                    'label': 'Rejected',
                    'data': rejected_data,
                    'backgroundColor': 'rgba(244, 67, 54, 0.2)',
                    'borderColor': 'rgba(244, 67, 54, 1)',
                    'borderWidth': 2,
                    'tension': 0.4,
                    'fill': True,
                    'pointBackgroundColor': 'rgba(244, 67, 54, 1)',
                    'pointBorderColor': '#fff',
                    'pointBorderWidth': 2,
                    'pointRadius': 5,
                    'pointHoverRadius': 7
                }
            ]
        }
    else:
        # Default to weekly view if period is not recognized
        return JsonResponse({'error': 'Invalid period specified'}, status=400)

    return JsonResponse(data)