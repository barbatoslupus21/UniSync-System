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
    users_list = Users.objects.all()

    users_count = users_list.count()
    admin_count = users_list.filter(is_admin=True).count()
    active_count = users_list.filter(is_active=True).count()
    inactive_count = users_list.filter(is_active=False).count()
    
    lines = Line.objects.all().order_by('line_name')

    approvers = Users.objects.filter(position__in=['Supervisor', 'Manager'], is_active=True).all()

    paginator = Paginator(users_list, 10)
    page = request.GET.get('page', 1)
    users = paginator.get_page(page)
    
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
    }  
    return render(request, 'settings/account-register.html', context)

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
            line_id = request.POST.get('line')
            is_admin = request.POST.get('is_admin') == 'on'

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
                line_id=line_id,
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
            
            user.set_password(password)
            user.save()
            
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
            user.line_id = request.POST.get('line')
            user.is_admin = request.POST.get('is_admin') == 'on'

            avatar_filename = request.POST.get('avatar')
            if avatar_filename:
                user.avatar = avatar_filename

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
            
            user.save()
        
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
        
        user_data = {
            'id': user.id,
            'id_number': user.id_number,
            'name': user.name,
            'position': user.position,
            'username': user.username,
            'line': {'id': user.line.id, 'line_name': user.line.line_name} if user.line else None,
            'avatar': user.avatar.url,
            'is_admin': user.is_admin,
            'is_active': user.is_active,
            'job_order_user': user.job_order_user,
            'job_order_role': job_order_role,
            'manhours_user': user.manhours_user,
            'manhours_role': manhours_role,
            'monitoring_user': user.monitoring_user,
            'monitoring_role': monitoring_role,
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
    approvers = Users.objects.filter(
        position__in=['Supervisor', 'Manager'],
        is_active=True
    ).values('id', 'name', 'position')
    approvers_list = list(approvers)
    return JsonResponse(approvers_list, safe=False)