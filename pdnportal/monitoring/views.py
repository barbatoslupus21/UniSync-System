from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.utils.timezone import localtime
from django.db.models import Sum, Count, F, Q
from django.contrib import messages
import json
from datetime import datetime, timedelta, time
from .models import Monitoring, Product, ProductionSchedulePlan, ProductionOutput, Line, LineToMonitor, SupervisorToMonitor, RecentActivity, OutputLog
from .forms import MonitoringGroupForm, ProductForm, ScheduleForm, OutputForm
from portalusers.models import Users
import pandas as pd
import openpyxl
from io import BytesIO
from django.db import transaction

@login_required(login_url="user-login")
def monitoring_dashboard(request):
    today = timezone.now().date()

    if request.user.monitoring_sales:
        monitoring_groups = Monitoring.objects.all()
    else:
        assigned_monitoring_ids = SupervisorToMonitor.objects.filter(
            supervisor=request.user
        ).values_list('monitoring_id', flat=True)

        monitoring_groups = Monitoring.objects.filter(
            Q(id__in=assigned_monitoring_ids) | Q(created_by=request.user)
        )

    total_groups = monitoring_groups.count()
    total_lines = LineToMonitor.objects.filter(monitoring__in=monitoring_groups).values('line').distinct().count()
    todays_outputs = ProductionOutput.objects.filter(monitoring__in=monitoring_groups, recorded_at__date=today)
    todays_output = todays_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0
    backlog_issues = ProductionSchedulePlan.objects.filter(monitoring__in=monitoring_groups, status='Backlog').count()
    recent_activities = RecentActivity.objects.filter(monitoring__in=monitoring_groups).all()[:10]

    available_lines = Line.objects.all()

    supervisors = Users.objects.filter(Q(monitoring_user=True) & (Q(monitoring_supervisor=True) | Q(monitoring_manager=True))).all()

    form = MonitoringGroupForm()
    edit_form = MonitoringGroupForm(instance=Monitoring())
    product_form = ProductForm()
    schedule_form = ScheduleForm()
    output_form = OutputForm()

    context = {
        'monitoring_groups': monitoring_groups,
        'total_groups': total_groups,
        'total_lines': total_lines,
        'todays_output': todays_output,
        'backlog_issues': backlog_issues,
        'recent_activities': recent_activities,
        'available_lines': available_lines,
        'supervisors': supervisors,
        'form': form,
        'edit_form': edit_form,
        'product_form': product_form,
        'schedule_form': schedule_form,
        'output_form': output_form,
        'today_date': timezone.now().date().isoformat()
    }

    return render(request, 'monitoring/monitoring-supervisor.html', context)

@login_required(login_url="user-login")
@require_POST
def create_monitoring_group(request):
    form = MonitoringGroupForm(request.POST)

    if form.is_valid():
        title = form.cleaned_data.get('title')
        existing = Monitoring.objects.filter(
            title=title,
            created_by=request.user,
            created_at__date=timezone.now().date()
        ).first()

        if existing:
            monitoring = existing
            messages.info(request, f"Monitoring group '{monitoring.title}' already exists.")
        else:
            monitoring = form.save(commit=True, created_by=request.user)

            RecentActivity.objects.create(
                monitoring=monitoring,
                title="New Monitoring Group Created",
                description=f"{monitoring.title} has been created",
                activity_type='info',
                shift='AM' if timezone.now().hour < 12 else 'PM',
                created_by=request.user
            )

            messages.success(request, f"Monitoring group '{monitoring.title}' created successfully!")

        return redirect('supervisor_monitoring')
    if request.user.monitoring_sales:
        monitoring_groups = Monitoring.objects.all()
    else:
        assigned_monitorings = SupervisorToMonitor.objects.filter(supervisor=request.user)
        monitoring_groups = Monitoring.objects.filter(
            id__in=assigned_monitorings.values_list('monitoring_id', flat=True)
        )
    available_lines = Line.objects.all()
    supervisors = Users.objects.filter(Q(monitoring_user=True) & (Q(monitoring_supervisor=True) | Q(monitoring_manager=True))).all()

    context = {
        'monitoring_groups': monitoring_groups,
        'available_lines': available_lines,
        'supervisors': supervisors,
        'form': form,
        'edit_form': MonitoringGroupForm(),
        'product_form': ProductForm(),
        'schedule_form': ScheduleForm(),
        'output_form': OutputForm(),
    }

    messages.error(request, "Please correct the errors in the form.")
    return render(request, 'monitoring/monitoring-supervisor.html', context)

@login_required(login_url="user-login")
@require_POST
def edit_monitoring_group(request, group_id):
    monitoring = get_object_or_404(Monitoring, id=group_id)
    form = MonitoringGroupForm(request.POST, instance=monitoring)

    if form.is_valid():
        form.save()

        existing_activity = RecentActivity.objects.filter(
            monitoring=monitoring,
            title="Monitoring Group Updated",
            created_at__gte=timezone.now() - timezone.timedelta(minutes=1),
            created_by=request.user
        ).exists()

        if not existing_activity:
            RecentActivity.objects.create(
                monitoring=monitoring,
                title="Monitoring Group Updated",
                description=f"{monitoring.title} has been updated",
                activity_type='info',
                shift='AM' if timezone.now().hour < 12 else 'PM',
                created_by=request.user
            )

        messages.success(request, f"Monitoring group '{monitoring.title}' updated successfully!")
        return redirect('supervisor_monitoring')

    monitoring_groups = Monitoring.objects.all()
    available_lines = Line.objects.all()
    supervisors = request.user.model._default_manager.filter(is_staff=True)

    context = {
        'monitoring_groups': monitoring_groups,
        'available_lines': available_lines,
        'supervisors': supervisors,
        'form': MonitoringGroupForm(),
        'edit_form': form,
        'product_form': ProductForm(),
        'schedule_form': ScheduleForm(),
        'output_form': OutputForm(),
    }

    messages.error(request, "Please correct the errors in the form.")
    return render(request, 'monitoring/monitoring-supervisor.html', context)

@login_required(login_url="user-login")
def get_monitoring_group(request, group_id):
    try:
        monitoring = get_object_or_404(Monitoring, id=group_id)

        # Check if user has permission to view this group
        if not request.user.monitoring_sales:
            if not (
                SupervisorToMonitor.objects.filter(monitoring=monitoring, supervisor=request.user).exists() or
                monitoring.created_by == request.user
            ):
                return JsonResponse({
                    'status': 'error',
                    'message': 'You do not have permission to view this group'
                }, status=403)

        line_ids = LineToMonitor.objects.filter(monitoring=monitoring).values_list('line_id', flat=True)
        supervisor_ids = SupervisorToMonitor.objects.filter(monitoring=monitoring).values_list('supervisor_id', flat=True)

        today = timezone.now().date()
        today_outputs = ProductionOutput.objects.filter(
            monitoring=monitoring,
            recorded_at__date=today
        )

        today_output_total = today_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

        lines_data = []
        for line_to_monitor in monitoring.monitoring_lines.all():
            line = line_to_monitor.line

            line_schedules = ProductionSchedulePlan.objects.filter(
                monitoring=monitoring,
                product_number__line=line,
                date_planned=today
            )

            planned_qty = line_schedules.aggregate(total=Sum('planned_qty'))['total'] or 0

            line_outputs = ProductionOutput.objects.filter(
                monitoring=monitoring,
                line=line,
                recorded_at__date=today
            )

            actual_qty = line_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

            percentage = round((actual_qty / planned_qty) * 100) if planned_qty > 0 else 0

            lines_data.append({
                'id': line.id,
                'name': line.line_name,
                'planned_qty': planned_qty,
                'actual_qty': actual_qty,
                'percentage': percentage
            })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error retrieving group details: {str(e)}'
        }, status=500)

    products_data = []
    for product in monitoring.monitoring_product.all().order_by('-created_at'):
        products_data.append({
            'id': product.id,
            'name': product.product_name,
            'description': product.description,
            'line': product.line.line_name,
            'qty_per_box': product.qty_per_box,
            'qty_per_hour': product.qty_per_hour,
            'created_at': product.created_at.isoformat() if product.created_at else None
        })

    # Get ALL schedules for this monitoring group, not just today's
    schedules_data = []
    for schedule in ProductionSchedulePlan.objects.filter(monitoring=monitoring).order_by('-created_at'):
        outputs = ProductionOutput.objects.filter(schedule_plan=schedule)
        produced_qty = outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

        schedules_data.append({
            'id': schedule.id,
            'product': schedule.product_number.product_name,
            'line': schedule.product_number.line.line_name,
            'shift': schedule.shift,
            'planned_qty': schedule.planned_qty,
            'produced_qty': produced_qty,
            'balance': schedule.balance,
            'status': schedule.status,
            'date_planned': schedule.date_planned.strftime('%Y-%m-%d'),
            'created_at': schedule.created_at.isoformat() if schedule.created_at else None
        })

    supervisors_data = []
    for supervisor_to_monitor in monitoring.monitoring_supervisors.all():
        supervisor = supervisor_to_monitor.supervisor
        supervisors_data.append({
            'id': supervisor.id,
            'name': supervisor.get_full_name() or supervisor.username,
            'username': supervisor.username
        })

    today_schedules = ProductionSchedulePlan.objects.filter(monitoring=monitoring, date_planned=today)
    total_planned = today_schedules.aggregate(total=Sum('planned_qty'))['total'] or 0

    efficiency = round((today_output_total / total_planned) * 100) if total_planned > 0 else 0

    met_target_count = 0
    not_met_target_count = 0

    for schedule in today_schedules:
        outputs = ProductionOutput.objects.filter(schedule_plan=schedule)
        produced_qty = outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

        if produced_qty >= schedule.planned_qty:
            met_target_count += 1
        else:
            not_met_target_count += 1

    total_schedules = today_schedules.count()
    met_target_percentage = round((met_target_count / total_schedules) * 100) if total_schedules > 0 else 0
    not_met_target_percentage = round((not_met_target_count / total_schedules) * 100) if total_schedules > 0 else 0

    data = {
        'id': monitoring.id,
        'title': monitoring.title,
        'status': monitoring.status,
        'description': monitoring.description,
        'line_ids': list(line_ids),
        'supervisor_ids': list(supervisor_ids),
        'lines_count': monitoring.monitoring_lines.count(),
        'efficiency_percentage': efficiency,
        'todays_output': today_output_total,
        'met_target_percentage': met_target_percentage,
        'not_met_target_percentage': not_met_target_percentage,
        'lines': lines_data,
        'products': products_data,
        'schedules': schedules_data,
        'supervisors': supervisors_data,
        'status': 'success'
    }

    return JsonResponse(data)

# PRODUCT TAB
@login_required(login_url="user-login")
@require_POST
def add_product(request):
    form = ProductForm(request.POST)

    if form.is_valid():
        product = form.save(commit=False)

        monitoring_id = request.POST.get('monitoring_id')
        monitoring = get_object_or_404(Monitoring, id=monitoring_id)

        product.monitoring = monitoring
        product.save()

        RecentActivity.objects.create(
            monitoring=monitoring,
            title="New Product Added",
            description=f"Product '{product.product_name}' added to {product.line.line_name}",
            activity_type='info',
            shift='AM' if timezone.now().hour < 12 else 'PM',
            created_by=request.user
        )

        # Check if this is an AJAX request
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success',
                'message': f"Product '{product.product_name}' added successfully!"
            })

        messages.success(request, f"Product '{product.product_name}' added successfully!")
        return redirect('supervisor_monitoring')

    # If form is invalid
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'status': 'error',
            'message': "Please correct the errors in the product form.",
            'errors': form.errors.as_json()
        })

    messages.error(request, "Please correct the errors in the product form.")
    return redirect('supervisor_monitoring')

@login_required(login_url="user-login")
def get_product(request, product_id):
    product = get_object_or_404(Product, id=product_id)

    if not request.user.monitoring_user:
        pass
    else:
        if not (
            SupervisorToMonitor.objects.filter(monitoring=product.monitoring, supervisor=request.user).exists() or
            product.monitoring.created_by == request.user
        ):
            return JsonResponse({'status': 'error', 'message': 'You do not have permission to edit this product'})

    data = {
        'id': product.id,
        'product_name': product.product_name,
        'line_id': product.line.id,
        'qty_per_box': product.qty_per_box,
        'qty_per_hour': product.qty_per_hour,
        'description': product.description,
        'monitoring_id': product.monitoring.id
    }

    return JsonResponse(data)

@login_required(login_url="user-login")
@require_POST
def edit_product(request, product_id):
    product = get_object_or_404(Product, id=product_id)

    if not request.user.monitoring_sales:
        if not (
            SupervisorToMonitor.objects.filter(monitoring=product.monitoring, supervisor=request.user).exists() or
            product.monitoring.created_by == request.user
        ):
            messages.error(request, "You do not have permission to edit this product")
            return redirect('supervisor_monitoring')

    form = ProductForm(request.POST, instance=product)

    if form.is_valid():
        form.save()

        RecentActivity.objects.create(
            monitoring=product.monitoring,
            title="Product Updated",
            description=f"Product '{product.product_name}' has been updated",
            activity_type='info',
            shift='AM' if timezone.now().hour < 12 else 'PM',
            created_by=request.user
        )

        messages.success(request, f"Product '{product.product_name}' updated successfully!")

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success',
                'message': f"Product '{product.product_name}' updated successfully!"
            })

        return redirect('supervisor_monitoring')

    messages.error(request, "Please correct the errors in the product form.")

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'status': 'error',
            'message': "Please correct the errors in the form.",
            'errors': form.errors.as_json()
        })

    return redirect('supervisor_monitoring')

@login_required(login_url="user-login")
@require_POST
def delete_product(request, product_id):
    try:
        product = get_object_or_404(Product, id=product_id)

        if not request.user.monitoring_sales:
            if not (
                SupervisorToMonitor.objects.filter(monitoring=product.monitoring, supervisor=request.user).exists() or
                product.monitoring.created_by == request.user
            ):
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'status': 'error',
                        'message': "You do not have permission to delete this product"
                    })
                messages.error(request, "You do not have permission to delete this product")
                return redirect('supervisor_monitoring')

        schedules = ProductionSchedulePlan.objects.filter(product_number=product)
        if schedules.exists():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'status': 'error',
                    'message': "Cannot delete this product as it is used in production schedules"
                })
            messages.error(request, "Cannot delete this product as it is used in production schedules")
            return redirect('supervisor_monitoring')

        product_name = product.product_name
        monitoring = product.monitoring

        product.delete()

        RecentActivity.objects.create(
            monitoring=monitoring,
            title="Product Deleted",
            description=f"Product '{product_name}' has been deleted",
            activity_type='info',
            shift='AM' if timezone.now().hour < 12 else 'PM',
            created_by=request.user
        )

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success',
                'message': f"Product '{product_name}' deleted successfully!"
            })

        messages.success(request, f"Product '{product_name}' deleted successfully!")
        return redirect('supervisor_monitoring')

    except Exception as e:
        print(f"Error deleting product: {str(e)}")

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'error',
                'message': f"Error deleting product: {str(e)}"
            })

        messages.error(request, f"Error deleting product: {str(e)}")
        return redirect('supervisor_monitoring')

@login_required(login_url="user-login")
def export_product_template(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Product Template"

    headers = ['product_name', 'line_id', 'qty_per_box', 'qty_per_hour', 'description']
    for col_num, header in enumerate(headers, 1):
        ws.cell(row=1, column=col_num, value=header)

    sample_data = [
        ['Product 1', 1, 100, 40, 'Sample product description'],
        ['Product 2', 2, 200, 60, 'Another sample product']
    ]

    for row_num, row_data in enumerate(sample_data, 2):
        for col_num, cell_value in enumerate(row_data, 1):
            ws.cell(row=row_num, column=col_num, value=cell_value)

    lines = Line.objects.all()
    line_options = "\n".join([f"{line.id}: {line.line_name}" for line in lines])
    comment = openpyxl.comments.Comment(f"Available Line IDs:\n{line_options}", "System")
    ws['B1'].comment = comment

    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)
        cell.fill = openpyxl.styles.PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")

    ws_instructions = wb.create_sheet(title="Instructions")
    instructions = [
        ["Product Import Template Instructions"],
        [""],
        ["Fields:"],
        ["product_name - Name of the product (required)"],
        ["line_id - ID of the production line (required)"],
        ["qty_per_box - Quantity per box (required)"],
        ["qty_per_hour - Quantity per hour (required)"],
        ["description - Product description (optional)"],
        [""],
        ["Available Lines:"]
    ]

    for i, line in enumerate(lines, len(instructions) + 1):
        instructions.append([f"ID: {line.id} - Name: {line.line_name}"])

    for row_num, row_data in enumerate(instructions, 1):
        for col_num, cell_value in enumerate(row_data, 1):
            ws_instructions.cell(row=row_num, column=col_num, value=cell_value)

    ws_instructions['A1'].font = openpyxl.styles.Font(bold=True, size=14)

    for ws in [ws, ws_instructions]:
        for column in ws.columns:
            max_length = 0
            column_letter = openpyxl.utils.get_column_letter(column[0].column)
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(cell.value)
                except:
                    pass
            adjusted_width = (max_length + 2) * 1.2
            ws.column_dimensions[column_letter].width = adjusted_width

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"product_template_{datetime.now().strftime('%Y%m%d')}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    return response

@login_required(login_url="user-login")
@require_POST
def import_products(request):
    monitoring_id = request.POST.get('monitoring_id')
    monitoring = get_object_or_404(Monitoring, id=monitoring_id)

    if 'product_file' not in request.FILES:
        messages.error(request, "No file uploaded")
        return redirect('supervisor_monitoring')

    excel_file = request.FILES['product_file']

    if not excel_file.name.endswith(('.xlsx', '.xls')):
        messages.error(request, "Uploaded file is not an Excel file")
        return redirect('supervisor_monitoring')

    try:
        df = pd.read_excel(excel_file)

        required_columns = ['product_name', 'line_id', 'qty_per_box', 'qty_per_hour']
        for column in required_columns:
            if column not in df.columns:
                messages.error(request, f"Missing required column: {column}")
                return redirect('supervisor_monitoring')

        products_created = 0
        products_skipped = 0
        errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    product_name = str(row['product_name']).strip()
                    line_id = int(row['line_id'])
                    qty_per_box = int(row['qty_per_box'])
                    qty_per_hour = int(row['qty_per_hour'])
                    description = str(row.get('description', '')) if not pd.isna(row.get('description', '')) else ''

                    line = Line.objects.filter(id=line_id).first()
                    if not line:
                        errors.append(f"Row {index+2}: Line ID {line_id} does not exist")
                        products_skipped += 1
                        continue

                    existing_product = Product.objects.filter(
                        monitoring=monitoring,
                        product_name=product_name,
                        line=line
                    ).first()

                    if existing_product:
                        existing_product.qty_per_box = qty_per_box
                        existing_product.qty_per_hour = qty_per_hour
                        existing_product.description = description
                        existing_product.save()
                        products_created += 1
                    else:
                        Product.objects.create(
                            monitoring=monitoring,
                            product_name=product_name,
                            line=line,
                            qty_per_box=qty_per_box,
                            qty_per_hour=qty_per_hour,
                            description=description
                        )
                        products_created += 1

                except Exception as e:
                    errors.append(f"Row {index+2}: {str(e)}")
                    products_skipped += 1

        RecentActivity.objects.create(
            monitoring=monitoring,
            title="Products Imported",
            description=f"{products_created} products imported, {products_skipped} skipped",
            activity_type='info',
            shift='AM' if timezone.now().hour < 12 else 'PM',
            created_by=request.user
        )

        if errors:
            messages.warning(request, f"Imported {products_created} products with {len(errors)} errors")
            for error in errors[:5]:
                messages.error(request, error)
            if len(errors) > 5:
                messages.error(request, f"...and {len(errors) - 5} more errors")
        else:
            messages.success(request, f"Successfully imported {products_created} products")

        return redirect('supervisor_monitoring')

    except Exception as e:
        messages.error(request, f"Error processing Excel file: {str(e)}")
        return redirect('supervisor_monitoring')


# SCHEDULE TAB
@login_required(login_url="user-login")
@require_POST
def add_schedule(request):
    form = ScheduleForm(request.POST)

    if form.is_valid():
        monitoring_id = request.POST.get('monitoring_id')
        monitoring = get_object_or_404(Monitoring, id=monitoring_id)

        schedule = form.save(commit=False)
        schedule.monitoring = monitoring
        schedule.save()

        RecentActivity.objects.create(
            monitoring=monitoring,
            title=f"Schedule Added - {schedule.product_number.line.line_name}",
            description=f"Schedule for '{schedule.product_number.product_name}' added with target of {schedule.planned_qty} units",
            activity_type='info',
            shift=schedule.shift,
            created_by=request.user
        )

        # Check if this is an AJAX request
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success',
                'message': "Production schedule added successfully!"
            })

        messages.success(request, "Production schedule added successfully!")
        return redirect('supervisor_monitoring')

    # If form is invalid
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'status': 'error',
            'message': "Please correct the errors in the schedule form.",
            'errors': form.errors.as_json()
        })

    messages.error(request, "Please correct the errors in the schedule form.")
    return redirect('supervisor_monitoring')

@login_required(login_url="user-login")
def get_schedule(request, schedule_id):
    schedule = get_object_or_404(ProductionSchedulePlan, id=schedule_id)

    if not request.user.monitoring_sales:
        monitoring = schedule.monitoring

        if not (
            SupervisorToMonitor.objects.filter(monitoring=monitoring, supervisor=request.user).exists() or
            monitoring.created_by == request.user
        ):
            return JsonResponse({
                'status': 'error',
                'message': 'You do not have permission to view this schedule'
            })

    data = {
        'id': schedule.id,
        'product_id': schedule.product_number.id,
        'product_name': schedule.product_number.product_name,
        'line_id': schedule.product_number.line.id,
        'line_name': schedule.product_number.line.line_name,
        'date_planned': schedule.date_planned.strftime('%Y-%m-%d'),
        'shift': schedule.shift,
        'planned_qty': schedule.planned_qty,
        'balance': schedule.balance,
        'status': schedule.status,
        'monitoring_id': schedule.monitoring.id
    }

    return JsonResponse(data)

@login_required(login_url="user-login")
@require_POST
def edit_schedule(request, schedule_id):
    schedule = get_object_or_404(ProductionSchedulePlan, id=schedule_id)

    if not (request.user.monitoring_sales or request.user.monitoring_supervisor or request.user.monitoring_manager):
        messages.error(request, "You do not have permission to edit this schedule")
        return redirect('supervisor_monitoring')

    form = ScheduleForm(request.POST, instance=schedule)

    if not request.user.monitoring_sales and (request.user.monitoring_supervisor or request.user.monitoring_manager):
        current_status = schedule.status
        new_status = request.POST.get('status')

        if new_status not in ['Change Load', 'Backlog']:
            messages.error(request, "Supervisors and Managers can only change status to 'Change Load' or 'Backlog'")
            return redirect('supervisor_monitoring')

        if form.is_valid():
            form.save()

        RecentActivity.objects.create(
            monitoring=schedule.monitoring,
            title="Schedule Updated",
            description=f"Schedule for '{schedule.product_number.product_name}' has been updated",
            activity_type='info',
            shift=schedule.shift,
            created_by=request.user
        )

        messages.success(request, f"Schedule updated successfully!")

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success',
                'message': f"Schedule updated successfully!"
            })

        return redirect('supervisor_monitoring')

    messages.error(request, "Please correct the errors in the schedule form.")

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'status': 'error',
            'message': "Please correct the errors in the form.",
            'errors': form.errors.as_json()
        })

    return redirect('supervisor_monitoring')

@login_required(login_url="user-login")
@require_POST
def delete_schedule(request, schedule_id):
    try:
        schedule = get_object_or_404(ProductionSchedulePlan, id=schedule_id)

        if not request.user.monitoring_sales:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'status': 'error',
                    'message': "You do not have permission to delete this schedule"
                })
            messages.error(request, "You do not have permission to delete this schedule")
            return redirect('supervisor_monitoring')

        outputs = ProductionOutput.objects.filter(schedule_plan=schedule)
        if outputs.exists():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'status': 'error',
                    'message': "Cannot delete this schedule as it has recorded outputs"
                })
            messages.error(request, "Cannot delete this schedule as it has recorded outputs")
            return redirect('supervisor_monitoring')

        schedule_name = f"{schedule.product_number.product_name} - {schedule.date_planned}"
        monitoring = schedule.monitoring

        schedule.delete()

        RecentActivity.objects.create(
            monitoring=monitoring,
            title="Schedule Deleted",
            description=f"Schedule for '{schedule_name}' has been deleted",
            activity_type='warning',
            shift='AM' if timezone.now().hour < 12 else 'PM',
            created_by=request.user
        )

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success',
                'message': f"Schedule '{schedule_name}' deleted successfully!"
            })

        messages.success(request, f"Schedule '{schedule_name}' deleted successfully!")
        return redirect('supervisor_monitoring')

    except Exception as e:
        print(f"Error deleting schedule: {str(e)}")

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'error',
                'message': f"Error deleting schedule: {str(e)}"
            })

        messages.error(request, f"Error deleting schedule: {str(e)}")
        return redirect('supervisor_monitoring')

@login_required(login_url="user-login")
def export_schedule_template(request):
    monitoring_id = request.GET.get('monitoring_id')

    # Create a generic template if no monitoring_id is provided or if it's invalid
    if not monitoring_id or monitoring_id == '0':
        # Create a workbook with generic template
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Schedule Template"

        headers = ['product_name', 'date_planned', 'shift', 'planned_qty', 'status']
        for col_num, header in enumerate(headers, 1):
            ws.cell(row=1, column=col_num, value=header)

        today = timezone.now().date().strftime('%Y-%m-%d')

        sample_data = [
            ['Example Product 1', today, 'AM', 1000, 'Planned'],
            ['Example Product 2', today, 'PM', 1500, 'Change Load']
        ]

        for row_num, row_data in enumerate(sample_data, 2):
            for col_num, cell_value in enumerate(row_data, 1):
                ws.cell(row=row_num, column=col_num, value=cell_value)

        ws_validation = wb.create_sheet(title="Validation")

        ws_validation['A1'] = 'Shift Options'
        ws_validation['A2'] = 'AM'
        ws_validation['A3'] = 'PM'

        ws_validation['B1'] = 'Status Options'
        ws_validation['B2'] = 'Planned'
        ws_validation['B3'] = 'Change Load'
        ws_validation['B4'] = 'Backlog'

        ws_validation.sheet_state = 'hidden'

        shift_validation = openpyxl.worksheet.datavalidation.DataValidation(
            type="list",
            formula1="=Validation!$A$2:$A$3",
            allow_blank=False
        )
        ws.add_data_validation(shift_validation)
        shift_validation.add('C2:C1000')

        status_validation = openpyxl.worksheet.datavalidation.DataValidation(
            type="list",
            formula1="=Validation!$B$2:$B$4",
            allow_blank=False
        )
        ws.add_data_validation(status_validation)
        status_validation.add('E2:E1000')

        ws_instructions = wb.create_sheet(title="Instructions")
        instructions = [
            ["Schedule Import Template Instructions"],
            [""],
            ["Fields:"],
            ["product_name - Name of the product (required)"],
            ["date_planned - Date in YYYY-MM-DD format (required)"],
            ["shift - AM or PM (required)"],
            ["planned_qty - Planned quantity (required)"],
            ["status - Status (Planned, Change Load, or Backlog) (required)"],
            [""],
            ["Please select a specific monitoring group to see available products."],
            [""]
        ]

        for row_num, row_data in enumerate(instructions, 1):
            for col_num, cell_value in enumerate(row_data, 1):
                ws_instructions.cell(row=row_num, column=col_num, value=cell_value)

        for cell in ws[1]:
            cell.font = openpyxl.styles.Font(bold=True)
            cell.fill = openpyxl.styles.PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")

        ws_instructions['A1'].font = openpyxl.styles.Font(bold=True, size=14)

        for sheet in [ws, ws_instructions]:
            for column in sheet.columns:
                max_length = 0
                column_letter = openpyxl.utils.get_column_letter(column[0].column)
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(cell.value)
                    except:
                        pass
                adjusted_width = (max_length + 2) * 1.2
                sheet.column_dimensions[column_letter].width = adjusted_width

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"generic_schedule_template_{datetime.now().strftime('%Y%m%d')}.xlsx"
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    # If a valid monitoring_id is provided, get the monitoring group
    try:
        monitoring = get_object_or_404(Monitoring, id=monitoring_id)
    except:
        messages.error(request, "Invalid monitoring group ID.")
        return redirect('supervisor_monitoring')

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Schedule Template"

    headers = ['product_name', 'date_planned', 'shift', 'planned_qty', 'status']
    for col_num, header in enumerate(headers, 1):
        ws.cell(row=1, column=col_num, value=header)

    today = timezone.now().date().strftime('%Y-%m-%d')

    example_products = Product.objects.filter(monitoring=monitoring)[:2]

    sample_data = []
    for product in example_products:
        sample_data.append([product.product_name, today, 'AM', 1000, 'Planned'])
        sample_data.append([product.product_name, today, 'PM', 1500, 'Change Load'])

    if not sample_data:
        sample_data = [
            ['Example Product 1', today, 'AM', 1000, 'Planned'],
            ['Example Product 2', today, 'PM', 1500, 'Change Load']
        ]

    for row_num, row_data in enumerate(sample_data, 2):
        for col_num, cell_value in enumerate(row_data, 1):
            ws.cell(row=row_num, column=col_num, value=cell_value)

    ws_validation = wb.create_sheet(title="Validation")

    ws_validation['A1'] = 'Shift Options'
    ws_validation['A2'] = 'AM'
    ws_validation['A3'] = 'PM'

    ws_validation['B1'] = 'Status Options'
    ws_validation['B2'] = 'Planned'
    ws_validation['B3'] = 'Change Load'
    ws_validation['B4'] = 'Backlog'

    ws_validation.sheet_state = 'hidden'

    shift_validation = openpyxl.worksheet.datavalidation.DataValidation(
        type="list",
        formula1="=Validation!$A$2:$A$3",
        allow_blank=False
    )
    ws.add_data_validation(shift_validation)
    shift_validation.add('C2:C1000')

    status_validation = openpyxl.worksheet.datavalidation.DataValidation(
        type="list",
        formula1="=Validation!$B$2:$B$4",
        allow_blank=False
    )
    ws.add_data_validation(status_validation)
    status_validation.add('E2:E1000')

    ws_instructions = wb.create_sheet(title="Instructions")
    instructions = [
        ["Schedule Import Template Instructions"],
        [""],
        ["Fields:"],
        ["product_name - Name of the product (required)"],
        ["date_planned - Date in YYYY-MM-DD format (required)"],
        ["shift - AM or PM (required)"],
        ["planned_qty - Planned quantity (required)"],
        ["status - Status (Planned, Change Load, or Backlog) (required)"],
        [""],
        [f"Available Products for Monitoring Group: {monitoring.title}"],
        [""]
    ]

    products = Product.objects.filter(monitoring=monitoring).select_related('line')

    for product in products:
        instructions.append([f"Name: {product.product_name} - Line: {product.line.line_name}"])

    if not products.exists():
        instructions.append(["No products found for this monitoring group. Please add products first."])

    for row_num, row_data in enumerate(instructions, 1):
        for col_num, cell_value in enumerate(row_data, 1):
            ws_instructions.cell(row=row_num, column=col_num, value=cell_value)

    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)
        cell.fill = openpyxl.styles.PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")

    ws_instructions['A1'].font = openpyxl.styles.Font(bold=True, size=14)

    for sheet in [ws, ws_instructions]:
        for column in sheet.columns:
            max_length = 0
            column_letter = openpyxl.utils.get_column_letter(column[0].column)
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(cell.value)
                except:
                    pass
            adjusted_width = (max_length + 2) * 1.2
            sheet.column_dimensions[column_letter].width = adjusted_width

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"{monitoring.title}_schedule_template_{datetime.now().strftime('%Y%m%d')}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    return response

@login_required(login_url="user-login")
@require_POST
def import_schedules(request):
    monitoring_id = request.POST.get('monitoring_id')
    monitoring = get_object_or_404(Monitoring, id=monitoring_id)

    if 'schedule_file' not in request.FILES:
        messages.error(request, "No file uploaded")
        return redirect('supervisor_monitoring')

    excel_file = request.FILES['schedule_file']

    if not excel_file.name.endswith(('.xlsx', '.xls')):
        messages.error(request, "Uploaded file is not an Excel file")
        return redirect('supervisor_monitoring')

    try:
        df = pd.read_excel(excel_file)

        required_columns = ['product_name', 'date_planned', 'shift', 'planned_qty', 'status']
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            messages.error(request, f"Missing required columns: {', '.join(missing_columns)}")
            return redirect('supervisor_monitoring')

        schedules_created = 0
        schedules_updated = 0
        schedules_skipped = 0
        errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    product_name = str(row['product_name']).strip()

                    if isinstance(row['date_planned'], str):
                        date_planned = datetime.strptime(row['date_planned'], '%Y-%m-%d').date()
                    else:
                        date_planned = row['date_planned'].date()

                    shift = str(row['shift']).strip().upper()
                    planned_qty = int(row['planned_qty'])
                    status = str(row['status']).strip()

                    product = Product.objects.filter(
                        product_name=product_name,
                        monitoring=monitoring
                    ).first()

                    if not product:
                        errors.append(f"Row {index+2}: Product '{product_name}' does not exist or doesn't belong to this monitoring group")
                        schedules_skipped += 1
                        continue

                    if shift not in ['AM', 'PM']:
                        errors.append(f"Row {index+2}: Invalid shift value. Must be 'AM' or 'PM'")
                        schedules_skipped += 1
                        continue

                    valid_statuses = ['Planned', 'Change Load', 'Backlog']
                    if status not in valid_statuses:
                        errors.append(f"Row {index+2}: Invalid status value. Must be one of {', '.join(valid_statuses)}")
                        schedules_skipped += 1
                        continue

                    existing_schedule = ProductionSchedulePlan.objects.filter(
                        monitoring=monitoring,
                        product_number=product,
                        date_planned=date_planned,
                        shift=shift
                    ).first()

                    if existing_schedule:
                        existing_schedule.planned_qty = planned_qty
                        existing_schedule.status = status
                        existing_schedule.balance = planned_qty
                        existing_schedule.save()
                        schedules_updated += 1
                    else:
                        ProductionSchedulePlan.objects.create(
                            monitoring=monitoring,
                            product_number=product,
                            date_planned=date_planned,
                            shift=shift,
                            planned_qty=planned_qty,
                            balance=planned_qty,
                            status=status
                        )
                        schedules_created += 1

                except Exception as e:
                    errors.append(f"Row {index+2}: {str(e)}")
                    schedules_skipped += 1

        RecentActivity.objects.create(
            monitoring=monitoring,
            title="Schedules Imported",
            description=f"{schedules_created} created, {schedules_updated} updated, {schedules_skipped} skipped",
            activity_type='info',
            shift='AM' if timezone.now().hour < 12 else 'PM',
            created_by=request.user
        )

        if errors:
            messages.warning(request, f"Imported {schedules_created} schedules, updated {schedules_updated}, with {len(errors)} errors")
            for error in errors[:5]:
                messages.error(request, error)
            if len(errors) > 5:
                messages.error(request, f"...and {len(errors) - 5} more errors")
        else:
            messages.success(request, f"Successfully imported {schedules_created} schedules and updated {schedules_updated}")

        return redirect('supervisor_monitoring')

    except Exception as e:
        messages.error(request, f"Error processing Excel file: {str(e)}")
        return redirect('supervisor_monitoring')


# CHART DATA
@login_required(login_url="user-login")
def get_chart_data(request, period):
    """
    Get chart data for the dashboard based on the specified period.
    Returns empty data if there are no monitoring groups or if an error occurs.
    """
    today = timezone.now().date()

    try:
        # Get monitoring groups based on user permissions
        if request.user.monitoring_sales:
            monitoring_groups = Monitoring.objects.all()
        else:
            assigned_monitoring_ids = SupervisorToMonitor.objects.filter(
                supervisor=request.user
            ).values_list('monitoring_id', flat=True)

            monitoring_groups = Monitoring.objects.filter(
                Q(id__in=assigned_monitoring_ids) | Q(created_by=request.user)
            )

        # Return empty data if no monitoring groups exist
        if not monitoring_groups.exists():
            return JsonResponse({
                'labels': [],
                'actual': [],
                'target': [],
            })

        # Set date range based on period
        if period == 'week':
            start_date = today - timedelta(days=7)
            date_format = '%a'
        elif period == 'month':
            start_date = today.replace(day=1)
            date_format = '%d %b'
        else:  # quarter
            current_month = today.month
            quarter_start_month = ((current_month - 1) // 3) * 3 + 1
            start_date = today.replace(month=quarter_start_month, day=1)
            date_format = '%b'

        # Get production outputs
        outputs = ProductionOutput.objects.filter(
            monitoring__in=monitoring_groups,
            recorded_at__date__range=[start_date, today]
        ).values('recorded_at__date').annotate(total=Sum('quantity_produced')).order_by('recorded_at__date')

        # Get production schedules
        schedules = ProductionSchedulePlan.objects.filter(
            monitoring__in=monitoring_groups,
            date_planned__range=[start_date, today]
        ).values('date_planned').annotate(total=Sum('planned_qty')).order_by('date_planned')

        # Create maps for easy lookup
        output_map = {item['recorded_at__date']: item['total'] for item in outputs}
        schedule_map = {item['date_planned']: item['total'] for item in schedules}

        labels, actual_data, target_data = [], [], []

        # Generate data for week or month
        if period in ('week', 'month'):
            current_date = start_date
            month_end = (today.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            end_date = today if period == 'week' else month_end

            while current_date <= end_date:
                labels.append(current_date.strftime(date_format))
                actual_data.append(output_map.get(current_date, 0))
                target_data.append(schedule_map.get(current_date, 0))
                current_date += timedelta(days=1)
        # Generate data for quarter
        else:
            for i in range(3):
                month = ((today.month - 1) // 3) * 3 + 1 + i
                year = today.year
                if month > 12:
                    month -= 12
                    year += 1

                month_start = datetime(year, month, 1).date()
                next_month = month_start.replace(day=28) + timedelta(days=4)
                month_end = next_month.replace(day=1) - timedelta(days=1)

                labels.append(month_start.strftime(date_format))

                month_outputs = [value for date, value in output_map.items() if month_start <= date <= month_end]
                month_targets = [value for date, value in schedule_map.items() if month_start <= date <= month_end]

                actual_data.append(sum(month_outputs))
                target_data.append(sum(month_targets))

        # Prepare response
        response_data = {
            'labels': labels,
            'actual': actual_data,
            'target': target_data,
        }

        print(f"Chart data for period {period}: {response_data}")
        return JsonResponse(response_data)

    except Exception as e:
        print(f"Error in get_chart_data: {str(e)}")
        return JsonResponse({
            'labels': [],
            'actual': [],
            'target': [],
        })

@login_required(login_url="user-login")
def get_group_performance(request, group_id):
    monitoring = get_object_or_404(Monitoring, id=group_id)

    filter_date = request.GET.get('date')
    filter_shift = request.GET.get('shift', 'all')

    if filter_date:
        try:
            filter_date = datetime.strptime(filter_date, '%Y-%m-%d').date()
        except ValueError:
            filter_date = timezone.localdate()
    else:
        filter_date = timezone.localdate()

    if filter_shift == 'AM':
        hours_range = range(7, 19)
    elif filter_shift == 'PM':
        hours_range = list(range(18, 24)) + list(range(0, 8))
    else:
        hours_range = list(range(0, 24))

    labels = [f"{hour % 24:02d}:00" for hour in hours_range]
    actual_data = [0] * len(hours_range)

    schedules = ProductionSchedulePlan.objects.filter(
        monitoring=monitoring,
        date_planned=filter_date
    )

    if filter_shift != 'all':
        schedules = schedules.filter(shift=filter_shift)

    # Total target based on product_number.qty_per_hour
    total_target_output = schedules.aggregate(total=Sum('product_number__qty_per_hour'))['total'] or 0
    target_data = [total_target_output] * len(hours_range)

    outputs_query = ProductionOutput.objects.filter(
        monitoring=monitoring,
        schedule_plan__in=schedules
    )

    if filter_shift == 'PM':
        next_day = filter_date + timedelta(days=1)
        filter_day_start = timezone.make_aware(datetime.combine(filter_date, time(hour=18)))
        filter_day_end = timezone.make_aware(datetime.combine(filter_date, time(hour=23, minute=59, second=59)))
        next_day_start = timezone.make_aware(datetime.combine(next_day, time(hour=0)))
        next_day_end = timezone.make_aware(datetime.combine(next_day, time(hour=7, minute=59, second=59)))
        outputs = outputs_query.filter(
            Q(recorded_at__range=[filter_day_start, filter_day_end]) |
            Q(recorded_at__range=[next_day_start, next_day_end])
        )
    else:
        filter_day_start = timezone.make_aware(datetime.combine(filter_date, time(hour=0)))
        filter_day_end = timezone.make_aware(datetime.combine(filter_date, time(hour=23, minute=59, second=59)))
        outputs = outputs_query.filter(recorded_at__range=[filter_day_start, filter_day_end])

        if filter_shift == 'AM':
            am_start = timezone.make_aware(datetime.combine(filter_date, time(hour=7)))
            am_end = timezone.make_aware(datetime.combine(filter_date, time(hour=18, minute=59, second=59)))
            outputs = outputs.filter(recorded_at__range=[am_start, am_end])

    for idx, hour in enumerate(hours_range):
        hour_of_day = hour % 24
        hour_date = filter_date + timedelta(days=1) if filter_shift == 'PM' and hour_of_day < 8 else filter_date

        hour_start = timezone.make_aware(datetime.combine(hour_date, time(hour=hour_of_day, minute=0)))
        hour_end = timezone.make_aware(datetime.combine(hour_date, time(hour=hour_of_day, minute=59, second=59)))

        hour_outputs = outputs.filter(recorded_at__range=[hour_start, hour_end])
        hour_total = hour_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0
        actual_data[idx] = hour_total

    return JsonResponse({
        'labels': labels,
        'actual': actual_data,
        'target': target_data
    })

@login_required(login_url="user-login")
def get_line_performance(request, group_id, line_id):
    monitoring = get_object_or_404(Monitoring, id=group_id)

    filter_date = request.GET.get('date')
    filter_shift = request.GET.get('shift', 'all')

    if line_id == 'total':
        return get_group_performance(request, group_id)

    line = get_object_or_404(Line, id=line_id)

    if filter_date:
        try:
            filter_date = datetime.strptime(filter_date, '%Y-%m-%d').date()
        except ValueError:
            filter_date = timezone.localdate()
    else:
        filter_date = timezone.localdate()

    if filter_shift == 'AM':
        hours_range = range(7, 19)
    elif filter_shift == 'PM':
        hours_range = list(range(18, 24)) + list(range(0, 8))
    else:
        hours_range = list(range(7, 24))

    labels = [f"{hour % 24:02d}:00" for hour in hours_range]
    actual_data = [0] * len(hours_range)

    products = Product.objects.filter(monitoring=monitoring, line=line)

    schedules = ProductionSchedulePlan.objects.filter(
        monitoring=monitoring,
        date_planned=filter_date,
        product_number__in=products
    )

    if filter_shift != 'all':
        schedules = schedules.filter(shift=filter_shift)

    total_target_output = schedules.aggregate(total=Sum('product_number__qty_per_hour'))['total'] or 0
    target_data = [total_target_output] * len(hours_range)

    outputs_query = ProductionOutput.objects.filter(
        monitoring=monitoring,
        schedule_plan__in=schedules,
        line=line
    )

    if filter_shift == 'PM':
        next_day = filter_date + timedelta(days=1)
        filter_day_start = timezone.make_aware(datetime.combine(filter_date, time(hour=18)))
        filter_day_end = timezone.make_aware(datetime.combine(filter_date, time(hour=23, minute=59, second=59)))
        next_day_start = timezone.make_aware(datetime.combine(next_day, time(hour=0)))
        next_day_end = timezone.make_aware(datetime.combine(next_day, time(hour=7, minute=59, second=59)))
        outputs = outputs_query.filter(
            Q(recorded_at__range=[filter_day_start, filter_day_end]) |
            Q(recorded_at__range=[next_day_start, next_day_end])
        )
    else:
        filter_day_start = timezone.make_aware(datetime.combine(filter_date, time(hour=0)))
        filter_day_end = timezone.make_aware(datetime.combine(filter_date, time(hour=23, minute=59, second=59)))
        outputs = outputs_query.filter(recorded_at__range=[filter_day_start, filter_day_end])

        if filter_shift == 'AM':
            am_start = timezone.make_aware(datetime.combine(filter_date, time(hour=7)))
            am_end = timezone.make_aware(datetime.combine(filter_date, time(hour=18, minute=59, second=59)))
            outputs = outputs.filter(recorded_at__range=[am_start, am_end])

    for idx, hour in enumerate(hours_range):
        hour_of_day = hour % 24
        hour_date = filter_date + timedelta(days=1) if filter_shift == 'PM' and hour_of_day < 8 else filter_date

        hour_start = timezone.make_aware(datetime.combine(hour_date, time(hour=hour_of_day, minute=0)))
        hour_end = timezone.make_aware(datetime.combine(hour_date, time(hour=hour_of_day, minute=59, second=59)))

        hour_outputs = outputs.filter(recorded_at__range=[hour_start, hour_end])
        hour_total = hour_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0
        actual_data[idx] = hour_total

    return JsonResponse({
        'labels': labels,
        'actual': actual_data,
        'target': target_data
    })

# GROUP DASHBOARD
@login_required(login_url="user-login")
def group_dashboard(request, group_id):
    monitoring = get_object_or_404(Monitoring, id=group_id)

    if request.user.monitoring_supervisor or request.user.monitoring_manager:
        if not (
            SupervisorToMonitor.objects.filter(monitoring=monitoring, supervisor=request.user).exists() or
            monitoring.created_by == request.user
        ):
            messages.error(request, "You do not have permission to view this dashboard")
            return redirect('supervisor_monitoring')

    context = {
        'monitoring': monitoring,
        'today_date': timezone.now().date().isoformat()
    }

    return render(request, 'monitoring/group-dashboard.html', context)

@login_required(login_url="user-login")
def group_dashboard_data(request, group_id):
    try:
        monitoring = get_object_or_404(Monitoring, id=group_id)

        if not (monitoring.created_by == request.user or
                SupervisorToMonitor.objects.filter(monitoring=monitoring, supervisor=request.user).exists()):
            return JsonResponse({'error': 'Permission denied'}, status=403)

        date_filter = request.GET.get('dateFilter', 'today')
        specific_date = request.GET.get('specificDate')
        shift_filter = request.GET.get('shiftFilter', 'all')

        today = timezone.localdate()
        if date_filter == 'today':
            start_date = today
            end_date = today
        elif date_filter == 'week':
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
        elif date_filter == 'month':
            start_date = today.replace(day=1)
            next_month = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            end_date = next_month - timedelta(days=1)
        elif date_filter == 'year':
            start_date = today.replace(month=1, day=1)
            end_date = today.replace(month=12, day=31)
        elif date_filter == 'customDate' and specific_date:
            try:
                specific_date = datetime.strptime(specific_date, '%Y-%m-%d').date()
                start_date = specific_date
                end_date = specific_date
            except ValueError:
                start_date = end_date = today
        else:
            start_date = end_date = today

        lines = LineToMonitor.objects.filter(monitoring=monitoring).values_list('line', flat=True)

        schedule_filter = Q(monitoring=monitoring, date_planned__range=[start_date, end_date])
        output_filter = Q(monitoring=monitoring, recorded_at__date__range=[start_date, end_date])

        if shift_filter != 'all':
            schedule_filter &= Q(shift=shift_filter.upper())
            output_filter &= Q(shift=shift_filter.upper())

        schedules = ProductionSchedulePlan.objects.filter(schedule_filter).select_related('product_number__line')
        outputs = ProductionOutput.objects.filter(output_filter)

        total_schedules = schedules.count()
        total_schedules_target = ProductionSchedulePlan.objects.filter(monitoring=monitoring).count()
        total_planned = schedules.aggregate(total=Sum('planned_qty'))['total'] or 0
        total_produced = outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

        not_produced = total_planned - total_produced
        not_met_target_percentage = round((not_produced / total_planned) * 100) if total_planned > 0 else 0

        production_progress = round((total_produced / total_planned) * 100) if total_planned > 0 else 0
        production_progress_target = 100

        active_lines = schedules.values('product_number__line').distinct().count()
        total_lines = lines.count()

        output_per_day = []
        efficiency_data = []
        current_date = start_date
        while current_date <= end_date:
            daily_schedules = schedules.filter(date_planned=current_date)
            daily_outputs = outputs.filter(recorded_at__date=current_date)

            daily_planned = daily_schedules.aggregate(total=Sum('planned_qty'))['total'] or 0
            daily_produced = daily_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

            output_per_day.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'quantity': daily_produced
            })

            efficiency_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'efficiency': round((daily_produced / daily_planned) * 100) if daily_planned > 0 else 0
            })

            current_date += timedelta(days=1)

        output_by_line = []
        distinct_lines = Line.objects.filter(id__in=lines)
        for line in distinct_lines:
            quantity = outputs.filter(line=line).aggregate(total=Sum('quantity_produced'))['total'] or 0
            output_by_line.append({'line': line.line_name, 'quantity': quantity})
        output_by_line = sorted(output_by_line, key=lambda x: x['quantity'], reverse=True)

        shift_output = []
        am_start = time(7, 0)
        am_end = time(18, 0)

        am_output = outputs.filter(recorded_at__time__gte=am_start, recorded_at__time__lt=am_end)
        pm_output = outputs.exclude(id__in=am_output.values_list('id', flat=True))

        shift_output = [
            {'shift': 'AM Shift', 'quantity': am_output.aggregate(total=Sum('quantity_produced'))['total'] or 0},
            {'shift': 'PM Shift', 'quantity': pm_output.aggregate(total=Sum('quantity_produced'))['total'] or 0}
        ]

        status_counts = schedules.values('status').annotate(count=Count('id'))
        status_distribution = [{'status': item['status'], 'count': item['count']} for item in status_counts]

        schedule_list = []
        for schedule in schedules[:100]:
            produced_qty = schedule.outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0
            progress = (produced_qty / schedule.planned_qty) * 100 if schedule.planned_qty > 0 else 0
            schedule_list.append({
                'id': schedule.id,
                'date': schedule.date_planned.strftime('%Y-%m-%d'),
                'product': schedule.product_number.product_name,
                'line': schedule.product_number.line.line_name,
                'shift': schedule.shift,
                'plannedQty': schedule.planned_qty,
                'producedQty': produced_qty,
                'progress': progress,
                'status': schedule.status
            })
        schedule_list = sorted(schedule_list, key=lambda x: x['date'], reverse=True)

        data = {
            'totalSchedules': total_schedules,
            'totalSchedulesTarget': total_schedules_target,
            'totalPlanned': total_planned,
            'totalProduced': total_produced,
            'productionProgress': production_progress,
            'productionProgressTarget': production_progress_target,
            'activeLines': active_lines,
            'totalLines': total_lines,
            'notMetTarget': not_met_target_percentage,
            'outputPerDay': output_per_day,
            'efficiencyData': efficiency_data,
            'outputByLine': output_by_line,
            'shiftOutput': shift_output,
            'statusDistribution': status_distribution,
            'schedules': schedule_list
        }

        return JsonResponse(data)

    except Exception as e:
        import traceback
        return JsonResponse({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


# LINE DASHBOARD
@login_required(login_url="user-login")
def production_dashboard(request):
    now = localtime()
    today = now.date()
    current_hour = now.hour

    current_shift = 'AM' if 7 <= current_hour < 19 else 'PM'

    user_line = request.user.line

    schedule = ProductionSchedulePlan.objects.filter(
        product_number__line=user_line,
        date_planned=today,
        shift=current_shift,
        status="Planned",
        balance__gt=0
    ).first()

    if not schedule:
        schedule = ProductionSchedulePlan.objects.filter(
            product_number__line=user_line,
            date_planned=today,
            shift=current_shift,
            status="Change Load",
            balance__gt=0
        ).first()

    if not schedule:
        schedule = ProductionSchedulePlan.objects.filter(
            product_number__line=user_line,
            date_planned=today,
            shift=current_shift,
            status="Backlog",
            balance__gt=0
        ).first()

    if not schedule:
        context = {
            'schedule_exists': False,
            'page_title': 'Production Monitoring',
            'subtitle': 'No scheduled production for this shift',
            'active_nav': 'monitoring',
            'form': OutputForm()
        }
        return render(request, 'monitoring/line-dashboard.html', context)

    # Handle form submission
    if request.method == 'POST':
        form = OutputForm(request.POST)
        if form.is_valid():
            operator = form.cleaned_data['operator']
            quantity = form.cleaned_data['quantity']

            # Get or create production output
            production_output, created = ProductionOutput.objects.get_or_create(
                monitoring=schedule.monitoring,
                schedule_plan=schedule,
                line=user_line,
                shift=current_shift,
                defaults={
                    'inspector': operator,
                    'quantity_produced': 0
                }
            )

            # Update operator name if provided
            if operator and production_output.inspector != operator:
                production_output.inspector = operator

            # Update quantity produced
            production_output.quantity_produced += quantity
            production_output.save()

            # Create output log
            output_log = OutputLog.objects.create(
                outputlog=production_output,
                output=quantity,
                time_recorded=timezone.now()
            )

            messages.success(request, 'Production output added successfully!')

            # Save the operator name to session for prefill
            request.session['last_operator'] = operator

            return redirect('line_dashboard')
    else:
        # For GET requests, initialize with empty form
        form = OutputForm()

        # Prefill operator name if available in session
        if 'last_operator' in request.session:
            form.initial['operator'] = request.session['last_operator']

    # Get production outputs for this schedule
    outputs = ProductionOutput.objects.filter(schedule_plan=schedule)

    # Calculate total produced
    total_produced = outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0

    # Calculate completion percentage
    if schedule.planned_qty > 0:
        completion_percentage = (total_produced / schedule.planned_qty) * 100
    else:
        completion_percentage = 0

    # Get the hourly target from the product
    target_per_hour = schedule.product_number.qty_per_hour

    # Get output logs for chart
    output_logs = OutputLog.objects.filter(
        outputlog__schedule_plan=schedule
    ).order_by('-time_recorded')

    # Prepare logs for display with variance calculation
    display_logs = []
    running_total = 0

    for log in output_logs:
        local_time = localtime(log.time_recorded)
        variance = log.output - target_per_hour

        display_logs.append({
            'time': local_time,
            'operator': log.outputlog.inspector,
            'line': log.outputlog.line.line_name,
            'output': log.output,
            'target': target_per_hour,
            'variance': variance,
            'status': log.status if log.status else ("Met" if variance >= 0 else "Not Met")
        })

    # Format data for chart
    hourly_data = []
    hours_set = set()

    for log in output_logs:
        local_time = localtime(log.time_recorded)
        hour = local_time.strftime('%H:00')
        hours_set.add(hour)
        hourly_data.append({
            'hour': hour,
            'output': log.output
        })

    # Sort hours chronologically
    hours = sorted(list(hours_set))

    # Create hourly outputs for chart by summing outputs for each hour
    hourly_outputs = {}
    for hour in hours:
        hourly_outputs[hour] = sum(log['output'] for log in hourly_data if log['hour'] == hour)

    # Create chart data
    chart_data = {
        'labels': hours,
        'datasets': [
            {
                'label': 'Output',
                'data': [hourly_outputs.get(hour, 0) for hour in hours]
            },
            {
                'label': 'Target',
                'data': [target_per_hour for _ in hours]
            }
        ]
    }

    context = {
        'schedule_exists': True,
        'page_title': 'Production Monitoring',
        'subtitle': f'Line: {user_line.line_name} - {current_shift} Shift',
        'active_nav': 'monitoring',
        'schedule': schedule,
        'product_name': schedule.product_number.product_name,
        'line_name': user_line.line_name,
        'planned_qty': schedule.planned_qty,
        'total_produced': total_produced,
        'completion_percentage': completion_percentage,
        'balance': schedule.balance,
        'target_per_hour': target_per_hour,
        'logs': display_logs,
        'chart_data': json.dumps(chart_data),
        'form': form
    }

    # Check if AJAX request for chart refresh
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'status': 'success',
            'total_produced': total_produced,
            'completion_percentage': completion_percentage,
            'balance': schedule.balance,
            'chart_data': chart_data
        })

    return render(request, 'monitoring/line-dashboard.html', context)