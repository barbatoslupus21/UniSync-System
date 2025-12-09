from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required, user_passes_test
from django.core.paginator import Paginator
from django.contrib import messages
from portalusers.models import Users, UserApprovers
from settings.models import Line
from django.views.decorators.http import require_http_methods

def is_admin(user):
    return user.is_admin

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def user_management(request):
    users_list = Users.objects.prefetch_related('line').all().order_by('name')

    users_count = users_list.count()
    admin_count = users_list.filter(is_admin=True).count()
    active_count = users_list.filter(is_active=True).count()
    inactive_count = users_list.filter(is_active=False).count()

    lines = Line.objects.all().order_by('line_name')

    # Get potential approvers - any active user can be an approver
    approvers = Users.objects.filter(is_active=True).order_by('name').all()

    paginator = Paginator(users_list, 10)
    page = request.GET.get('page', 1)
    users = paginator.get_page(page)

    # Generate avatar options
    avatars = [{'filename': f'avatar{i}.png', 'url': f'/static/images/profile/avatar{i}.png'} for i in range(1, 10)]

    context = {
        'users': users,
        'users_count': users_count,
        'admin_count': admin_count,
        'active_count': active_count,
        'inactive_count': inactive_count,
        'lines': lines,
        'potential_approvers': approvers,
        'position_choices': Users.POSITION,
        'module_choices': UserApprovers.MODULES,
        'role_choices': UserApprovers.ROLES,
        'avatars': avatars,
    }
    return render(request, 'settings/account-register.html', context)

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def search_users(request):
    if request.method == 'GET':
        search_query = request.GET.get('q', '').strip()
        permission_filter = request.GET.get('filter', 'all')
        page_number = request.GET.get('page', 1)
        
        # Start with all users
        users_list = Users.objects.prefetch_related('line').all()
        
        # Apply search filter if query exists
        if search_query:
            from django.db.models import Q
            users_list = users_list.filter(
                Q(name__icontains=search_query) |
                Q(id_number__icontains=search_query) |
                Q(username__icontains=search_query) |
                Q(position__icontains=search_query) |
                Q(line__line_name__icontains=search_query)
            ).distinct()
        
        # Apply permission filter
        if permission_filter != 'all':
            if permission_filter == 'admin':
                users_list = users_list.filter(is_admin=True)
            elif permission_filter == 'job_order':
                users_list = users_list.filter(job_order_user=True)
            elif permission_filter == 'manhours':
                users_list = users_list.filter(manhours_user=True)
            elif permission_filter == 'monitoring':
                users_list = users_list.filter(monitoring_user=True)
            elif permission_filter == 'dcf':
                users_list = users_list.filter(dcf_user=True)
            elif permission_filter == 'ecis':
                users_list = users_list.filter(ecis_user=True)
        
        # Paginate results
        paginator = Paginator(users_list, 10)
        users = paginator.get_page(page_number)
        
        # Prepare user data for JSON response
        users_data = []
        for user in users:
            permissions = []
            if user.is_admin:
                permissions.append({'type': 'admin', 'label': 'Admin'})
            if user.job_order_user:
                permissions.append({'type': 'job-order', 'label': 'Job Order'})
            if user.manhours_user:
                permissions.append({'type': 'manhours', 'label': 'Manhours'})
            if user.monitoring_user:
                permissions.append({'type': 'monitoring', 'label': 'Monitoring'})
            if user.dcf_user:
                permissions.append({'type': 'dcf', 'label': 'DCF'})
            if user.ecis_user:
                permissions.append({'type': 'ecis', 'label': 'ECIS'})
            if user.quality_control_user:
                permissions.append({'type': 'quality-control', 'label': 'Quality Control'})
            if user.stock_declaration_user:
                permissions.append({'type': 'stock-declaration', 'label': 'Stock Declaration'})
            if user.overtime_user:
                permissions.append({'type': 'overtime', 'label': 'Overtime'})
            if user.docunotification_user:
                permissions.append({'type': 'docunotification', 'label': 'DocuWatcher'})
            if user.meetingscheduler_user:
                permissions.append({'type': 'meetingscheduler', 'label': 'Meeting Scheduler'})
            
            # Format lines as comma-separated string for display
            lines_list = user.line.all()
            line_name = ', '.join([line.line_name for line in lines_list]) if lines_list else 'undefined'
            
            users_data.append({
                'id': user.id,
                'avatar_url': user.avatar.url if user.avatar else '',
                'id_number': user.id_number,
                'name': user.name,
                'position': user.position,
                'line_name': line_name,
                'lines': [{'id': line.id, 'name': line.line_name} for line in lines_list],
                'permissions': permissions,
                'is_active': user.is_active,
            })
        
        # Return JSON response
        return JsonResponse({
            'success': True,
            'users': users_data,
            'pagination': {
                'current_page': users.number,
                'total_pages': paginator.num_pages,
                'has_previous': users.has_previous(),
                'has_next': users.has_next(),
                'previous_page': users.previous_page_number() if users.has_previous() else None,
                'next_page': users.next_page_number() if users.has_next() else None,
                'start_index': users.start_index(),
                'end_index': users.end_index(),
                'total_count': paginator.count,
            }
        })
    
    return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=400)

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def create_user(request):
    if request.method == 'POST':
        try:
            user_id = request.POST.get('user_id')
            if user_id:
                return edit_user(request, user_id)

            id_number = request.POST.get('id_number')
            name = request.POST.get('name')
            position = request.POST.get('position')
            username = request.POST.get('username')
            password = request.POST.get('password')
            line_ids = request.POST.getlist('line')
            is_admin = request.POST.get('is_admin') == 'on'
            # Default line selected in Add User modal uses name="user_default_line"
            default_line = request.POST.get('user_default_line') or request.POST.get('default_line')

            avatar_filename = request.POST.get('avatar')
            avatar_path = f'profile/{avatar_filename}'

            if Users.objects.filter(username=username).exists():
                messages.error(request, 'Username already exists')
                return redirect('account_settings')

            user = Users(
                id_number=id_number,
                name=name,
                position=position,
                username=username,
                is_admin=is_admin,
                avatar=avatar_path
            )

            # Job Order permissions
            job_order_user = request.POST.get('job_order_user') == 'on'
            user.job_order_user = job_order_user

            if job_order_user:
                job_order_role = request.POST.get('job_order_role')
                if job_order_role == 'requestor':
                    user.job_order_requestor = True
                elif job_order_role == 'approver':
                    user.job_order_approver = True
                elif job_order_role == 'checker':
                    user.job_order_checker = True
                elif job_order_role == 'maintenance':
                    user.job_order_maintenance = True
                elif job_order_role == 'facilitator':
                    user.job_order_facilitator = True

            # Manhours permissions
            manhours_user = request.POST.get('manhours_user') == 'on'
            user.manhours_user = manhours_user

            if manhours_user:
                manhours_role = request.POST.get('manhours_role')
                if manhours_role == 'staff':
                    user.manhours_staff = True
                elif manhours_role == 'supervisor':
                    user.manhours_supervisor = True

            # Monitoring permissions
            monitoring_user = request.POST.get('monitoring_user') == 'on'
            user.monitoring_user = monitoring_user

            if monitoring_user:
                monitoring_role = request.POST.get('monitoring_role')
                if monitoring_role == 'staff':
                    user.monitoring_staff = True
                elif monitoring_role == 'supervisor':
                    user.monitoring_supervisor = True
                elif monitoring_role == 'manager':
                    user.monitoring_manager = True
                elif monitoring_role == 'qad':
                    user.monitoring_qad = True
                elif monitoring_role == 'sales':
                    user.monitoring_sales = True

            # DCF permissions
            dcf_user = request.POST.get('dcf_user') == 'on'
            user.dcf_user = dcf_user

            if dcf_user:
                dcf_role = request.POST.get('dcf_role')
                if dcf_role == 'requestor':
                    user.dcf_requestor = True
                elif dcf_role == 'approver':
                    user.dcf_approver = True

            # ECIS permissions
            ecis_user = request.POST.get('ecis_user') == 'on'
            user.ecis_user = ecis_user

            if ecis_user:
                ecis_role = request.POST.get('ecis_role')
                if ecis_role == 'requestor':
                    user.ecis_requestor = True
                elif ecis_role == 'facilitator':
                    user.ecis_facilitator = True

            # Quality Control permissions
            quality_control_user = request.POST.get('quality_control_user') == 'on'
            user.quality_control_user = quality_control_user

            if quality_control_user:
                quality_control_role = request.POST.get('quality_control_role')
                if quality_control_role == 'warehouse':
                    user.quality_control_warehouse = True
                elif quality_control_role == 'engineering':
                    user.quality_control_engineering = True
                elif quality_control_role == 'production':
                    user.quality_control_production = True
                elif quality_control_role == 'qa':
                    user.quality_control_qa = True

            # Stock Declaration permissions
            stock_declaration_user = request.POST.get('stock_declaration_user') == 'on'
            user.stock_declaration_user = stock_declaration_user

            if stock_declaration_user:
                stock_declaration_role = request.POST.get('stock_declaration_role')
                if stock_declaration_role == 'production':
                    user.stock_declaration_production = True
                elif stock_declaration_role == 'warehouse':
                    user.stock_declaration_warehouse = True
                elif stock_declaration_role == 'purchasing':
                    user.stock_declaration_purchasing = True

            # Overtime permissions
            overtime_user = request.POST.get('overtime_user') == 'on'
            user.overtime_user = overtime_user

            if overtime_user:
                overtime_role = request.POST.get('overtime_role')
                if overtime_role == 'requestor':
                    user.overtime_requestor = True
                elif overtime_role == 'facilitator':
                    user.overtime_facilitator = True
                elif overtime_role == 'shuttle_admin':
                    user.overtime_shuttle_admin = True

            # Document Notification permissions
            docunotification_user = request.POST.get('docunotification_user') == 'on'
            user.docunotification_user = docunotification_user

            if docunotification_user:
                docunotification_role = request.POST.get('docunotification_role')
                if docunotification_role == 'user':
                    user.docunotification_requestor = True
                elif docunotification_role == 'admin':
                    user.docunotification_admin = True

            # Meeting Scheduler permissions
            meetingscheduler_user = request.POST.get('meetingscheduler_user') == 'on'
            user.meetingscheduler_user = meetingscheduler_user

            if meetingscheduler_user:
                meetingscheduler_role = request.POST.get('meetingscheduler_role')
                if meetingscheduler_role == 'user':
                    user.meetingscheduler = True
                elif meetingscheduler_role == 'admin':
                    user.meetingadmin = True

            user.set_password(password)
            user.save()

            # Set many-to-many lines
            user.line.set(line_ids)

            # Set default_line FK if provided
            try:
                if default_line:
                    from settings.models import Line as LineModel
                    try:
                        line_obj = LineModel.objects.get(id=default_line)
                        user.default_line = line_obj
                    except LineModel.DoesNotExist:
                        # If line id not found, ignore and keep default_line as None
                        user.default_line = None
                else:
                    user.default_line = None
                user.save()
            except Exception:
                # Non-fatal: ensure user exists and continue
                pass

            approver_modules = request.POST.getlist('approver_module[]')
            approver_roles = request.POST.getlist('approver_role[]')
            approver_users = request.POST.getlist('approver_user[]')

            for i in range(len(approver_modules)):
                if i < len(approver_roles) and i < len(approver_users) and approver_modules[i] and approver_roles[i] and approver_users[i]:
                    UserApprovers.objects.create(
                        user=user,
                        module=approver_modules[i],
                        approver_role=approver_roles[i],
                        approver_id=approver_users[i]
                    )

            messages.success(request, 'User created successfully')
            return redirect('account_settings')

        except Exception as e:
            messages.error(request, f'Error creating user: {str(e)}')
            return redirect('account_settings')

    return redirect('account_settings')

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def edit_user(request, user_id):
    user = get_object_or_404(Users, id=user_id)

    if request.method == 'POST':
        try:
            user.id_number = request.POST.get('id_number')
            user.name = request.POST.get('name')
            user.position = request.POST.get('position')

            new_username = request.POST.get('username')
            if new_username != user.username and Users.objects.filter(username=new_username).exists():
                messages.error(request, 'Username already exists')
                return redirect('account_settings')

            user.username = new_username
            line_ids = request.POST.getlist('line')
            user.is_admin = request.POST.get('is_admin') == 'on'

            avatar_filename = request.POST.get('avatar')
            if avatar_filename:
                # Make sure we have the correct path format
                if not avatar_filename.startswith('profile/'):
                    avatar_path = f'profile/{avatar_filename}'
                else:
                    avatar_path = avatar_filename
                user.avatar = avatar_path

            password = request.POST.get('password')
            if password:
                user.set_password(password)

            user.job_order_user = False
            user.job_order_requestor = False
            user.job_order_approver = False
            user.job_order_checker = False
            user.job_order_maintenance = False
            user.job_order_facilitator = False

            user.manhours_user = False
            user.manhours_staff = False
            user.manhours_supervisor = False

            user.monitoring_user = False
            user.monitoring_staff = False
            user.monitoring_supervisor = False
            user.monitoring_manager = False
            user.monitoring_qad = False
            user.monitoring_sales = False

            # Reset DCF permissions
            user.dcf_user = False
            user.dcf_requestor = False
            user.dcf_approver = False

            # Reset ECIS permissions
            user.ecis_user = False
            user.ecis_requestor = False
            user.ecis_facilitator = False

            # Reset Quality Control permissions
            user.quality_control_user = False
            user.quality_control_warehouse = False
            user.quality_control_engineering = False
            user.quality_control_production = False
            user.quality_control_qa = False

            # Reset Stock Declaration permissions
            user.stock_declaration_user = False
            user.stock_declaration_production = False
            user.stock_declaration_warehouse = False
            user.stock_declaration_purchasing = False

            job_order_user = request.POST.get('job_order_user') == 'on'
            user.job_order_user = job_order_user

            if job_order_user:
                job_order_role = request.POST.get('job_order_role')
                if job_order_role == 'requestor':
                    user.job_order_requestor = True
                elif job_order_role == 'approver':
                    user.job_order_approver = True
                elif job_order_role == 'checker':
                    user.job_order_checker = True
                elif job_order_role == 'maintenance':
                    user.job_order_maintenance = True
                elif job_order_role == 'facilitator':
                    user.job_order_facilitator = True

            manhours_user = request.POST.get('manhours_user') == 'on'
            user.manhours_user = manhours_user

            if manhours_user:
                manhours_role = request.POST.get('manhours_role')
                if manhours_role == 'staff':
                    user.manhours_staff = True
                elif manhours_role == 'supervisor':
                    user.manhours_supervisor = True

            monitoring_user = request.POST.get('monitoring_user') == 'on'
            user.monitoring_user = monitoring_user

            if monitoring_user:
                monitoring_role = request.POST.get('monitoring_role')
                if monitoring_role == 'staff':
                    user.monitoring_staff = True
                elif monitoring_role == 'supervisor':
                    user.monitoring_supervisor = True
                elif monitoring_role == 'manager':
                    user.monitoring_manager = True
                elif monitoring_role == 'qad':
                    user.monitoring_qad = True
                elif monitoring_role == 'sales':
                    user.monitoring_sales = True

            # DCF permissions
            dcf_user = request.POST.get('dcf_user') == 'on'
            user.dcf_user = dcf_user

            if dcf_user:
                dcf_role = request.POST.get('dcf_role')
                if dcf_role == 'requestor':
                    user.dcf_requestor = True
                elif dcf_role == 'approver':
                    user.dcf_approver = True

            # ECIS permissions
            ecis_user = request.POST.get('ecis_user') == 'on'
            user.ecis_user = ecis_user

            if ecis_user:
                ecis_role = request.POST.get('ecis_role')
                if ecis_role == 'requestor':
                    user.ecis_requestor = True
                elif ecis_role == 'facilitator':
                    user.ecis_facilitator = True

            # Quality Control permissions
            quality_control_user = request.POST.get('quality_control_user') == 'on'
            user.quality_control_user = quality_control_user

            if quality_control_user:
                quality_control_role = request.POST.get('quality_control_role')
                if quality_control_role == 'warehouse':
                    user.quality_control_warehouse = True
                elif quality_control_role == 'engineering':
                    user.quality_control_engineering = True
                elif quality_control_role == 'production':
                    user.quality_control_production = True
                elif quality_control_role == 'qa':
                    user.quality_control_qa = True

            # Stock Declaration permissions
            stock_declaration_user = request.POST.get('stock_declaration_user') == 'on'
            user.stock_declaration_user = stock_declaration_user

            if stock_declaration_user:
                stock_declaration_role = request.POST.get('stock_declaration_role')
                if stock_declaration_role == 'production':
                    user.stock_declaration_production = True
                elif stock_declaration_role == 'warehouse':
                    user.stock_declaration_warehouse = True
                elif stock_declaration_role == 'purchasing':
                    user.stock_declaration_purchasing = True

            # Overtime permissions
            overtime_user = request.POST.get('overtime_user') == 'on'
            user.overtime_user = overtime_user
            # Reset roles first
            user.overtime_requestor = False
            user.overtime_facilitator = False
            user.overtime_shuttle_admin = False

            if overtime_user:
                overtime_role = request.POST.get('overtime_role')
                if overtime_role == 'requestor':
                    user.overtime_requestor = True
                elif overtime_role == 'facilitator':
                    user.overtime_facilitator = True
                elif overtime_role == 'shuttle_admin':
                    user.overtime_shuttle_admin = True

            # Document Notification permissions
            docunotification_user = request.POST.get('docunotification_user') == 'on'
            user.docunotification_user = docunotification_user

            if docunotification_user:
                docunotification_role = request.POST.get('docunotification_role')
                if docunotification_role == 'user':
                    user.docunotification_requestor = True
                elif docunotification_role == 'admin':
                    user.docunotification_admin = True

            # Meeting Scheduler permissions
            meetingscheduler_user = request.POST.get('meetingscheduler_user') == 'on'
            user.meetingscheduler_user = meetingscheduler_user
            # Reset roles first
            user.meetingscheduler = False
            user.meetingadmin = False

            if meetingscheduler_user:
                meetingscheduler_role = request.POST.get('meetingscheduler_role')
                if meetingscheduler_role == 'user':
                    user.meetingscheduler = True
                elif meetingscheduler_role == 'admin':
                    user.meetingadmin = True

            user.save()

            # Set many-to-many lines
            user.line.set(line_ids)

            # Save default_line from edit form (name="default_line")
            try:
                default_line = request.POST.get('default_line') or request.POST.get('user_default_line')
                if default_line:
                    from settings.models import Line as LineModel
                    try:
                        line_obj = LineModel.objects.get(id=default_line)
                        user.default_line = line_obj
                    except LineModel.DoesNotExist:
                        user.default_line = None
                else:
                    user.default_line = None
                user.save()
            except Exception:
                # Non-fatal; continue
                pass

            UserApprovers.objects.filter(user=user).delete()

            approver_modules = request.POST.getlist('approver_module[]')
            approver_roles = request.POST.getlist('approver_role[]')
            approver_users = request.POST.getlist('approver_user[]')

            for i in range(len(approver_modules)):
                if i < len(approver_roles) and i < len(approver_users) and approver_modules[i] and approver_roles[i] and approver_users[i]:
                    UserApprovers.objects.create(
                        user=user,
                        module=approver_modules[i],
                        approver_role=approver_roles[i],
                        approver_id=approver_users[i]
                    )

            messages.success(request, 'User updated successfully')
            return redirect('account_settings')

        except Exception as e:
            messages.error(request, f'Error updating user: {str(e)}')
            return redirect('account_settings')

    return redirect('account_settings')

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def get_user_data(request, user_id):
    try:
        user = get_object_or_404(Users, id=user_id)

        approvers = UserApprovers.objects.filter(user=user)
        approvers_data = []

        for approver in approvers:
            approvers_data.append({
                'id': approver.id,
                'module': approver.module,
                'approver_role': approver.approver_role,
                'approver_id': approver.approver.id,
                'approver_name': f"{approver.approver.name} ({approver.approver.position})"
            })

        # Determine job order role
        job_order_role = None
        if user.job_order_requestor:
            job_order_role = 'requestor'
        elif user.job_order_approver:
            job_order_role = 'approver'
        elif user.job_order_checker:
            job_order_role = 'checker'
        elif user.job_order_maintenance:
            job_order_role = 'maintenance'
        elif user.job_order_facilitator:
            job_order_role = 'facilitator'

        # Determine manhours role
        manhours_role = None
        if user.manhours_staff:
            manhours_role = 'staff'
        elif user.manhours_supervisor:
            manhours_role = 'supervisor'

        # Determine monitoring role
        monitoring_role = None
        if user.monitoring_staff:
            monitoring_role = 'staff'
        elif user.monitoring_supervisor:
            monitoring_role = 'supervisor'
        elif user.monitoring_manager:
            monitoring_role = 'manager'
        elif user.monitoring_qad:
            monitoring_role = 'qad'
        elif user.monitoring_sales:
            monitoring_role = 'sales'

        # Determine DCF role
        dcf_role = None
        if user.dcf_requestor:
            dcf_role = 'requestor'
        elif user.dcf_approver:
            dcf_role = 'approver'

        # Determine ECIS role
        ecis_role = None
        if user.ecis_requestor:
            ecis_role = 'requestor'
        elif user.ecis_facilitator:
            ecis_role = 'facilitator'

        # Determine Quality Control role
        quality_control_role = None
        if user.quality_control_warehouse:
            quality_control_role = 'warehouse'
        elif user.quality_control_engineering:
            quality_control_role = 'engineering'
        elif user.quality_control_production:
            quality_control_role = 'production'
        elif user.quality_control_qa:
            quality_control_role = 'qa'

        # Determine Stock Declaration role
        stock_declaration_role = None
        if user.stock_declaration_production:
            stock_declaration_role = 'production'
        elif user.stock_declaration_warehouse:
            stock_declaration_role = 'warehouse'
        elif user.stock_declaration_purchasing:
            stock_declaration_role = 'purchasing'

        # Determine Overtime role
        overtime_role = None
        if user.overtime_requestor:
            overtime_role = 'requestor'
        elif user.overtime_facilitator:
            overtime_role = 'facilitator'
        elif user.overtime_shuttle_admin:
            overtime_role = 'shuttle_admin'

        # Determine Document Notification role
        docunotification_role = None
        if user.docunotification_requestor:
            docunotification_role = 'user'
        elif user.docunotification_admin:
            docunotification_role = 'admin'

        # Serialize ManyToMany lines field
        lines_data = [{'id': line.id, 'line_name': line.line_name} for line in user.line.all()]
        # Include default_line information if set on the user
        default_line_data = None
        if user.default_line:
            default_line_data = {
                'id': user.default_line.id,
                'line_name': user.default_line.line_name
            }
        
        user_data = {
            'id': user.id,
            'id_number': user.id_number,
            'name': user.name,
            'position': user.position,
            'username': user.username,
            'lines': lines_data,
            'avatar': user.avatar.url,
            'is_admin': user.is_admin,
            'is_active': user.is_active,
            'job_order_user': user.job_order_user,
            'job_order_role': job_order_role,
            'manhours_user': user.manhours_user,
            'manhours_role': manhours_role,
            'monitoring_user': user.monitoring_user,
            'monitoring_role': monitoring_role,
            'dcf_user': user.dcf_user,
            'dcf_role': dcf_role,
            'dcf_requestor': user.dcf_requestor,
            'dcf_approver': user.dcf_approver,
            'ecis_user': user.ecis_user,
            'ecis_role': ecis_role,
            'ecis_requestor': user.ecis_requestor,
            'ecis_facilitator': user.ecis_facilitator,
            'quality_control_user': user.quality_control_user,
            'quality_control_role': quality_control_role,
            'quality_control_warehouse': user.quality_control_warehouse,
            'quality_control_engineering': user.quality_control_engineering,
            'quality_control_production': user.quality_control_production,
            'quality_control_qa': user.quality_control_qa,
            'stock_declaration_user': user.stock_declaration_user,
            'stock_declaration_role': stock_declaration_role,
            'stock_declaration_production': user.stock_declaration_production,
            'stock_declaration_warehouse': user.stock_declaration_warehouse,
            'stock_declaration_purchasing': user.stock_declaration_purchasing,
            'overtime_user': user.overtime_user,
            'overtime_role': overtime_role,
            'overtime_requestor': user.overtime_requestor,
            'overtime_facilitator': user.overtime_facilitator,
            'overtime_shuttle_admin': user.overtime_shuttle_admin,
            'docunotification_user': user.docunotification_user,
            'docunotification_role': docunotification_role,
            'docunotification_requestor': user.docunotification_requestor,
            'docunotification_admin': user.docunotification_admin,
            'meetingscheduler_user': user.meetingscheduler_user,
            'meetingscheduler': user.meetingscheduler,
            'meetingadmin': user.meetingadmin,
            'default_line': default_line_data,
            'default_line_id': default_line_data['id'] if default_line_data else None,
            'approvers': approvers_data
        }

        return JsonResponse({
            'status': 'success',
            'user': user_data
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error fetching user data: {str(e)}'
        })

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def delete_user(request, user_id):
    if request.method == 'POST':
        try:
            user = get_object_or_404(Users, id=user_id)

            if request.user.id == user.id:
                messages.error(request, 'You cannot delete your own account')
                return redirect('account_settings')

            username = user.username
            user.delete()

            messages.success(request, f'User {username} has been deleted')
            return redirect('account_settings')

        except Exception as e:
            messages.error(request, f'Error deleting user: {str(e)}')

    return redirect('account_settings')

@login_required(login_url="user-login")
@user_passes_test(is_admin)
def toggle_user_status(request, user_id):
    if request.method == 'POST':
        try:
            user = get_object_or_404(Users, id=user_id)

            if request.user.id == user.id and user.is_active:
                messages.error(request, 'You cannot deactivate your own account')
                return redirect('account_settings')

            user.is_active = not user.is_active
            user.save()

            status = 'activated' if user.is_active else 'deactivated'
            messages.success(request, f'User has been {status}')

            return redirect('account_settings')

        except Exception as e:
            messages.error(request, f'Error toggling user status: {str(e)}')

    return redirect('account_settings')

@require_http_methods(["GET"])
def get_potential_approvers(request):
    # Get all active users as potential approvers
    approvers = Users.objects.filter(
        is_active=True
    ).order_by('name').values('id', 'name', 'position')
    approvers_list = list(approvers)
    return JsonResponse(approvers_list, safe=False)