from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required


def overview(request):
    return render(request, 'overview/overview.html')