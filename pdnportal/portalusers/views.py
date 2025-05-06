from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from .models import UserApprovers, Users

@login_required(login_url="user-login")
def homepage(request):
    if request.user.is_authenticated:
        return redirect('overview')
    return render(request, 'portalusers/homepage.html')

def userlogin(request):
    if request.user.is_authenticated:
        return redirect('overview')

    context = {}

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        try:
            user = Users.objects.get(username=username)
        except Users.DoesNotExist:
            messages.error(request, 'User does not exist.')
            context['login_modal'] = True

        userLogin = authenticate(request, username=username, password=password)

        if userLogin is not None:
            login(request, userLogin)
            return redirect('overview')
        else:
            messages.error(request, "Login credentials are incorrect.")
            context['login_modal'] = True

    return render(request, 'portalusers/homepage.html', context)


def userlogout(request):
    logout(request)
    return redirect('homepage')