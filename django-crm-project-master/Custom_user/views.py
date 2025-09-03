from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.hashers import make_password
from .forms import CustomAuthenticationForm, CustomUserCreationForm

def login_view(request):
    form = CustomAuthenticationForm()
    if request.method == "POST":
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect("dashboardView")  # Doğru URL adı ile yönlendir
    return render(request, "Custom_user/login.html", {"form": form})

def logout_view(request):
    logout(request)
    return redirect("login")  # Doğru URL adı ile

def add_user_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.password = make_password(form.cleaned_data['password1'])
            user.save()
            return redirect('dashboardView')
    else:
        form = CustomUserCreationForm()
    return render(request, 'Custom_user/add_user.html', {'form': form})

def profile_view(request):
    # Placeholder implementation for the profile view
    return render(request, 'Custom_user/profile.html')
