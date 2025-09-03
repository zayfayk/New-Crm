from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.hashers import make_password

from .models import User, Profile



# Register your models here.
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ()}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Custom Fields", {"fields": ()}),
    )

    def save_model(self, request, obj, form, change):
        if form.cleaned_data.get('password') and not change:
            obj.password = make_password(form.cleaned_data['password'])
        super().save_model(request, obj, form, change)
        
admin.site.register(Profile)