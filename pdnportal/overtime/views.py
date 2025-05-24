import json
import logging
import traceback
from datetime import datetime, time, timedelta
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.http import require_POST, require_GET
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from portalusers.models import Users
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from .models import (
    Employee, EmployeeGroup, OTFiling, ShiftingOT, DailyOT,
    EmployeeOTStatus, LateFilingPassword, SystemActivity
)
from .forms import (
    EmployeeForm, EmployeeGroupForm, ShuttleAssignmentForm,
    ShiftingOTForm, DailyOTForm, LateFilingPasswordForm, ExcelImportForm
)
from .utils import is_late_filing, proper_case, create_system_activity

logger = logging.getLogger(__name__)



# Main View
@login_required
def overtime_view(request):
    """Main view for overtime management"""
    # Default context
    context = {
        'total_ot_hours': 0,
        'employees_on_ot': 0,
        'pending_requests': 0,
        'completed_ot': 0,
    }

    # Get current month statistics
    current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0)

    # Define helper function for formatting OT filings
    def format_ot_for_history(filing):
        """Format OT filing for history display"""
        result = {
            'id': filing.filing_id,
            'type': 'Shifting' if filing.filing_type == 'SHIFTING' else 'Daily',
            'group': filing.group.name,
            'date': filing.date_created.strftime('%b %d, %Y'),
            'employee_count': EmployeeOTStatus.objects.filter(filing=filing).count(),
            'ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='OT').count(),
            'not_ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='NOT-OT').count(),
        }

        # Add type-specific info
        if filing.filing_type == 'SHIFTING':
            shifting = filing.shifting_details
            result['shift_type'] = shifting.shift_type
        else:
            daily = filing.daily_details
            result['schedule_type'] = daily.get_schedule_type_display()

        return result

    if request.user.overtime_requestor:
        # For requestor, show their groups and OT history
        employee_groups = EmployeeGroup.objects.filter(created_by=request.user)
        ot_history = OTFiling.objects.filter(requestor=request.user).order_by('-date_created')[:10]

        # Get all active employees for the employee selection in the group modal
        employees = Employee.objects.filter(is_active=True).order_by('name')

        context.update({
            'employee_groups': employee_groups,
            'ot_history': [format_ot_for_history(filing) for filing in ot_history],
            'employees': employees,
        })

    if request.user.overtime_supervisor:
        # For supervisor, show requestors they supervise
        from django.apps import apps
        UsersApprovers = apps.get_model('portalusers', 'UsersApprovers')

        # Get requestors supervised by this user
        supervised_users = UsersApprovers.objects.filter(
            approver=request.user,
            module='Overtime',
            approver_role='Checker'
        ).values_list('user', flat=True)

        requestors = Users.objects.filter(id__in=supervised_users, overtime_requestor=True)

        # Get OT statistics for these requestors
        this_month_filings = OTFiling.objects.filter(
            requestor__in=supervised_users,
            date_created__gte=current_month_start
        )

        ot_count = EmployeeOTStatus.objects.filter(
            filing__in=this_month_filings,
            status='OT'
        ).count()

        not_ot_count = EmployeeOTStatus.objects.filter(
            filing__in=this_month_filings,
            status='NOT-OT'
        ).count()

        absent_count = EmployeeOTStatus.objects.filter(
            filing__in=this_month_filings,
            status='ABSENT'
        ).count()

        leave_count = EmployeeOTStatus.objects.filter(
            filing__in=this_month_filings,
            status='LEAVE'
        ).count()

        # Format requestors data
        requestors_data = []
        for requestor in requestors:
            requestor_filings = OTFiling.objects.filter(requestor=requestor)
            requestor_data = {
                'id': requestor.id,
                'name': requestor.name,
                'avatar': requestor.avatar.url if requestor.avatar else None,
                'line': str(requestor.line) if requestor.line else '-',
                'ot_count': EmployeeOTStatus.objects.filter(filing__in=requestor_filings, status='OT').count(),
                'not_ot_count': EmployeeOTStatus.objects.filter(filing__in=requestor_filings, status='NOT-OT').count(),
                'total_requests': requestor_filings.count(),
                'shifted_count': requestor_filings.filter(filing_type='SHIFTING').count(),
                'daily_count': requestor_filings.filter(filing_type='DAILY').count(),
                'recent_filings': [format_ot_for_history(filing) for filing in requestor_filings.order_by('-date_created')[:5]]
            }
            requestors_data.append(requestor_data)

        context.update({
            'requestors': requestors_data,
            'ot_count': ot_count,
            'not_ot_count': not_ot_count,
            'absent_count': absent_count,
            'leave_count': leave_count,
        })

    if request.user.overtime_allocator:
        # For allocator, show employee shuttle statistics
        employees = Employee.objects.all()
        assigned_count = employees.exclude(shuttle_service__isnull=True).exclude(shuttle_service='').count()
        unassigned_count = employees.count() - assigned_count

        context.update({
            'employees': employees,
            'assigned_count': assigned_count,
            'unassigned_count': unassigned_count,
        })

    if request.user.is_admin:
        # For admin/importer, show departments and lines
        departments = Employee.objects.values_list('department', flat=True).distinct()
        departments = [d for d in departments if d]  # Filter out None values

        lines = Employee.objects.values_list('line', flat=True).distinct()
        lines = [l for l in lines if l]  # Filter out None values

        # For facilitator, show password info and activity log
        # Get or create password records
        def get_or_create_password(password_type):
            try:
                return LateFilingPassword.objects.get(password_type=password_type)
            except LateFilingPassword.DoesNotExist:
                # Create with default password
                defaults = {
                    'SHIFTING': 'shifting123',
                    'DAILY': 'daily123',
                    'WEEKEND': 'weekend123',
                    'HOLIDAY': 'holiday123'
                }
                return LateFilingPassword.objects.create(
                    password_type=password_type,
                    password=defaults.get(password_type, 'password123')
                )

        passwords = {
            'shifting': get_or_create_password('SHIFTING').password,
            'daily': get_or_create_password('DAILY').password,
            'weekend': get_or_create_password('WEEKEND').password,
            'holiday': get_or_create_password('HOLIDAY').password,
        }

        recent_activities = SystemActivity.objects.all().order_by('-timestamp')[:10]

        # Format activity for display
        def format_activity(activity):
            return {
                'type': activity.activity_type.lower(),
                'description': activity.description,
                'user': activity.user.name,
                'timestamp': activity.timestamp.strftime('%b %d, %Y %H:%M')
            }

        context.update({
            'departments': departments,
            'lines': lines,
            'passwords': passwords,
            'activities': [format_activity(activity) for activity in recent_activities],
        })

    # Get current date for today's statistics
    current_date = timezone.now().date()

    # Update main statistics
    context.update({
        'total_ot_hours': EmployeeOTStatus.objects.filter(
            status='OT',
            filing__date_created__gte=current_month_start
        ).count(),
        'employees_on_ot_today': EmployeeOTStatus.objects.filter(
            status='OT',
            filing__date_created__date=current_date
        ).values('employee').distinct().count(),
        'employees_not_ot_today': EmployeeOTStatus.objects.filter(
            status='NOT-OT',
            filing__date_created__date=current_date
        ).values('employee').distinct().count(),
        'absent_employees_today': EmployeeOTStatus.objects.filter(
            status='ABSENT',
            filing__date_created__date=current_date
        ).values('employee').distinct().count(),
    })

    return render(request, 'overtime/overtime.html', context)


# API Endpoints for Employee Groups
@login_required
@require_POST
def create_employee_group(request):
    """Create a new employee group"""
    try:
        data = json.loads(request.body)

        # Create form with data
        form = EmployeeGroupForm(data, user=request.user)

        if form.is_valid():
            group = form.save()

            # Return success response
            return JsonResponse({
                'id': group.id,
                'name': group.name,
                'employee_count': group.employees.count(),
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error creating employee group: {str(e)}")
        return JsonResponse({'error': 'Failed to create employee group'}, status=500)


@login_required
def get_employee_group(request, group_id):
    """Get employee group details"""
    try:
        group = get_object_or_404(EmployeeGroup, id=group_id)

        # Check permissions
        if not request.user.is_admin and group.created_by != request.user:
            return JsonResponse({'error': 'You do not have permission to view this group'}, status=403)

        # Format response
        employees = []
        for employee in group.employees.all():
            employees.append({
                'id': employee.id,
                'id_number': employee.id_number,
                'name': employee.name,
                'department': employee.department or '',
                'line': employee.line or '',
            })

        return JsonResponse({
            'id': group.id,
            'name': group.name,
            'employees': employees,
            'created_by': group.created_by.username,
            'date_created': group.date_created.strftime('%Y-%m-%d'),
        })

    except Exception as e:
        logger.error(f"Error getting employee group: {str(e)}")
        return JsonResponse({'error': 'Failed to get employee group'}, status=500)


@login_required
@require_POST
def update_employee_group(request, group_id):
    """Update an existing employee group"""
    try:
        group = get_object_or_404(EmployeeGroup, id=group_id)

        # Check permissions
        if not request.user.is_admin and group.created_by != request.user:
            return JsonResponse({'error': 'You do not have permission to update this group'}, status=403)

        data = json.loads(request.body)

        # Create form with data
        form = EmployeeGroupForm(data, instance=group, user=request.user)

        if form.is_valid():
            group = form.save()

            # Return success response
            return JsonResponse({
                'id': group.id,
                'name': group.name,
                'employee_count': group.employees.count(),
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error updating employee group: {str(e)}")
        return JsonResponse({'error': 'Failed to update employee group'}, status=500)


@login_required
@require_POST
def delete_employee_group(request, group_id):
    """Delete an employee group"""
    try:
        group = get_object_or_404(EmployeeGroup, id=group_id)

        # Check permissions
        if not request.user.is_admin and group.created_by != request.user:
            return JsonResponse({'error': 'You do not have permission to delete this group'}, status=403)

        # Check if group is used in any OT filings
        if OTFiling.objects.filter(group=group).exists():
            return JsonResponse({
                'error': 'This group cannot be deleted because it is used in one or more OT filings'
            }, status=400)

        # Delete group
        group.delete()

        return JsonResponse({'success': True})

    except Exception as e:
        logger.error(f"Error deleting employee group: {str(e)}")
        return JsonResponse({'error': 'Failed to delete employee group'}, status=500)


# API Endpoints for Employees
@login_required
@user_passes_test(lambda u: u.is_admin)
def employee_list(request):
    """Get list of employees"""
    try:
        employees = Employee.objects.all()

        # Apply filters if provided
        department = request.GET.get('department')
        if department and department != 'all':
            employees = employees.filter(department=department)

        line = request.GET.get('line')
        if line and line != 'all':
            employees = employees.filter(line=line)

        # Apply search if provided
        search = request.GET.get('search')
        if search:
            employees = employees.filter(
                Q(id_number__icontains=search) |
                Q(name__icontains=search)
            )

        # Format response
        employee_list = []
        for employee in employees:
            employee_list.append({
                'id': employee.id,
                'id_number': employee.id_number,
                'name': employee.name,
                'department': employee.department or '',
                'line': employee.line or '',
                'date_added': employee.date_added.strftime('%Y-%m-%d'),
            })

        return JsonResponse({'employees': employee_list})

    except Exception as e:
        logger.error(f"Error getting employee list: {str(e)}")
        return JsonResponse({'error': 'Failed to get employee list'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
@require_POST
def create_employee(request):
    """Create a new employee"""
    try:
        data = json.loads(request.body)

        # Create form with data
        form = EmployeeForm(data)

        if form.is_valid():
            employee = form.save()

            # Create system activity log
            create_system_activity(
                request.user,
                'OTHER',
                f"Added new employee: {employee.id_number} - {employee.name}"
            )

            # Return success response
            return JsonResponse({
                'id': employee.id,
                'id_number': employee.id_number,
                'name': employee.name,
                'department': employee.department or '',
                'line': employee.line or '',
                'date_added': employee.date_added.strftime('%Y-%m-%d'),
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        return JsonResponse({'error': 'Failed to create employee'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
def get_employee(request, employee_id):
    """Get employee details"""
    try:
        employee = get_object_or_404(Employee, id=employee_id)

        return JsonResponse({
            'id': employee.id,
            'id_number': employee.id_number,
            'name': employee.name,
            'department': employee.department or '',
            'line': employee.line or '',
            'shuttle_service': employee.shuttle_service or '',
            'date_added': employee.date_added.strftime('%Y-%m-%d'),
            'is_active': employee.is_active,
        })

    except Exception as e:
        logger.error(f"Error getting employee: {str(e)}")
        return JsonResponse({'error': 'Failed to get employee'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
@require_POST
def update_employee(request, employee_id):
    """Update an existing employee"""
    try:
        employee = get_object_or_404(Employee, id=employee_id)

        data = json.loads(request.body)

        # Create form with data
        form = EmployeeForm(data, instance=employee)

        if form.is_valid():
            employee = form.save()

            # Create system activity log
            create_system_activity(
                request.user,
                'OTHER',
                f"Updated employee: {employee.id_number} - {employee.name}"
            )

            # Return success response
            return JsonResponse({
                'id': employee.id,
                'id_number': employee.id_number,
                'name': employee.name,
                'department': employee.department or '',
                'line': employee.line or '',
                'date_added': employee.date_added.strftime('%Y-%m-%d'),
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error updating employee: {str(e)}")
        return JsonResponse({'error': 'Failed to update employee'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
@require_POST
def delete_employee(request, employee_id):
    """Delete an employee"""
    try:
        employee = get_object_or_404(Employee, id=employee_id)

        # Check if employee is used in any OT filings
        if EmployeeOTStatus.objects.filter(employee=employee).exists():
            # Instead of deleting, mark as inactive
            employee.is_active = False
            employee.save()

            # Create system activity log
            create_system_activity(
                request.user,
                'OTHER',
                f"Deactivated employee: {employee.id_number} - {employee.name}"
            )

            return JsonResponse({'success': True, 'message': 'Employee marked as inactive'})
        else:
            # Delete employee
            employee_info = f"{employee.id_number} - {employee.name}"
            employee.delete()

            # Create system activity log
            create_system_activity(
                request.user,
                'OTHER',
                f"Deleted employee: {employee_info}"
            )

            return JsonResponse({'success': True})

    except Exception as e:
        logger.error(f"Error deleting employee: {str(e)}")
        return JsonResponse({'error': 'Failed to delete employee'}, status=500)


# Shuttle Allocator Endpoints
@login_required
@user_passes_test(lambda u: u.overtime_allocator)
@require_POST
def shuttle_assignment(request):
    """Assign shuttle service to an employee"""
    try:
        data = json.loads(request.body)

        # Create form with data
        form = ShuttleAssignmentForm(data)

        if form.is_valid():
            employee_id = form.cleaned_data['employee_id']
            shuttle_service = form.cleaned_data['shuttle_service']

            employee = get_object_or_404(Employee, id=employee_id)
            employee.shuttle_service = shuttle_service
            employee.save()

            # Create system activity log
            if shuttle_service:
                activity_desc = f"Assigned shuttle service '{shuttle_service}' to employee: {employee.id_number} - {employee.name}"
            else:
                activity_desc = f"Removed shuttle service from employee: {employee.id_number} - {employee.name}"

            create_system_activity(request.user, 'OTHER', activity_desc)

            # Return success response
            return JsonResponse({
                'success': True,
                'employee_id': employee.id,
                'shuttle_service': employee.shuttle_service or '',
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error assigning shuttle service: {str(e)}")
        return JsonResponse({'error': 'Failed to assign shuttle service'}, status=500)


@login_required
@user_passes_test(lambda u: u.overtime_allocator)
@require_POST
def import_shuttle(request):
    """Import shuttle assignments from Excel file"""
    try:
        form = ExcelImportForm(request.POST, request.FILES)

        if form.is_valid():
            excel_file = request.FILES['file']

            # Process Excel file
            wb = openpyxl.load_workbook(excel_file)
            sheet = wb.active

            # Validate headers (case insensitive)
            headers = [cell.value.lower() if cell.value else '' for cell in sheet[1]]

            if 'id number' not in headers and 'shuttle service' not in headers:
                return JsonResponse({
                    'error': 'Invalid file format. File must contain "ID Number" and "Shuttle Service" columns.'
                }, status=400)

            # Find column indices
            id_col = headers.index('id number')
            shuttle_col = headers.index('shuttle service')

            # Process rows
            updated_count = 0
            total_rows = sheet.max_row - 1  # Exclude header

            for row in range(2, sheet.max_row + 1):
                id_number = str(sheet.cell(row=row, column=id_col + 1).value)
                shuttle_service = sheet.cell(row=row, column=shuttle_col + 1).value

                if id_number:
                    # Try to find employee
                    try:
                        employee = Employee.objects.get(id_number=id_number)
                        employee.shuttle_service = shuttle_service or ''
                        employee.save()
                        updated_count += 1
                    except Employee.DoesNotExist:
                        pass  # Skip if employee not found

            # Create system activity log
            create_system_activity(
                request.user,
                'OTHER',
                f"Imported shuttle assignments from Excel file. Updated {updated_count} out of {total_rows} employees."
            )

            return JsonResponse({
                'success': True,
                'total_count': total_rows,
                'updated_count': updated_count,
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error importing shuttle data: {str(e)}")
        return JsonResponse({'error': 'Failed to import shuttle data'}, status=500)


# Employee Importer Endpoints
@login_required
@user_passes_test(lambda u: u.is_admin)
@require_POST
def import_employees(request):
    """Import employees from Excel file"""
    try:
        form = ExcelImportForm(request.POST, request.FILES)

        if form.is_valid():
            excel_file = request.FILES['file']

            # Process Excel file
            wb = openpyxl.load_workbook(excel_file)
            sheet = wb.active

            # Validate headers (case insensitive)
            headers = [cell.value.lower() if cell.value else '' for cell in sheet[1]]

            required_headers = ['id number', 'employee name']
            for header in required_headers:
                if header not in headers:
                    return JsonResponse({
                        'error': f'Invalid file format. File must contain "{header.title()}" column.'
                    }, status=400)

            # Find column indices
            id_col = headers.index('id number')
            name_col = headers.index('employee name')
            dept_col = headers.index('department') if 'department' in headers else None
            line_col = headers.index('line') if 'line' in headers else None

            # Process rows
            created_count = 0
            updated_count = 0
            total_rows = sheet.max_row - 1  # Exclude header

            for row in range(2, sheet.max_row + 1):
                id_number = str(sheet.cell(row=row, column=id_col + 1).value).strip()
                name = str(sheet.cell(row=row, column=name_col + 1).value).strip()

                if id_number and name:
                    # Convert name to proper case
                    name = proper_case(name)

                    # Get department and line if available
                    department = None
                    if dept_col is not None:
                        department = sheet.cell(row=row, column=dept_col + 1).value

                    line = None
                    if line_col is not None:
                        line = sheet.cell(row=row, column=line_col + 1).value

                    # Try to find employee for update, otherwise create new
                    employee, created = Employee.objects.update_or_create(
                        id_number=id_number,
                        defaults={
                            'name': name,
                            'department': department,
                            'line': line,
                            'is_active': True,
                        }
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

            # Create system activity log
            create_system_activity(
                request.user,
                'OTHER',
                f"Imported employees from Excel file. Created {created_count} and updated {updated_count} out of {total_rows} employees."
            )

            return JsonResponse({
                'success': True,
                'total_count': total_rows,
                'created_count': created_count,
                'updated_count': updated_count,
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error importing employees: {str(e)}")
        return JsonResponse({'error': 'Failed to import employees'}, status=500)


# OT Filing Endpoints
@login_required
@user_passes_test(lambda u: u.overtime_requestor)
@require_POST
def submit_shifting_ot(request):
    """Submit shifting overtime request"""
    try:
        # Log the request body for debugging
        logger.debug(f"Request body: {request.body}")

        # Parse the JSON data
        try:
            data = json.loads(request.body)
            logger.debug(f"Parsed data: {data}")
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {str(e)}")
            return JsonResponse({'error': f'Invalid JSON format: {str(e)}'}, status=400)

        # Check if late filing
        try:
            # Try to get the start date from either field name
            start_date_str = data.get('startDate') or data.get('start_date')

            if not start_date_str:
                logger.error("Start date is missing from request data")
                return JsonResponse({'error': 'Start date is required'}, status=400)

            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            late_filing = is_late_filing('SHIFTING', start_date)
        except (ValueError, TypeError) as e:
            logger.error(f"Error parsing date: {str(e)}")
            return JsonResponse({'error': f'Invalid date format: {str(e)}'}, status=400)

        # Create form with data
        form_data = {
            'group_id': data.get('groupId'),
            'start_date': data.get('startDate') or data.get('start_date'),
            'end_date': data.get('endDate') or data.get('end_date'),
            'shift_type': data.get('shiftType') or data.get('shift_type'),
            'employee_statuses': json.dumps(data.get('employees', [])),
            'late_filing_password': data.get('lateFilingPassword') or data.get('late_filing_password', ''),
        }

        form = ShiftingOTForm(form_data, user=request.user, late_filing=late_filing)

        if form.is_valid():
            with transaction.atomic():
                # Create OT Filing record
                filing = OTFiling.objects.create(
                    filing_type='SHIFTING',
                    group_id=form.cleaned_data['group_id'],
                    requestor=request.user,
                    status='PENDING'
                )

                # Create ShiftingOT record
                shifting_ot = ShiftingOT.objects.create(
                    filing=filing,
                    start_date=form.cleaned_data['start_date'],
                    end_date=form.cleaned_data['end_date'],
                    shift_type=form.cleaned_data['shift_type']
                )

                # Create employee status records
                employee_data = form.cleaned_data['employee_statuses']

                # Check if employee_data is already a list or needs to be parsed from JSON
                if isinstance(employee_data, str):
                    try:
                        employee_data = json.loads(employee_data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Error parsing employee_statuses JSON: {str(e)}")
                        raise ValueError(f"Invalid employee_statuses format: {str(e)}")

                for emp in employee_data:
                    employee = Employee.objects.get(id=emp['id'])
                    EmployeeOTStatus.objects.create(
                        filing=filing,
                        employee=employee,
                        status=emp['status']
                    )

                # Create system activity log
                create_system_activity(
                    request.user,
                    'OTHER',
                    f"Created Shifting OT filing: {filing.filing_id} for {filing.group.name} ({shifting_ot.start_date} to {shifting_ot.end_date})"
                )

            # Format OT filing for history display
            def format_ot_for_history(filing):
                result = {
                    'id': filing.filing_id,
                    'type': 'Shifting' if filing.filing_type == 'SHIFTING' else 'Daily',
                    'group': filing.group.name,
                    'date': filing.date_created.strftime('%b %d, %Y'),
                    'employee_count': EmployeeOTStatus.objects.filter(filing=filing).count(),
                    'ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='OT').count(),
                    'not_ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='NOT-OT').count(),
                }

                # Add type-specific info
                if filing.filing_type == 'SHIFTING':
                    shifting = filing.shifting_details
                    result['shift_type'] = shifting.shift_type
                else:
                    daily = filing.daily_details
                    result['schedule_type'] = daily.get_schedule_type_display()

                return result

            # Return success with filing details for history
            return JsonResponse({
                'success': True,
                'filing': format_ot_for_history(filing),
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error submitting shifting OT: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        return JsonResponse({'error': f'Failed to submit shifting OT request: {str(e)}'}, status=500)


@login_required
@user_passes_test(lambda u: u.overtime_requestor)
@require_POST
def submit_daily_ot(request):
    """Submit daily overtime request"""
    try:
        # Log the request body for debugging
        logger.debug(f"Request body: {request.body}")

        # Parse the JSON data
        try:
            data = json.loads(request.body)
            logger.debug(f"Parsed data: {data}")
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {str(e)}")
            return JsonResponse({'error': f'Invalid JSON format: {str(e)}'}, status=400)

        # Check if late filing
        try:
            date_str = data.get('date')

            if not date_str:
                logger.error("Date is missing from request data")
                return JsonResponse({'error': 'Date is required'}, status=400)

            schedule_type = data.get('scheduleValue') or data.get('schedule_type')
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            late_filing = is_late_filing('DAILY', date_obj, schedule_type)
        except (ValueError, TypeError) as e:
            logger.error(f"Error parsing date: {str(e)}")
            return JsonResponse({'error': f'Invalid date format: {str(e)}'}, status=400)

        # Create form with data
        form_data = {
            'group_id': data.get('groupId'),
            'date': date_str,
            'schedule_type': schedule_type,
            'start_time': data.get('startTime') or data.get('start_time'),
            'end_time': data.get('endTime') or data.get('end_time'),
            'reason': data.get('reason'),
            'employee_statuses': json.dumps(data.get('employees', [])),
            'late_filing_password': data.get('lateFilingPassword') or data.get('late_filing_password', ''),
        }

        form = DailyOTForm(form_data, user=request.user, late_filing=late_filing)

        if form.is_valid():
            with transaction.atomic():
                # Create OT Filing record
                filing = OTFiling.objects.create(
                    filing_type='DAILY',
                    group_id=form.cleaned_data['group_id'],
                    requestor=request.user,
                    status='PENDING'
                )

                # Create DailyOT record
                daily_ot = DailyOT.objects.create(
                    filing=filing,
                    date=form.cleaned_data['date'],
                    schedule_type=form.cleaned_data['schedule_type'],
                    start_time=form.cleaned_data['start_time'],
                    end_time=form.cleaned_data['end_time'],
                    reason=form.cleaned_data['reason']
                )

                # Create employee status records
                employee_data = form.cleaned_data['employee_statuses']

                # Check if employee_data is already a list or needs to be parsed from JSON
                if isinstance(employee_data, str):
                    try:
                        employee_data = json.loads(employee_data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Error parsing employee_statuses JSON: {str(e)}")
                        raise ValueError(f"Invalid employee_statuses format: {str(e)}")

                for emp in employee_data:
                    employee = Employee.objects.get(id=emp['id'])
                    EmployeeOTStatus.objects.create(
                        filing=filing,
                        employee=employee,
                        status=emp['status']
                    )

                # Create system activity log
                create_system_activity(
                    request.user,
                    'OTHER',
                    f"Created Daily OT filing: {filing.filing_id} for {filing.group.name} ({daily_ot.date}, {daily_ot.get_schedule_type_display()})"
                )

            # Format OT filing for history display
            def format_ot_for_history(filing):
                result = {
                    'id': filing.filing_id,
                    'type': 'Shifting' if filing.filing_type == 'SHIFTING' else 'Daily',
                    'group': filing.group.name,
                    'date': filing.date_created.strftime('%b %d, %Y'),
                    'employee_count': EmployeeOTStatus.objects.filter(filing=filing).count(),
                    'ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='OT').count(),
                    'not_ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='NOT-OT').count(),
                }

                # Add type-specific info
                if filing.filing_type == 'SHIFTING':
                    shifting = filing.shifting_details
                    result['shift_type'] = shifting.shift_type
                else:
                    daily = filing.daily_details
                    result['schedule_type'] = daily.get_schedule_type_display()

                return result

            # Return success with filing details for history
            return JsonResponse({
                'success': True,
                'filing': format_ot_for_history(filing),
            })
        else:
            # Return validation errors
            return JsonResponse({'errors': form.errors}, status=400)

    except Exception as e:
        logger.error(f"Error submitting daily OT: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        return JsonResponse({'error': f'Failed to submit daily OT request: {str(e)}'}, status=500)


@login_required
def get_ot_details(request, filing_id):
    """Get details of an OT filing"""
    try:
        filing = get_object_or_404(OTFiling, filing_id=filing_id)

        result = {
            'id': filing.filing_id,
            'type': filing.get_filing_type_display(),
            'group': filing.group.name,
            'requestor': filing.requestor.name,
            'status': filing.status,
            'date': filing.date_created.strftime('%b %d, %Y'),
            'filing_date': filing.date_created.strftime('%Y-%m-%d %H:%M:%S'),
            'employees': []
        }

        # Get type-specific details
        if filing.filing_type == 'SHIFTING':
            shifting = filing.shifting_details
            result.update({
                'start_date': shifting.start_date.strftime('%b %d, %Y'),
                'end_date': shifting.end_date.strftime('%b %d, %Y'),
                'shift_type': shifting.shift_type
            })
        else:
            daily = filing.daily_details
            result.update({
                'date': daily.date.strftime('%b %d, %Y'),
                'schedule_type': daily.get_schedule_type_display(),
                'start_time': daily.start_time.strftime('%I:%M %p'),
                'end_time': daily.end_time.strftime('%I:%M %p'),
                'reason': daily.reason
            })

        # Get employee statuses
        employee_statuses = EmployeeOTStatus.objects.filter(filing=filing).select_related('employee')

        for status in employee_statuses:
            employee = status.employee
            result['employees'].append({
                'id': employee.id,
                'id_number': employee.id_number,
                'name': employee.name,
                'department': employee.department or '-',
                'line': employee.line or '-',
                'status': status.get_status_display(),
                'shuttle_service': employee.shuttle_service or 'Not Assigned'
            })

        return JsonResponse(result)

    except Exception as e:
        logger.error(f"Error getting OT details: {str(e)}")
        return JsonResponse({'error': 'Failed to get OT details'}, status=500)


# Analytics Endpoints
@login_required
@user_passes_test(lambda u: u.overtime_checker)
def get_analytics(request):
    """Get overtime analytics data"""
    try:
        period = request.GET.get('period', '3M')

        # Determine date range based on period
        end_date = timezone.now()

        if period == '3M':
            start_date = end_date - timedelta(days=90)
        elif period == '6M':
            start_date = end_date - timedelta(days=180)
        elif period == 'QTR':
            # Current quarter
            quarter = (end_date.month - 1) // 3 + 1
            start_date = timezone.datetime(end_date.year, (quarter - 1) * 3 + 1, 1)
        else:
            # Default to 3 months
            start_date = end_date - timedelta(days=90)

        # Get supervised requestors
        from django.apps import apps
        UsersApprovers = apps.get_model('portalusers', 'UsersApprovers')

        supervised_users = UsersApprovers.objects.filter(
            approver=request.user,
            module='Overtime',
            approver_role='Checker'
        ).values_list('user', flat=True)

        # Get filings for these requestors in date range
        filings = OTFiling.objects.filter(
            requestor__in=supervised_users,
            date_created__gte=start_date,
            date_created__lte=end_date
        )

        # Prepare summary data
        ot_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='OT').count()
        not_ot_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='NOT-OT').count()
        absent_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='ABSENT').count()
        leave_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='LEAVE').count()

        # Prepare chart data - group by month or week
        labels = []
        ot_data = []
        not_ot_data = []
        absent_data = []
        leave_data = []

        if period == 'QTR':
            # Group by weeks for quarterly view
            current_date = start_date
            week_number = 1

            while current_date <= end_date:
                week_end = min(current_date + timedelta(days=6), end_date)

                week_filings = filings.filter(
                    date_created__gte=current_date,
                    date_created__lte=week_end
                )

                labels.append(f"Week {week_number}")
                ot_data.append(EmployeeOTStatus.objects.filter(filing__in=week_filings, status='OT').count())
                not_ot_data.append(EmployeeOTStatus.objects.filter(filing__in=week_filings, status='NOT-OT').count())
                absent_data.append(EmployeeOTStatus.objects.filter(filing__in=week_filings, status='ABSENT').count())
                leave_data.append(EmployeeOTStatus.objects.filter(filing__in=week_filings, status='LEAVE').count())

                current_date += timedelta(days=7)
                week_number += 1
        else:
            # Group by months
            current_date = start_date.replace(day=1)

            while current_date <= end_date:
                next_month = current_date.month + 1 if current_date.month < 12 else 1
                next_year = current_date.year + 1 if current_date.month == 12 else current_date.year
                month_end = timezone.datetime(next_year, next_month, 1) - timedelta(days=1)

                month_filings = filings.filter(
                    date_created__gte=current_date,
                    date_created__lte=month_end
                )

                labels.append(current_date.strftime('%b %Y'))
                ot_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='OT').count())
                not_ot_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='NOT-OT').count())
                absent_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='ABSENT').count())
                leave_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='LEAVE').count())

                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        return JsonResponse({
            'summary': {
                'ot_count': ot_count,
                'not_ot_count': not_ot_count,
                'absent_count': absent_count,
                'leave_count': leave_count,
            },
            'chart': {
                'labels': labels,
                'ot_data': ot_data,
                'not_ot_data': not_ot_data,
                'absent_data': absent_data,
                'leave_data': leave_data,
            }
        })

    except Exception as e:
        logger.error(f"Error getting analytics data: {str(e)}")
        return JsonResponse({'error': 'Failed to get analytics data'}, status=500)


@login_required
def get_employee_status_chart(request):
    """Get employee status distribution data for charts"""
    try:
        period = request.GET.get('period', 'month')

        # Determine date range based on period
        end_date = timezone.now()

        if period == 'week':
            # Last 7 days
            start_date = end_date - timedelta(days=7)
            date_format = '%d'  # Day of month
            delta = timedelta(days=1)
        elif period == 'month':
            # Current month
            start_date = end_date.replace(day=1)
            date_format = '%d'  # Day of month
            delta = timedelta(days=1)
        elif period == 'quarter':
            # Last 3 months
            start_date = end_date - timedelta(days=90)
            date_format = '%b'  # Month abbreviation
            # For quarterly view, we'll group by month
            current_date = start_date.replace(day=1)
            labels = []
            ot_data = []
            not_ot_data = []
            absent_data = []
            leave_data = []

            while current_date <= end_date:
                next_month = current_date.month + 1 if current_date.month < 12 else 1
                next_year = current_date.year + 1 if current_date.month == 12 else current_date.year
                month_end = timezone.datetime(next_year, next_month, 1) - timedelta(days=1)

                # Get all filings for this month
                month_filings = OTFiling.objects.filter(
                    date_created__gte=current_date,
                    date_created__lte=month_end
                )

                # Get status counts
                labels.append(current_date.strftime('%b'))
                ot_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='OT').count())
                not_ot_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='NOT-OT').count())
                absent_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='ABSENT').count())
                leave_data.append(EmployeeOTStatus.objects.filter(filing__in=month_filings, status='LEAVE').count())

                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

            return JsonResponse({
                'labels': labels,
                'datasets': [
                    {
                        'label': 'OT',
                        'data': ot_data,
                        'backgroundColor': 'rgba(76, 175, 80, 0.2)',
                        'borderColor': 'rgba(76, 175, 80, 1)',
                        'borderWidth': 2,
                        'fill': True,
                        'tension': 0.4
                    },
                    {
                        'label': 'Not OT',
                        'data': not_ot_data,
                        'backgroundColor': 'rgba(33, 150, 243, 0.2)',
                        'borderColor': 'rgba(33, 150, 243, 1)',
                        'borderWidth': 2,
                        'fill': True,
                        'tension': 0.4
                    },
                    {
                        'label': 'Absent',
                        'data': absent_data,
                        'backgroundColor': 'rgba(244, 67, 54, 0.2)',
                        'borderColor': 'rgba(244, 67, 54, 1)',
                        'borderWidth': 2,
                        'fill': True,
                        'tension': 0.4
                    },
                    {
                        'label': 'Leave',
                        'data': leave_data,
                        'backgroundColor': 'rgba(156, 39, 176, 0.2)',
                        'borderColor': 'rgba(156, 39, 176, 1)',
                        'borderWidth': 2,
                        'fill': True,
                        'tension': 0.4
                    }
                ]
            })

        # For week and month views, we'll generate daily data points
        labels = []
        ot_data = []
        not_ot_data = []
        absent_data = []
        leave_data = []

        current_date = start_date
        while current_date <= end_date:
            # Get all filings for this day
            day_start = timezone.datetime.combine(current_date, time.min)
            day_end = timezone.datetime.combine(current_date, time.max)

            day_filings = OTFiling.objects.filter(
                date_created__gte=day_start,
                date_created__lte=day_end
            )

            # Get status counts
            labels.append(current_date.strftime(date_format))
            ot_data.append(EmployeeOTStatus.objects.filter(filing__in=day_filings, status='OT').count())
            not_ot_data.append(EmployeeOTStatus.objects.filter(filing__in=day_filings, status='NOT-OT').count())
            absent_data.append(EmployeeOTStatus.objects.filter(filing__in=day_filings, status='ABSENT').count())
            leave_data.append(EmployeeOTStatus.objects.filter(filing__in=day_filings, status='LEAVE').count())

            current_date += delta

        return JsonResponse({
            'labels': labels,
            'datasets': [
                {
                    'label': 'OT',
                    'data': ot_data,
                    'backgroundColor': 'rgba(76, 175, 80, 0.2)',
                    'borderColor': 'rgba(76, 175, 80, 1)',
                    'borderWidth': 2,
                    'fill': True,
                    'tension': 0.4
                },
                {
                    'label': 'Not OT',
                    'data': not_ot_data,
                    'backgroundColor': 'rgba(33, 150, 243, 0.2)',
                    'borderColor': 'rgba(33, 150, 243, 1)',
                    'borderWidth': 2,
                    'fill': True,
                    'tension': 0.4
                },
                {
                    'label': 'Absent',
                    'data': absent_data,
                    'backgroundColor': 'rgba(244, 67, 54, 0.2)',
                    'borderColor': 'rgba(244, 67, 54, 1)',
                    'borderWidth': 2,
                    'fill': True,
                    'tension': 0.4
                },
                {
                    'label': 'Leave',
                    'data': leave_data,
                    'backgroundColor': 'rgba(156, 39, 176, 0.2)',
                    'borderColor': 'rgba(156, 39, 176, 1)',
                    'borderWidth': 2,
                    'fill': True,
                    'tension': 0.4
                }
            ]
        })

    except Exception as e:
        logger.error(f"Error getting employee status chart data: {str(e)}")
        return JsonResponse({'error': 'Failed to get chart data'}, status=500)


@login_required
def get_recent_activity(request):
    """Get recent activity data for the activity feed"""
    try:
        # Get the most recent OT filings
        recent_filings = OTFiling.objects.filter(requestor=request.user).order_by('-date_created')[:10]

        activities = []
        for filing in recent_filings:
            activity = {
                'id': filing.filing_id,
                'type': 'Shifting' if filing.filing_type == 'SHIFTING' else 'Daily',
                'group': filing.group.name,
                'date': filing.date_created.strftime('%b %d, %Y'),
                'time': filing.date_created.strftime('%H:%M'),
                'requestor': filing.requestor.name,
                'status': filing.status,
                'employee_count': EmployeeOTStatus.objects.filter(filing=filing).count(),
            }

            # Add type-specific info
            if filing.filing_type == 'SHIFTING':
                shifting = filing.shifting_details
                activity['shift_type'] = shifting.shift_type
                activity['date_range'] = f"{shifting.start_date.strftime('%b %d')} - {shifting.end_date.strftime('%b %d')}"
            else:
                daily = filing.daily_details
                activity['schedule_type'] = daily.get_schedule_type_display()
                activity['ot_date'] = daily.date.strftime('%b %d')
                activity['time_range'] = f"{daily.start_time.strftime('%I:%M %p')} - {daily.end_time.strftime('%I:%M %p')}"

            activities.append(activity)

        return JsonResponse({'activities': activities})

    except Exception as e:
        logger.error(f"Error getting recent activity data: {str(e)}")
        return JsonResponse({'error': 'Failed to get activity data'}, status=500)


@login_required
@user_passes_test(lambda u: u.overtime_checker)
def get_requestor_analytics(request, requestor_id):
    """Get analytics for a specific requestor"""
    try:
        requestor = get_object_or_404(Users, id=requestor_id, overtime_requestor=True)

        # Check if current user supervises this requestor
        from django.apps import apps
        UsersApprovers = apps.get_model('portalusers', 'UsersApprovers')

        is_supervisor = UsersApprovers.objects.filter(
            approver=request.user,
            user=requestor,
            module='Overtime',
            approver_role='Checker'
        ).exists()

        if not request.user.is_admin and not is_supervisor:
            return JsonResponse({'error': 'You do not have permission to view this data'}, status=403)

        # Get all filings by this requestor
        filings = OTFiling.objects.filter(requestor=requestor)

        # Prepare summary data
        total_requests = filings.count()
        shifted_count = filings.filter(filing_type='SHIFTING').count()
        daily_count = filings.filter(filing_type='DAILY').count()

        ot_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='OT').count()
        not_ot_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='NOT-OT').count()
        absent_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='ABSENT').count()
        leave_count = EmployeeOTStatus.objects.filter(filing__in=filings, status='LEAVE').count()

        # Get recent filings
        recent_filings = filings.order_by('-date_created')[:10]

        # Format OT filing for history display
        def format_ot_for_history(filing):
            result = {
                'id': filing.filing_id,
                'type': 'Shifting' if filing.filing_type == 'SHIFTING' else 'Daily',
                'group': filing.group.name,
                'date': filing.date_created.strftime('%b %d, %Y'),
                'employee_count': EmployeeOTStatus.objects.filter(filing=filing).count(),
                'ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='OT').count(),
                'not_ot_count': EmployeeOTStatus.objects.filter(filing=filing, status='NOT-OT').count(),
            }

            # Add type-specific info
            if filing.filing_type == 'SHIFTING':
                shifting = filing.shifting_details
                result['shift_type'] = shifting.shift_type
            else:
                daily = filing.daily_details
                result['schedule_type'] = daily.get_schedule_type_display()

            return result

        return JsonResponse({
            'summary': {
                'total_requests': total_requests,
                'shifted_count': shifted_count,
                'daily_count': daily_count,
            },
            'status_count': {
                'ot': ot_count,
                'not_ot': not_ot_count,
                'absent': absent_count,
                'leave': leave_count,
            },
            'recent_filings': [format_ot_for_history(filing) for filing in recent_filings],
        })

    except Exception as e:
        logger.error(f"Error getting requestor analytics: {str(e)}")
        return JsonResponse({'error': 'Failed to get requestor analytics'}, status=500)


# Password Management Endpoints
@login_required
@user_passes_test(lambda u: u.is_admin)
@require_POST
def update_password(request):
    """Update late filing password"""
    try:
        data = json.loads(request.body)

        password_type = data.get('password_type')
        new_password = data.get('new_password')

        # Define helper function to get or create password
        def get_or_create_password(password_type):
            """Get or create a password record"""
            try:
                return LateFilingPassword.objects.get(password_type=password_type)
            except LateFilingPassword.DoesNotExist:
                # Create with default password
                defaults = {
                    'SHIFTING': 'shifting123',
                    'DAILY': 'daily123',
                    'WEEKEND': 'weekend123',
                    'HOLIDAY': 'holiday123'
                }
                return LateFilingPassword.objects.create(
                    password_type=password_type,
                    password=defaults.get(password_type, 'password123')
                )

        # Get or create password record
        password_obj = get_or_create_password(password_type)

        # Update password
        password_obj.password = new_password
        password_obj.updated_by = request.user
        password_obj.save()

        # Create system activity log
        create_system_activity(
            request.user,
            'PASSWORD',
            f"Updated {password_obj.get_password_type_display()}"
        )

        return JsonResponse({
            'success': True,
            'password_type': password_type,
            'updated_at': password_obj.last_updated.strftime('%Y-%m-%d %H:%M:%S')
        })

    except Exception as e:
        logger.error(f"Error updating password: {str(e)}")
        return JsonResponse({'error': 'Failed to update password'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
@require_POST
def reset_passwords(request):
    """Reset all passwords to defaults"""
    try:
        default_passwords = {
            'SHIFTING': 'shifting123',
            'DAILY': 'daily123',
            'WEEKEND': 'weekend123',
            'HOLIDAY': 'holiday123'
        }

        # Define helper function to get or create password
        def get_or_create_password(password_type):
            """Get or create a password record"""
            try:
                return LateFilingPassword.objects.get(password_type=password_type)
            except LateFilingPassword.DoesNotExist:
                # Create with default password
                return LateFilingPassword.objects.create(
                    password_type=password_type,
                    password=default_passwords.get(password_type, 'password123')
                )

        # Reset each password
        for password_type, default_password in default_passwords.items():
            password_obj = get_or_create_password(password_type)
            password_obj.password = default_password
            password_obj.updated_by = request.user
            password_obj.save()

        # Create system activity log
        create_system_activity(
            request.user,
            'PASSWORD',
            f"Reset all late filing passwords to defaults"
        )

        return JsonResponse({
            'success': True,
            'passwords': default_passwords
        })

    except Exception as e:
        logger.error(f"Error resetting passwords: {str(e)}")
        return JsonResponse({'error': 'Failed to reset passwords'}, status=500)


# Export Endpoints
@login_required
@user_passes_test(lambda u: u.is_admin)
def export_shifting(request):
    """Export shifting OT data"""
    try:
        # Get parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        highlight_empty = request.GET.get('highlight_empty', 'true') == 'true'

        # Validate parameters
        if not start_date or not end_date:
            return JsonResponse({'error': 'Start date and end date are required'}, status=400)

        # Parse dates
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        # Get shifting OT filings in date range
        shifting_filings = ShiftingOT.objects.filter(
            start_date__gte=start_date,
            end_date__lte=end_date
        ).select_related('filing')

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Shifting OT Export"

        # Add headers
        headers = ['ID Number', 'Employee Name', 'Department', 'Line', 'Time', 'Status', 'Shift', 'Shuttle Service']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )

        # Add data
        row_num = 2
        for shifting in shifting_filings:
            filing = shifting.filing

            # Get employee statuses for this filing
            statuses = EmployeeOTStatus.objects.filter(filing=filing).select_related('employee')

            for status in statuses:
                employee = status.employee

                ws.cell(row=row_num, column=1, value=employee.id_number)
                ws.cell(row=row_num, column=2, value=employee.name)
                ws.cell(row=row_num, column=3, value=employee.department or '')
                ws.cell(row=row_num, column=4, value=employee.line or '')
                ws.cell(row=row_num, column=5, value=shifting.filing.date_created.strftime('%Y-%m-%d %H:%M'))
                ws.cell(row=row_num, column=6, value=status.get_status_display())
                ws.cell(row=row_num, column=7, value=shifting.shift_type)

                shuttle_cell = ws.cell(row=row_num, column=8, value=employee.shuttle_service or 'Not Assigned')

                # Highlight empty shuttle service if requested
                if highlight_empty and not employee.shuttle_service:
                    shuttle_cell.fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

                row_num += 1

        # Format as table
        table_range = f"A1:{get_column_letter(len(headers))}{row_num-1}"
        for row in ws[table_range]:
            for cell in row:
                cell.border = Border(
                    left=Side(style='thin'),
                    right=Side(style='thin'),
                    top=Side(style='thin'),
                    bottom=Side(style='thin')
                )

        # Apply column widths
        column_widths = [15, 30, 20, 15, 20, 15, 10, 20]
        for i, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = width

        # Create system activity log
        create_system_activity(
            request.user,
            'EXPORT',
            f"Exported Shifting OT data from {start_date} to {end_date}"
        )

        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=shifting_ot_export_{start_date}_to_{end_date}.xlsx'

        wb.save(response)
        return response

    except Exception as e:
        logger.error(f"Error exporting shifting OT: {str(e)}")
        return JsonResponse({'error': 'Failed to export shifting OT data'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
def export_daily(request):
    """Export daily OT data"""
    try:
        # Get parameters
        schedule_type = request.GET.get('schedule_type')
        status = request.GET.get('status')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # Validate parameters
        if not schedule_type or not status or not start_date or not end_date:
            return JsonResponse({'error': 'All parameters are required'}, status=400)

        # Parse dates
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        # Get daily OT filings in date range with specified schedule type
        daily_filings = DailyOT.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            schedule_type=schedule_type
        ).select_related('filing')

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Daily OT Export"

        # Add headers
        headers = ['ID Number', 'Employee Name', 'Department', 'Line', 'Date', 'Time', 'Status', 'Shuttle Service', 'Reason']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )

        # Add data
        row_num = 2
        for daily in daily_filings:
            filing = daily.filing

            # Get employee statuses for this filing with specified status
            statuses = EmployeeOTStatus.objects.filter(filing=filing, status=status).select_related('employee')

            for status_obj in statuses:
                employee = status_obj.employee

                ws.cell(row=row_num, column=1, value=employee.id_number)
                ws.cell(row=row_num, column=2, value=employee.name)
                ws.cell(row=row_num, column=3, value=employee.department or '')
                ws.cell(row=row_num, column=4, value=employee.line or '')
                ws.cell(row=row_num, column=5, value=daily.date.strftime('%Y-%m-%d'))
                ws.cell(row=row_num, column=6, value=f"{daily.start_time.strftime('%H:%M')} - {daily.end_time.strftime('%H:%M')}")
                ws.cell(row=row_num, column=7, value=status_obj.get_status_display())
                ws.cell(row=row_num, column=8, value=employee.shuttle_service or 'Not Assigned')
                ws.cell(row=row_num, column=9, value=daily.reason)

                row_num += 1

        # Format as table
        table_range = f"A1:{get_column_letter(len(headers))}{row_num-1}"
        for row in ws[table_range]:
            for cell in row:
                cell.border = Border(
                    left=Side(style='thin'),
                    right=Side(style='thin'),
                    top=Side(style='thin'),
                    bottom=Side(style='thin')
                )

        # Apply column widths
        column_widths = [15, 30, 20, 15, 15, 20, 15, 20, 50]
        for i, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = width

        # Create system activity log
        status_display = "OT" if status == "OT" else "Not OT"
        schedule_display = dict(DailyOT.SCHEDULE_CHOICES).get(schedule_type, schedule_type)

        create_system_activity(
            request.user,
            'EXPORT',
            f"Exported Daily OT data ({schedule_display}, {status_display}) from {start_date} to {end_date}"
        )

        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=daily_ot_export_{schedule_type}_{status}_{start_date}_to_{end_date}.xlsx'

        wb.save(response)
        return response

    except Exception as e:
        logger.error(f"Error exporting daily OT: {str(e)}")
        return JsonResponse({'error': 'Failed to export daily OT data'}, status=500)


@login_required
@user_passes_test(lambda u: u.is_admin)
def export_masterlist(request):
    """Export employee masterlist"""
    try:
        # Get parameters
        highlight_missing = request.GET.get('highlight_missing', 'true') == 'true'
        include_inactive = request.GET.get('include_inactive', 'true') == 'true'
        department = request.GET.get('department')

        # Get employees
        employees = Employee.objects.all()

        # Apply filters
        if not include_inactive:
            employees = employees.filter(is_active=True)

        if department and department != 'all':
            employees = employees.filter(department=department)

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employee Masterlist"

        # Add headers
        headers = ['ID Number', 'Employee Name', 'Department', 'Line', 'Shuttle Service', 'Status']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )

        # Add data
        for row_num, employee in enumerate(employees, 2):
            ws.cell(row=row_num, column=1, value=employee.id_number)
            ws.cell(row=row_num, column=2, value=employee.name)
            ws.cell(row=row_num, column=3, value=employee.department or '')
            ws.cell(row=row_num, column=4, value=employee.line or '')

            shuttle_cell = ws.cell(row=row_num, column=5, value=employee.shuttle_service or 'Not Assigned')

            # Highlight missing shuttle service if requested
            if highlight_missing and not employee.shuttle_service:
                shuttle_cell.fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

            status_cell = ws.cell(row=row_num, column=6, value='Active' if employee.is_active else 'Inactive')

            # Highlight inactive employees
            if not employee.is_active:
                status_cell.fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")

        # Format as table
        table_range = f"A1:{get_column_letter(len(headers))}{len(employees)+1}"
        for row in ws[table_range]:
            for cell in row:
                cell.border = Border(
                    left=Side(style='thin'),
                    right=Side(style='thin'),
                    top=Side(style='thin'),
                    bottom=Side(style='thin')
                )

        # Apply column widths
        column_widths = [15, 30, 20, 15, 20, 15]
        for i, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = width

        # Create system activity log
        dept_info = f" for {department} department" if department and department != 'all' else ''
        create_system_activity(
            request.user,
            'EXPORT',
            f"Exported Employee Masterlist{dept_info}"
        )

        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=employee_masterlist_{timezone.now().strftime("%Y%m%d")}.xlsx'

        wb.save(response)
        return response

    except Exception as e:
        logger.error(f"Error exporting employee masterlist: {str(e)}")
        return JsonResponse({'error': 'Failed to export employee masterlist'}, status=500)


@login_required
@require_POST
def change_employee_status(request):
    """Change the status of employees in an OT filing"""
    try:
        data = json.loads(request.body)
        filing_id = data.get('filing_id')
        employee_ids = data.get('employee_ids', [])
        new_status = data.get('new_status')

        # Validate input
        if not filing_id or not employee_ids or not new_status:
            return JsonResponse({'error': 'Missing required parameters'}, status=400)

        # Get the filing
        filing = get_object_or_404(OTFiling, filing_id=filing_id)

        # Check permissions - only requestor or admin can change status
        if not request.user.is_admin and filing.requestor != request.user:
            return JsonResponse({'error': 'You do not have permission to change status for this filing'}, status=403)

        # Check if status changes are allowed based on OT type and current date
        now = timezone.now()
        current_hour = now.hour
        current_day = now.weekday()  # 0 = Monday, 6 = Sunday
        is_friday = current_day == 4
        is_weekend = current_day >= 5  # Saturday or Sunday

        can_change_status = True
        status_change_message = ""

        if filing.filing_type == 'DAILY':
            daily = filing.daily_details
            if daily.schedule_type == 'WEEKDAY':
                # For Weekday overtime, check if it's before 1:00 PM
                if daily.date.date() == now.date():
                    # It's the day of the scheduled overtime
                    can_change_status = current_hour < 13  # Before 1:00 PM
                    if not can_change_status:
                        status_change_message = "Status changes are not permitted after 1:00 PM on the day of the scheduled overtime."
                elif daily.date.date() < now.date():
                    # It's after the scheduled overtime day
                    can_change_status = False
                    status_change_message = "Status changes are not permitted after the scheduled overtime date."
            elif daily.schedule_type in ['SATURDAY', 'SUNDAY', 'HOLIDAY']:
                # For Weekend and Holiday overtime
                can_change_status = False
                status_change_message = "Status changes are not permitted for overtime scheduled on Saturdays, Sundays, or Holidays."
        elif filing.filing_type == 'SHIFTING':
            # For Shifting OT
            can_change_status = not is_friday and not is_weekend
            if not can_change_status:
                status_change_message = "Status changes for Shifting overtime are only permitted before Friday of each week."

        if not can_change_status:
            return JsonResponse({
                'error': status_change_message or "Status changes are no longer permitted for this overtime request."
            }, status=403)

        # Update employee statuses
        updated_count = 0
        for employee_id in employee_ids:
            try:
                status_obj = EmployeeOTStatus.objects.get(
                    filing=filing,
                    employee_id=employee_id
                )
                status_obj.status = new_status
                status_obj.save()
                updated_count += 1
            except EmployeeOTStatus.DoesNotExist:
                continue

        # Create system activity log
        create_system_activity(
            request.user,
            'OTHER',
            f"Changed status to {new_status} for {updated_count} employees in filing {filing_id}"
        )

        return JsonResponse({
            'success': True,
            'message': f'Successfully updated status for {updated_count} employees',
            'updated_count': updated_count
        })

    except Exception as e:
        logger.error(f"Error changing employee status: {str(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        return JsonResponse({'error': f'Failed to change employee status: {str(e)}'}, status=500)
